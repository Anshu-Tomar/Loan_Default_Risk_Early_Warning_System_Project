export interface User {
  id: string;
  username: string;
  email: string;
  role: 'analyst' | 'manager' | 'borrower';
  assignedBorrowers?: string[];
  borrowerId?: string;
}

export interface PaymentHistory {
  dueDate: string;
  paidDate?: string;
  amount: number;
  status: 'paid' | 'partial' | 'missed' | 'pending';
  daysLate: number;
  failedAutoDebit: boolean;
}

export interface Transaction {
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category: string;
}

export interface RiskTrend {
  date: string;
  score: number;
  category: RiskCategory;
}

export type RiskCategory = 'Low' | 'Watchlist' | 'High Risk' | 'Critical';

export interface Borrower {
  _id?: string;
  borrowerId: string;
  name: string;
  email?: string;
  phone?: string;
  loanAmount: number;
  emiAmount: number;
  outstandingBalance: number;
  // BUG FIX #6: loanStartDate and loanEndDate were missing from the interface
  // but are present in the Mongoose schema and seed data — caused TypeScript
  // errors when templates tried to reference them.
  loanStartDate?: string;
  loanEndDate?: string;
  creditUtilization?: number;
  monthlyIncome?: number;
  paymentHistory?: PaymentHistory[];
  recentTransactions?: Transaction[];
  riskScore: number;
  riskCategory: RiskCategory;
  riskIndicators: string[];
  lastScoredAt?: string;
  riskTrend?: RiskTrend[];
}

export interface Alert {
  _id: string;
  borrowerId: string;
  borrowerName: string;
  severity: RiskCategory;
  reasons: string[];
  recommendedAction: string;
  llmExplanation?: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  analystNotes?: string;
  createdAt: string;
}

export interface PortfolioSummary {
  totalBorrowers: number;
  totalLoanValue: number;
  totalOutstanding: number;
  activeAlerts: number;
  distribution: Record<RiskCategory, number>;
  avgRiskScore: number;
}

export interface ScenarioResult {
  borrowerId: string;
  current: { riskScore: number; riskCategory: RiskCategory; riskIndicators: string[] };
  simulated: { scenario: string; riskScore: number; riskCategory: RiskCategory; riskIndicators: string[] };
  scoreDelta: number;
}
