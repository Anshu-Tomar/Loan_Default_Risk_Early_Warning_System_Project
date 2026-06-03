const express = require('express');
const Borrower = require('../models/borrower.model');
const Alert = require('../models/alert.model');
const { authenticate, authorize, borrowerDataGuard } = require('../middleware/auth.middleware');
const { scoreBorrower } = require('../services/riskScoring.service');
const { generateAlertExplanation, answerAnalystQuery } = require('../services/llm.service');

const router = express.Router();

// All routes require auth
router.use(authenticate);
router.use(borrowerDataGuard);

// GET /api/borrowers — list borrowers (with role-based filtering)
router.get('/', async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'borrower') {
      query.borrowerId = req.user.borrowerId;
    } else if (req.user.role === 'analyst' && req.assignedBorrowers?.length) {
      query.borrowerId = { $in: req.assignedBorrowers };
    }

    if (req.query.riskCategory) query.riskCategory = req.query.riskCategory;
    if (req.query.borrowerId) query.borrowerId = req.query.borrowerId;

    const borrowers = await Borrower.find(query)
      .select('-recentTransactions -paymentHistory')
      .sort({ riskScore: -1 });

    res.json({ borrowers, total: borrowers.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// BUG FIX #1: /score-all MUST come BEFORE /:borrowerId routes.
// Previously placed after /:borrowerId routes, so Express matched
// "score-all" as a borrowerId param — returning 404 "Borrower not found".
router.post('/score-all', authorize('manager'), async (req, res) => {
  try {
    const borrowers = await Borrower.find();
    const results = [];

    for (const borrower of borrowers) {
      const scoring = scoreBorrower(borrower);
      borrower.riskScore = scoring.riskScore;
      borrower.riskCategory = scoring.riskCategory;
      borrower.riskIndicators = scoring.riskIndicators;
      borrower.lastScoredAt = new Date();
      borrower.riskTrend = [
        ...(borrower.riskTrend || []).slice(-11),
        { date: new Date(), score: scoring.riskScore, category: scoring.riskCategory }
      ];
      await borrower.save();

      if (scoring.riskCategory !== 'Low') {
        const llmExplanation = await generateAlertExplanation(
          borrower, scoring.riskIndicators, scoring.riskCategory, scoring.recommendedAction
        );
        await Alert.findOneAndUpdate(
          { borrowerId: borrower.borrowerId, isAcknowledged: false },
          {
            borrowerName: borrower.name,
            severity: scoring.riskCategory,
            reasons: scoring.riskIndicators,
            recommendedAction: scoring.recommendedAction,
            llmExplanation,
            createdAt: new Date()
          },
          { upsert: true, new: true }
        );
      }
      results.push({ borrowerId: borrower.borrowerId, riskCategory: scoring.riskCategory });
    }

    res.json({ message: `Scored ${results.length} borrowers`, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/borrowers/:borrowerId — single borrower detail
router.get('/:borrowerId', async (req, res) => {
  try {
    const borrower = await Borrower.findOne({ borrowerId: req.params.borrowerId });
    if (!borrower) return res.status(404).json({ message: 'Borrower not found' });

    if (req.user.role === 'borrower' && borrower.borrowerId !== req.user.borrowerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ borrower });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/borrowers/:borrowerId/score — trigger risk scoring
router.post('/:borrowerId/score', authorize('analyst', 'manager'), async (req, res) => {
  try {
    const borrower = await Borrower.findOne({ borrowerId: req.params.borrowerId });
    if (!borrower) return res.status(404).json({ message: 'Borrower not found' });

    const { riskScore, riskCategory, riskIndicators, recommendedAction } = scoreBorrower(borrower);

    borrower.riskScore = riskScore;
    borrower.riskCategory = riskCategory;
    borrower.riskIndicators = riskIndicators;
    borrower.lastScoredAt = new Date();
    borrower.riskTrend = [
      ...(borrower.riskTrend || []).slice(-11),
      { date: new Date(), score: riskScore, category: riskCategory }
    ];
    await borrower.save();

    let alert = null;
    if (riskCategory !== 'Low') {
      const llmExplanation = await generateAlertExplanation(
        borrower, riskIndicators, riskCategory, recommendedAction
      );
      alert = await Alert.findOneAndUpdate(
        { borrowerId: borrower.borrowerId, isAcknowledged: false },
        {
          borrowerName: borrower.name,
          severity: riskCategory,
          reasons: riskIndicators,
          recommendedAction,
          llmExplanation,
          createdAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    res.json({ borrower, alert, message: 'Risk scoring completed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/borrowers/:borrowerId/query — analyst natural language query
router.post('/:borrowerId/query', authorize('analyst', 'manager'), async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: 'Question is required' });

    const borrower = await Borrower.findOne({ borrowerId: req.params.borrowerId });
    if (!borrower) return res.status(404).json({ message: 'Borrower not found' });

    const alert = await Alert.findOne({ borrowerId: req.params.borrowerId, isAcknowledged: false })
      .sort({ createdAt: -1 });

    const answer = await answerAnalystQuery(borrower, alert, question);
    res.json({ question, answer, borrowerId: req.params.borrowerId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
