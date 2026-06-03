import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Borrower, Alert, PortfolioSummary, ScenarioResult } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class BorrowerService {
  private readonly API = '/api/borrowers';

  constructor(private http: HttpClient) {}

  getBorrowers(filters?: { riskCategory?: string }): Observable<{ borrowers: Borrower[]; total: number }> {
    let params = new HttpParams();
    if (filters?.riskCategory) params = params.set('riskCategory', filters.riskCategory);
    return this.http.get<{ borrowers: Borrower[]; total: number }>(this.API, { params });
  }

  getBorrower(borrowerId: string): Observable<{ borrower: Borrower }> {
    return this.http.get<{ borrower: Borrower }>(`${this.API}/${borrowerId}`);
  }

  scoreBorrower(borrowerId: string): Observable<{ borrower: Borrower; alert: Alert; message: string }> {
    return this.http.post<{ borrower: Borrower; alert: Alert; message: string }>(`${this.API}/${borrowerId}/score`, {});
  }

  // BUG FIX #7: scoreAll() was calling POST /api/borrowers/score-all — this is
  // correct on the frontend side, but only works if the backend route is
  // declared before /:borrowerId (fixed in borrower.routes.js).
  scoreAll(): Observable<{ message: string; results: any[] }> {
    return this.http.post<{ message: string; results: any[] }>(`${this.API}/score-all`, {});
  }

  queryBorrower(borrowerId: string, question: string): Observable<{ question: string; answer: string }> {
    return this.http.post<{ question: string; answer: string }>(`${this.API}/${borrowerId}/query`, { question });
  }
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly API = '/api/alerts';

  constructor(private http: HttpClient) {}

  getAlerts(filters?: { severity?: string; isAcknowledged?: boolean }): Observable<{ alerts: Alert[]; total: number }> {
    let params = new HttpParams();
    if (filters?.severity) params = params.set('severity', filters.severity);
    if (filters?.isAcknowledged !== undefined) params = params.set('isAcknowledged', String(filters.isAcknowledged));
    return this.http.get<{ alerts: Alert[]; total: number }>(this.API, { params });
  }

  acknowledgeAlert(id: string, notes?: string): Observable<{ alert: Alert }> {
    return this.http.patch<{ alert: Alert }>(`${this.API}/${id}/acknowledge`, { notes });
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly API = '/api/analytics';

  constructor(private http: HttpClient) {}

  getPortfolio(): Observable<{ summary: PortfolioSummary }> {
    return this.http.get<{ summary: PortfolioSummary }>(`${this.API}/portfolio`);
  }

  getScenario(borrowerId: string): Observable<ScenarioResult> {
    return this.http.get<ScenarioResult>(`${this.API}/scenario/${borrowerId}`);
  }
}
