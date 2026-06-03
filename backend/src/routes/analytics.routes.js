const express = require('express');
const Borrower = require('../models/borrower.model');
const Alert = require('../models/alert.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');
// BUG FIX #2: Import scoreBorrower at the top level.
// Original code did require() INSIDE the route handler, which is harmless but
// messy and caused confusion; centralise imports at the top.
const { scoreBorrower } = require('../services/riskScoring.service');

const router = express.Router();
router.use(authenticate);

// GET /api/analytics/portfolio — manager portfolio overview
router.get('/portfolio', authorize('manager'), async (req, res) => {
  try {
    const [borrowers, alerts] = await Promise.all([
      Borrower.find().select('riskScore riskCategory loanAmount outstandingBalance'),
      Alert.find({ isAcknowledged: false })
    ]);

    const summary = {
      totalBorrowers: borrowers.length,
      totalLoanValue: borrowers.reduce((s, b) => s + b.loanAmount, 0),
      totalOutstanding: borrowers.reduce((s, b) => s + b.outstandingBalance, 0),
      activeAlerts: alerts.length,
      distribution: {
        Low: borrowers.filter(b => b.riskCategory === 'Low').length,
        Watchlist: borrowers.filter(b => b.riskCategory === 'Watchlist').length,
        'High Risk': borrowers.filter(b => b.riskCategory === 'High Risk').length,
        Critical: borrowers.filter(b => b.riskCategory === 'Critical').length
      },
      avgRiskScore: borrowers.length
        ? Math.round(borrowers.reduce((s, b) => s + b.riskScore, 0) / borrowers.length)
        : 0
    };

    res.json({ summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/scenario/:borrowerId — "what-if" simulation
router.get('/scenario/:borrowerId', authorize('analyst', 'manager'), async (req, res) => {
  try {
    const borrower = await Borrower.findOne({ borrowerId: req.params.borrowerId });
    if (!borrower) return res.status(404).json({ message: 'Borrower not found' });

    // Simulate next EMI missed
    const simBorrower = borrower.toObject();
    simBorrower.paymentHistory = [
      ...(simBorrower.paymentHistory || []),
      {
        dueDate: new Date(),
        paidDate: null,
        amount: simBorrower.emiAmount,
        status: 'missed',
        daysLate: 0,
        failedAutoDebit: true
      }
    ];

    const currentScoring = scoreBorrower(borrower.toObject());
    const simulatedScoring = scoreBorrower(simBorrower);

    res.json({
      borrowerId: req.params.borrowerId,
      current: {
        riskScore: currentScoring.riskScore,
        riskCategory: currentScoring.riskCategory,
        riskIndicators: currentScoring.riskIndicators
      },
      simulated: {
        scenario: 'Next EMI missed',
        riskScore: simulatedScoring.riskScore,
        riskCategory: simulatedScoring.riskCategory,
        riskIndicators: simulatedScoring.riskIndicators
      },
      scoreDelta: simulatedScoring.riskScore - currentScoring.riskScore
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
