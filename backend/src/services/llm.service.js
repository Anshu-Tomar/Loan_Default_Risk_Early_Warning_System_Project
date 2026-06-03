const fetch = require('node-fetch');

const LLM_URL = process.env.LLM_WRAPPER_URL;
const LLM_TOKEN = process.env.LLM_API_TOKEN;

/**
 * Call the LLM wrapper to generate a grounded explanation
 */
async function callLLM(prompt) {
  try {
    const response = await fetch(`${LLM_URL}/llm/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_TOKEN}`
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data?.response || data?.text || data?.content || 'Unable to generate explanation.';
  } catch (err) {
    console.error('LLM call failed:', err.message);
    // Graceful degradation — return a rule-based fallback
    return null;
  }
}

/**
 * Generate a grounded alert explanation for a borrower.
 * Prompts are explicitly constrained to only use provided data.
 */
async function generateAlertExplanation(borrower, riskIndicators, riskCategory, recommendedAction) {
  const indicatorList = riskIndicators.length > 0
    ? riskIndicators.map((r, i) => `${i + 1}. ${r}`).join('\n')
    : 'No specific indicators detected.';

  const prompt = `You are a risk analyst assistant for a lending company. You must only use the data provided below and must NOT infer or add information not present.

Borrower Data:
- ID: ${borrower.borrowerId}
- Name: ${borrower.name}
- Loan Amount: ₹${borrower.loanAmount.toLocaleString()}
- EMI Amount: ₹${borrower.emiAmount.toLocaleString()}
- Outstanding Balance: ₹${borrower.outstandingBalance.toLocaleString()}
- Credit Utilization: ${borrower.creditUtilization ?? 'N/A'}%
- Risk Category: ${riskCategory}

Detected Risk Signals (grounded, do not expand beyond these):
${indicatorList}

Recommended Action: ${recommendedAction}

Task: Write a concise, professional risk alert explanation (3-4 sentences) for the credit monitoring team. 
- State the risk level and why this borrower is flagged
- Reference only the signals listed above
- End with the recommended action
- Do NOT speculate beyond the provided data`;

  const explanation = await callLLM(prompt);

  // Fallback if LLM is unavailable
  if (!explanation) {
    return `Borrower ${borrower.name} (${borrower.borrowerId}) has been categorized as ${riskCategory} based on the following signals: ${riskIndicators.join('; ')}. ${recommendedAction}.`;
  }

  return explanation;
}

/**
 * Answer analyst's natural language question about a borrower.
 * Strictly grounded to available data.
 */
async function answerAnalystQuery(borrower, alert, question) {
  const prompt = `You are a risk analysis assistant. Answer the analyst's question ONLY using the data below. 
If the answer cannot be determined from the available data, say so explicitly. Do NOT fabricate information.

=== BORROWER DATA ===
ID: ${borrower.borrowerId}
Name: ${borrower.name}
Loan Amount: ₹${borrower.loanAmount?.toLocaleString()}
EMI Amount: ₹${borrower.emiAmount?.toLocaleString()}
Outstanding Balance: ₹${borrower.outstandingBalance?.toLocaleString()}
Credit Utilization: ${borrower.creditUtilization ?? 'Not available'}%
Monthly Income: ₹${borrower.monthlyIncome?.toLocaleString() ?? 'Not available'}
Risk Category: ${borrower.riskCategory}
Risk Score: ${borrower.riskScore}/100

=== PAYMENT HISTORY (last 6) ===
${(borrower.paymentHistory?.slice(-6) || []).map(p =>
  `  Due: ${new Date(p.dueDate).toLocaleDateString()} | Paid: ${p.paidDate ? new Date(p.paidDate).toLocaleDateString() : 'Not paid'} | Status: ${p.status} | Days Late: ${p.daysLate} | Failed Auto-Debit: ${p.failedAutoDebit}`
).join('\n') || 'No payment history available'}

=== RISK SIGNALS ===
${borrower.riskIndicators?.join('\n') || 'None detected'}

=== CURRENT ALERT ===
Severity: ${alert?.severity || 'N/A'}
Reasons: ${alert?.reasons?.join(', ') || 'N/A'}
Recommended Action: ${alert?.recommendedAction || 'N/A'}

=== ANALYST QUESTION ===
${question}

Answer concisely and factually. Reference specific data points where possible.`;

  const answer = await callLLM(prompt);
  if (!answer) {
    return `Based on available data: Borrower ${borrower.name} has risk category ${borrower.riskCategory} with indicators: ${borrower.riskIndicators?.join('; ') || 'none'}.`;
  }
  return answer;
}

module.exports = { generateAlertExplanation, answerAnalystQuery };
