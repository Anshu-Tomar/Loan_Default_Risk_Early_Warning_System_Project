/**
 * Rule-based risk scoring engine
 * Evaluates borrowers against multiple financial health signals
 * and produces a risk score (0-100) and category.
 */

const WEIGHTS = {
  dpd: 35,          // days past due trend
  failedDebits: 20, // failed auto-debit frequency
  balance: 15,      // declining outstanding balance (partial payments)
  utilization: 15,  // rising credit utilization
  income: 15        // declining income inflows
};

function calculateDpdScore(paymentHistory) {
  if (!paymentHistory || paymentHistory.length === 0) return { score: 0, indicators: [] };
  const indicators = [];
  let score = 0;

  const recent = paymentHistory.slice(-6); // last 6 payments
  const missed = recent.filter(p => p.status === 'missed').length;
  const partial = recent.filter(p => p.status === 'partial').length;
  const avgDaysLate = recent.reduce((sum, p) => sum + (p.daysLate || 0), 0) / recent.length;

  if (missed >= 2) { score += 35; indicators.push(`${missed} missed EMIs in last 6 months`); }
  else if (missed === 1) { score += 20; indicators.push('1 missed EMI in last 6 months'); }

  if (partial >= 2) { score += 15; indicators.push(`${partial} partial payments detected`); }

  if (avgDaysLate > 15) { score += 20; indicators.push(`Average ${Math.round(avgDaysLate)} days late on payments`); }
  else if (avgDaysLate > 7) { score += 10; indicators.push(`Average ${Math.round(avgDaysLate)} days late on payments`); }

  // Trend worsening (last 2 vs previous 2)
  const last2 = paymentHistory.slice(-2);
  const prev2 = paymentHistory.slice(-4, -2);
  const lastLate = last2.reduce((s, p) => s + (p.daysLate || 0), 0) / 2;
  const prevLate = prev2.reduce((s, p) => s + (p.daysLate || 0), 0) / 2;
  if (lastLate > prevLate + 5) { score += 10; indicators.push('Worsening payment delay trend'); }

  return { score: Math.min(score, 100), indicators };
}

function calculateFailedDebitScore(paymentHistory) {
  if (!paymentHistory || paymentHistory.length === 0) return { score: 0, indicators: [] };
  const indicators = [];
  const recent = paymentHistory.slice(-3);
  const failed = recent.filter(p => p.failedAutoDebit).length;

  let score = 0;
  if (failed >= 2) { score = 100; indicators.push(`${failed} failed auto-debits in last 3 cycles`); }
  else if (failed === 1) { score = 50; indicators.push('1 failed auto-debit recently'); }
  return { score, indicators };
}

function calculateBalanceScore(borrower) {
  const indicators = [];
  let score = 0;
  const ratio = borrower.outstandingBalance / borrower.loanAmount;
  // Higher ratio means less has been paid — but combined with payment status
  if (ratio > 0.95 && borrower.paymentHistory?.length > 3) {
    score = 60;
    indicators.push('Outstanding balance barely reduced despite multiple payment cycles');
  } else if (ratio > 0.85 && borrower.paymentHistory?.length > 6) {
    score = 30;
    indicators.push('Slow loan principal reduction observed');
  }
  return { score, indicators };
}

function calculateUtilizationScore(creditUtilization) {
  if (creditUtilization == null) return { score: 0, indicators: [] };
  let score = 0;
  const indicators = [];
  if (creditUtilization >= 90) { score = 100; indicators.push(`Critical credit utilization at ${creditUtilization}%`); }
  else if (creditUtilization >= 75) { score = 70; indicators.push(`High credit utilization at ${creditUtilization}%`); }
  else if (creditUtilization >= 60) { score = 40; indicators.push(`Elevated credit utilization at ${creditUtilization}%`); }
  return { score, indicators };
}

function calculateIncomeScore(recentTransactions, monthlyIncome) {
  if (!recentTransactions || recentTransactions.length === 0 || !monthlyIncome) {
    return { score: 0, indicators: [] };
  }
  const indicators = [];
  let score = 0;

  // Group credits by month and check trend
  const creditsByMonth = {};
  recentTransactions.filter(t => t.type === 'credit').forEach(t => {
    const month = new Date(t.date).toISOString().slice(0, 7);
    creditsByMonth[month] = (creditsByMonth[month] || 0) + t.amount;
  });

  const months = Object.keys(creditsByMonth).sort();
  if (months.length >= 2) {
    const latest = creditsByMonth[months[months.length - 1]];
    const previous = creditsByMonth[months[months.length - 2]];
    const dropPct = ((previous - latest) / previous) * 100;

    if (dropPct > 40) { score = 80; indicators.push(`Income dropped ${Math.round(dropPct)}% in latest month`); }
    else if (dropPct > 20) { score = 50; indicators.push(`Income declined ${Math.round(dropPct)}% in latest month`); }

    if (latest < monthlyIncome * 0.5) { score = Math.max(score, 70); indicators.push('Current income significantly below declared monthly income'); }
  }
  return { score, indicators };
}

function getRiskCategory(score) {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High Risk';
  if (score >= 25) return 'Watchlist';
  return 'Low';
}

function getRecommendedAction(category, indicators) {
  const actions = {
    'Critical': 'Escalate to manual analyst review and initiate restructuring assessment immediately',
    'High Risk': 'Proactive call required — offer payment plan or EMI deferral options',
    'Watchlist': 'Send soft reminder and monitor for next 15 days',
    'Low': 'No immediate action required — continue routine monitoring'
  };
  return actions[category];
}

/**
 * Score a single borrower document
 * Returns { riskScore, riskCategory, riskIndicators, recommendedAction }
 */
function scoreBorrower(borrower) {
  const dpd = calculateDpdScore(borrower.paymentHistory);
  const debit = calculateFailedDebitScore(borrower.paymentHistory);
  const balance = calculateBalanceScore(borrower);
  const util = calculateUtilizationScore(borrower.creditUtilization);
  const income = calculateIncomeScore(borrower.recentTransactions, borrower.monthlyIncome);

  // Weighted composite score
  const riskScore = Math.round(
    (dpd.score * WEIGHTS.dpd +
     debit.score * WEIGHTS.failedDebits +
     balance.score * WEIGHTS.balance +
     util.score * WEIGHTS.utilization +
     income.score * WEIGHTS.income) / 100
  );

  const riskCategory = getRiskCategory(riskScore);
  const riskIndicators = [
    ...dpd.indicators,
    ...debit.indicators,
    ...balance.indicators,
    ...util.indicators,
    ...income.indicators
  ];

  const recommendedAction = getRecommendedAction(riskCategory, riskIndicators);

  return { riskScore, riskCategory, riskIndicators, recommendedAction };
}

module.exports = { scoreBorrower, getRiskCategory };
