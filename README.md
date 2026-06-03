# LoanEWS — Loan Default Risk Early Warning System

A full-stack MEAN application that proactively identifies borrowers likely to default within 30 days, generates AI-powered risk explanations, and surfaces actionable alerts for credit/collections teams.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 14, Angular Material, Chart.js (ng2-charts) |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| AI / LLM | LLM Wrapper API (custom endpoint) |

---

## Project Structure

```
loan-ews/
├── backend/
│   ├── .env                          # Environment config
│   ├── package.json
│   └── src/
│       ├── server.js                 # Express app entry point
│       ├── config/                   # (reserved for DB config extensions)
│       ├── models/
│       │   ├── user.model.js         # User with roles (analyst/manager/borrower)
│       │   ├── borrower.model.js     # Full borrower schema incl. risk fields
│       │   └── alert.model.js        # Risk alert schema
│       ├── routes/
│       │   ├── auth.routes.js        # Login, me, logout
│       │   ├── borrower.routes.js    # CRUD + scoring + AI query
│       │   ├── alert.routes.js       # Alert list + acknowledge
│       │   └── analytics.routes.js  # Portfolio summary + scenario sim
│       ├── middleware/
│       │   └── auth.middleware.js    # JWT verify + role guard + borrower isolation
│       ├── services/
│       │   ├── riskScoring.service.js  # Rule-based risk engine
│       │   └── llm.service.js          # LLM wrapper integration
│       └── utils/
│           └── seedData.js           # Mock data seeder
│
└── frontend/
    ├── angular.json
    ├── tsconfig.json
    ├── proxy.conf.json               # Dev proxy → :3000
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.scss               # Global + Material theme
        └── app/
            ├── app.module.ts         # All imports, Material modules
            ├── app-routing.module.ts # Route definitions with guards
            ├── models/
            │   └── app.models.ts     # TypeScript interfaces
            ├── services/
            │   ├── auth.service.ts   # Login, token, currentUser$
            │   └── api.service.ts    # BorrowerService, AlertService, AnalyticsService
            ├── interceptors/
            │   └── auth.interceptor.ts  # Attaches Bearer token; handles 401
            ├── guards/
            │   ├── auth.guard.ts     # Redirect unauthenticated users
            │   └── role.guard.ts     # Block routes by role
            └── components/
                ├── login/            # Login form with demo account quick-fill
                ├── shell/            # Sidebar layout, nav, user info, logout
                ├── dashboard/        # Borrower table, risk filter chips, summary cards
                ├── borrower-detail/  # Full profile, payment history, chart, AI query, scenario
                ├── alert-panel/      # Alerts with AI explanation, acknowledge
                └── portfolio-summary/ # Manager KPIs, donut chart, breakdown bars
```

---

## Setup & Running

### Prerequisites
- Node.js 16+
- MongoDB running locally on port 27017
- npm

### 1. Backend

```bash
cd backend
npm install

# Configure environment
cp .env .env.local
# Edit .env — set LLM_API_TOKEN to your actual token

# Seed the database with mock borrowers and users
npm run seed

# Start the server
npm run dev     # development (nodemon, auto-reload)
# or
npm start       # production
```

Server runs on `http://localhost:3000`

### 2. Frontend

```bash
cd frontend
npm install
ng serve
# or: npx ng serve --proxy-config proxy.conf.json
```

App runs on `http://localhost:4200`
API calls are proxied to `:3000` via `proxy.conf.json`.

---

## Demo Credentials

| Role | Username | Password | Access |
|---|---|---|---|
| Manager | `manager1` | `Manager@123` | All borrowers, portfolio, score-all |
| Analyst (Group 1) | `analyst1` | `Analyst@123` | B001, B002, B003 only |
| Analyst (Group 2) | `analyst2` | `Analyst@123` | B004, B005, B006 only |
| Borrower | `borrower_b001` | `Borrower@123` | Own profile only (B001) |
| Borrower (critical) | `borrower_b005` | `Borrower@123` | Own profile only (B005) |

---

## Mock Borrowers & Risk Profiles

| ID | Name | Profile | Expected Category |
|---|---|---|---|
| B001 | Arjun Sharma | Perfect payment history, stable income | Low |
| B002 | Priya Mehta | Partial payments, declining income | Watchlist |
| B003 | Rahul Verma | 2 missed EMIs, 2 failed debits, income crash | Critical |
| B004 | Sneha Iyer | Worsening delay trend, rising utilization | High Risk |
| B005 | Vikram Singh | 3 failed debits, 3 missed EMIs, income near zero | Critical |
| B006 | Kavita Reddy | Consistent payer, healthy utilization | Low |

---

## Risk Scoring Engine

### Signals & Weights

| Signal | Weight | Indicators |
|---|---|---|
| Days Past Due (DPD) Trend | 35% | Missed EMIs, partial payments, avg days late, worsening trend |
| Failed Auto-Debits | 20% | ≥2 in last 3 cycles = 100 score |
| Balance Reduction | 15% | Outstanding > 95% of loan amount after 3+ cycles |
| Credit Utilization | 15% | ≥90% = critical, ≥75% = high, ≥60% = elevated |
| Income Inflow Trend | 15% | Monthly credits vs declared income, month-over-month drop |

### Risk Categories

| Score Range | Category | Action |
|---|---|---|
| 0–24 | Low | No action — routine monitoring |
| 25–49 | Watchlist | Soft reminder, monitor 15 days |
| 50–74 | High Risk | Proactive call, offer payment plan |
| 75–100 | Critical | Escalate to analyst, restructuring review |

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (auth required) |
| POST | `/api/auth/logout` | Logout (client discards token) |

### Borrowers
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/borrowers` | All roles | List borrowers (role-filtered) |
| GET | `/api/borrowers/:id` | All roles | Borrower detail |
| POST | `/api/borrowers/:id/score` | analyst, manager | Trigger risk scoring |
| POST | `/api/borrowers/:id/query` | analyst, manager | Natural language AI query |
| POST | `/api/borrowers/score-all` | manager only | Score entire portfolio |

### Alerts
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/alerts` | All roles | List alerts (role-filtered) |
| GET | `/api/alerts/:id` | All roles | Alert detail |
| PATCH | `/api/alerts/:id/acknowledge` | analyst, manager | Acknowledge with notes |

### Analytics
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/portfolio` | manager | Portfolio KPIs and distribution |
| GET | `/api/analytics/scenario/:id` | analyst, manager | "What if next EMI missed?" |

---

## Security & Access Control

### Role-Based Data Isolation

**Borrower role:**
- Can only view their own borrower record and alerts
- `borrowerDataGuard` middleware injects `borrowerId` filter on all queries
- Attempting to access another borrower's ID returns `403 Forbidden`

**Analyst role:**
- Can only view borrowers in their `assignedBorrowers` array
- Cannot access Portfolio Summary (manager-only route)
- Can score, acknowledge alerts, and query AI for assigned borrowers

**Manager role:**
- Full access to all borrowers and alerts
- Can trigger batch scoring of all borrowers
- Can access Portfolio Summary and scenario simulation

### In a Real Implementation
- JWT tokens should have short expiry (15–30 min) with refresh token rotation
- Sensitive fields (PAN, Aadhaar, account numbers) would be encrypted at rest using AES-256
- All API calls would be HTTPS-only with TLS 1.3
- Audit log for all data access (who viewed what, when)
- Rate limiting on `/api/auth/login` to prevent brute force
- MongoDB field-level encryption for PII

---

## LLM Integration

The system calls `POST /llm/query` on your wrapper API for two purposes:

### 1. Alert Explanation Generation
Triggered when a borrower is scored as non-Low risk. The prompt is:
- **Grounded** — only uses the borrower's actual data fields and computed indicators
- **Constrained** — explicitly told not to infer beyond available data
- **Auditable** — output is stored in the alert record for review

### 2. Analyst Natural Language Query
Triggered via `POST /api/borrowers/:id/query`. Example questions:
- "Why was borrower B123 flagged?"
- "What is their payment trend over the last 3 months?"
- "Is there evidence of income reduction?"

The prompt includes full borrower data and explicitly states: *"If the answer cannot be determined from available data, say so."*

### Graceful Degradation
If the LLM API is unavailable or returns an error, both functions fall back to a deterministic rule-based template using the computed risk indicators. The system never fails silently.

---

## Edge Cases Handled

| Edge Case | Handling |
|---|---|
| No payment history | Scoring skips DPD/debit signals; returns score from remaining signals |
| Null credit utilization | Utilization signal returns 0 (no penalty) |
| No income transactions | Income signal returns 0 (no penalty) |
| Insufficient history (< 3 payments) | Score based on available records only |
| LLM API unavailable | Falls back to template-based explanation string |
| Borrower accessing another's data | `403 Forbidden` from `borrowerDataGuard` |
| Analyst accessing unassigned borrower | Filtered out at query level |
| Score-all on large portfolio | Sequential processing with per-borrower error isolation |

---

## Bonus Features Implemented

-  **Risk trend visualization** — line chart of risk score over time per borrower
-  **Scenario simulation** — "What if next EMI is missed?" with score delta
-  **Portfolio-level summary** — manager dashboard with donut chart + KPI cards
-  **Analyst natural language query** — grounded AI answers per borrower
-  **Alert acknowledgement** — with analyst notes and timestamp

---

## Assumptions & Trade-offs

1. **Rule-based scoring over ML model** — Chosen for explainability and auditability in a regulated lending context. Thresholds are explicitly documented and can be tuned.
2. **Sequential LLM calls on score-all** — Avoids rate limiting; could be parallelized with a queue (Bull/BullMQ) in production.
3. **Simulated auth** — JWT is real, but password reset, MFA, and session invalidation are out of scope for the prototype.
4. **Mock data only** — No real borrower PII used; all data is synthetically generated.
5. **MongoDB (not RDBMS)** — Chosen for flexible schema during prototyping; a production system with strict compliance requirements might prefer PostgreSQL with row-level security.
6. **No real-time streaming** — Per scope constraints; production could use Kafka/WebSockets for live alert delivery.

---

## Development Notes

- Run `npm run seed` again at any time to reset the database to its initial state
- The `riskTrend` array grows by one entry each time a borrower is scored; capped at 12 entries
- All monetary values are in Indian Rupees (₹)
- Dates use the system timezone; production should standardize to UTC
