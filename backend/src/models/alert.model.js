const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  borrowerId: { type: String, required: true, index: true },
  borrowerName: String,
  severity: {
    type: String,
    enum: ['Low', 'Watchlist', 'High Risk', 'Critical'],
    required: true
  },
  reasons: [String],         // key risk signals
  recommendedAction: String, // LLM or rule-based recommendation
  llmExplanation: String,    // AI-generated explanation
  isAcknowledged: { type: Boolean, default: false },
  acknowledgedBy: String,
  acknowledgedAt: Date,
  analystNotes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);
