const express = require('express');
const Alert = require('../models/alert.model');
const { authenticate, authorize, borrowerDataGuard } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);
router.use(borrowerDataGuard);

// GET /api/alerts — list alerts (role-filtered)
router.get('/', async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'borrower') {
      query.borrowerId = req.user.borrowerId;
    } else if (req.user.role === 'analyst' && req.assignedBorrowers?.length) {
      query.borrowerId = { $in: req.assignedBorrowers };
    }

    if (req.query.severity) query.severity = req.query.severity;
    if (req.query.isAcknowledged !== undefined) query.isAcknowledged = req.query.isAcknowledged === 'true';

    const alerts = await Alert.find(query).sort({ createdAt: -1 });
    res.json({ alerts, total: alerts.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/alerts/:id
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    // Role guard
    if (req.user.role === 'borrower' && alert.borrowerId !== req.user.borrowerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ alert });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', authorize('analyst', 'manager'), async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        isAcknowledged: true,
        acknowledgedBy: req.user.username,
        acknowledgedAt: new Date(),
        analystNotes: req.body.notes || ''
      },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json({ alert, message: 'Alert acknowledged' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
