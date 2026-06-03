require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Borrower = require('../models/borrower.model');
const User = require('../models/user.model');
const Alert = require('../models/alert.model');
const { scoreBorrower } = require('../services/riskScoring.service');

const now = new Date();
const monthsAgo = (n) => new Date(now.getFullYear(), now.getMonth() - n, now.getDate());

function makePayments(pattern) {
  // pattern: array of {status, daysLate, failedAutoDebit}
  return pattern.map((p, i) => ({
    dueDate: monthsAgo(pattern.length - i),
    paidDate: p.status === 'missed' ? null : monthsAgo(pattern.length - i - 0.5),
    amount: 8500,
    status: p.status,
    daysLate: p.daysLate || 0,
    failedAutoDebit: p.failedAutoDebit || false
  }));
}

function makeTransactions(incomePattern) {
  // incomePattern: array of monthly income amounts (oldest to newest)
  const txns = [];
  incomePattern.forEach((income, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (incomePattern.length - 1 - i), 15);
    txns.push({ date, type: 'credit', amount: income, description: 'Salary credit', category: 'income' });
    txns.push({ date: new Date(date.getTime() + 86400000), type: 'debit', amount: income * 0.3, description: 'Rent payment', category: 'housing' });
  });
  return txns;
}

const MOCK_BORROWERS = [
  {
    borrowerId: 'B001',
    name: 'Arjun Sharma',
    email: 'arjun.sharma@email.com',
    phone: '9876543210',
    loanAmount: 500000,
    emiAmount: 8500,
    outstandingBalance: 420000,
    creditUtilization: 35,
    monthlyIncome: 55000,
    paymentHistory: makePayments([
      { status: 'paid' }, { status: 'paid' }, { status: 'paid' },
      { status: 'paid' }, { status: 'paid' }, { status: 'paid' }
    ]),
    recentTransactions: makeTransactions([54000, 55000, 55000, 56000, 55000, 55500])
  },
  {
    borrowerId: 'B002',
    name: 'Priya Mehta',
    email: 'priya.mehta@email.com',
    phone: '9876543211',
    loanAmount: 300000,
    emiAmount: 6200,
    outstandingBalance: 265000,
    creditUtilization: 68,
    monthlyIncome: 42000,
    paymentHistory: makePayments([
      { status: 'paid' }, { status: 'paid' }, { status: 'paid' },
      { status: 'paid', daysLate: 3 }, { status: 'partial', daysLate: 7 }, { status: 'paid', daysLate: 5 }
    ]),
    recentTransactions: makeTransactions([42000, 40000, 38000, 35000, 33000, 30000])
  },
  {
    borrowerId: 'B003',
    name: 'Rahul Verma',
    email: 'rahul.verma@email.com',
    phone: '9876543212',
    loanAmount: 800000,
    emiAmount: 14000,
    outstandingBalance: 760000,
    creditUtilization: 88,
    monthlyIncome: 80000,
    paymentHistory: makePayments([
      { status: 'paid' }, { status: 'paid', daysLate: 5 },
      { status: 'partial', daysLate: 10 }, { status: 'missed', failedAutoDebit: true },
      { status: 'partial', daysLate: 15 }, { status: 'missed', failedAutoDebit: true }
    ]),
    recentTransactions: makeTransactions([80000, 75000, 60000, 45000, 30000, 20000])
  },
  {
    borrowerId: 'B004',
    name: 'Sneha Iyer',
    email: 'sneha.iyer@email.com',
    phone: '9876543213',
    loanAmount: 250000,
    emiAmount: 5000,
    outstandingBalance: 200000,
    creditUtilization: 55,
    monthlyIncome: 38000,
    paymentHistory: makePayments([
      { status: 'paid' }, { status: 'paid' }, { status: 'paid', daysLate: 2 },
      { status: 'partial', daysLate: 8 }, { status: 'paid', daysLate: 12 }, { status: 'partial', daysLate: 18 }
    ]),
    recentTransactions: makeTransactions([38000, 37000, 35000, 33000, 32000, 28000])
  },
  {
    borrowerId: 'B005',
    name: 'Vikram Singh',
    email: 'vikram.singh@email.com',
    phone: '9876543214',
    loanAmount: 1000000,
    emiAmount: 18500,
    outstandingBalance: 980000,
    creditUtilization: 95,
    monthlyIncome: 120000,
    paymentHistory: makePayments([
      { status: 'paid', daysLate: 5 }, { status: 'partial', daysLate: 12 },
      { status: 'missed', failedAutoDebit: true }, { status: 'missed', failedAutoDebit: true },
      { status: 'partial', daysLate: 20 }, { status: 'missed', failedAutoDebit: true }
    ]),
    recentTransactions: makeTransactions([120000, 100000, 70000, 40000, 20000, 15000])
  },
  {
    borrowerId: 'B006',
    name: 'Kavita Reddy',
    email: 'kavita.reddy@email.com',
    phone: '9876543215',
    loanAmount: 400000,
    emiAmount: 7200,
    outstandingBalance: 310000,
    creditUtilization: 42,
    monthlyIncome: 52000,
    paymentHistory: makePayments([
      { status: 'paid' }, { status: 'paid' }, { status: 'paid' },
      { status: 'paid', daysLate: 1 }, { status: 'paid' }, { status: 'paid' }
    ]),
    recentTransactions: makeTransactions([52000, 53000, 51000, 52000, 54000, 52500])
  }
];

const MOCK_USERS = [
  { username: 'manager1', email: 'manager@loanews.com', password: 'Manager@123', role: 'manager' },
  { username: 'analyst1', email: 'analyst1@loanews.com', password: 'Analyst@123', role: 'analyst', assignedBorrowers: ['B001', 'B002', 'B003'] },
  { username: 'analyst2', email: 'analyst2@loanews.com', password: 'Analyst@123', role: 'analyst', assignedBorrowers: ['B004', 'B005', 'B006'] },
  { username: 'borrower_b001', email: 'arjun.sharma@email.com', password: 'Borrower@123', role: 'borrower', borrowerId: 'B001' },
  { username: 'borrower_b005', email: 'vikram.singh@email.com', password: 'Borrower@123', role: 'borrower', borrowerId: 'B005' }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  await Borrower.deleteMany({});
  await User.deleteMany({});
  await Alert.deleteMany({});

  // Create and score borrowers
  for (const data of MOCK_BORROWERS) {
    const borrower = new Borrower(data);
    const scoring = scoreBorrower(borrower);
    borrower.riskScore = scoring.riskScore;
    borrower.riskCategory = scoring.riskCategory;
    borrower.riskIndicators = scoring.riskIndicators;
    borrower.lastScoredAt = new Date();
    borrower.riskTrend = [{ date: new Date(), score: scoring.riskScore, category: scoring.riskCategory }];
    await borrower.save();

    if (scoring.riskCategory !== 'Low') {
      await Alert.create({
        borrowerId: borrower.borrowerId,
        borrowerName: borrower.name,
        severity: scoring.riskCategory,
        reasons: scoring.riskIndicators,
        recommendedAction: scoring.recommendedAction,
        llmExplanation: `[Auto-generated] ${borrower.name} has been flagged as ${scoring.riskCategory}. Key signals: ${scoring.riskIndicators.join('; ')}. ${scoring.recommendedAction}.`
      });
    }
    console.log(` Borrower ${borrower.borrowerId} (${borrower.name}) seeded as ${scoring.riskCategory}`);
  }

  for (const data of MOCK_USERS) {
    await User.create(data);
    console.log(` User ${data.username} (${data.role}) created`);
  }

  console.log('\n Seed complete!\n');
  console.log('Login credentials:');
  MOCK_USERS.forEach(u => console.log(`  ${u.role.padEnd(10)} | ${u.username.padEnd(20)} | ${u.password}`));
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
