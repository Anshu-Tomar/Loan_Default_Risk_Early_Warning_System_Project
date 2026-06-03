const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  dueDate: Date,
  paidDate: Date,
  amount: Number,
  status: { type: String, enum: ['paid', 'partial', 'missed', 'pending'] },
  daysLate: { type: Number, default: 0 },
  failedAutoDebit: { type: Boolean, default: false }
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  date: Date,
  type: { type: String, enum: ['credit', 'debit'] },
  amount: Number,
  description: String,
  category: String
}, { _id: false });

const borrowerSchema = new mongoose.Schema({
  borrowerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: String,
  phone: String,
  loanAmount: { type: Number, required: true },
  emiAmount: { type: Number, required: true },
  outstandingBalance: { type: Number, required: true },
  loanStartDate: Date,
  loanEndDate: Date,
  creditUtilization: { type: Number, min: 0, max: 100 }, // percentage
  monthlyIncome: Number,
  paymentHistory: [paymentHistorySchema],
  recentTransactions: [transactionSchema],

  // Computed risk fields (updated by scoring engine)
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  riskCategory: {
    type: String,
    enum: ['Low', 'Watchlist', 'High Risk', 'Critical'],
    default: 'Low'
  },
  riskIndicators: [String],
  lastScoredAt: { type: Date, default: Date.now },

  // Trend data
  riskTrend: [{
    date: Date,
    score: Number,
    category: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Borrower', borrowerSchema);
