import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BorrowerService, AnalyticsService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Borrower, ScenarioResult } from '../../models/app.models';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-borrower-detail',
  templateUrl: './borrower-detail.component.html',
  styleUrls: ['./borrower-detail.component.scss']
})
export class BorrowerDetailComponent implements OnInit {
  borrower?: Borrower;
  scenario?: ScenarioResult;
  loading = false;
  scoring = false;
  queryLoading = false;
  analystQuestion = '';
  queryAnswer = '';

  trendChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Risk Score',
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4
    }]
  };
  trendChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: { y: { min: 0, max: 100 } },
    plugins: { legend: { display: false } }
  };

  paymentDisplayedColumns = ['dueDate', 'paidDate', 'amount', 'status', 'daysLate', 'failedAutoDebit'];

  constructor(
    private route: ActivatedRoute,
    private borrowerService: BorrowerService,
    private analyticsService: AnalyticsService,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // BUG FIX #5: Route param is 'borrowerId' (matches :borrowerId in routing),
    // but original code used get('borrowerId') correctly — keeping it here.
    const id = this.route.snapshot.paramMap.get('borrowerId')!;
    this.loadBorrower(id);
  }

  loadBorrower(id: string) {
    this.loading = true;
    this.borrowerService.getBorrower(id).subscribe({
      next: res => {
        this.borrower = res.borrower;
        this.loading = false;
        this.buildTrendChart();
      },
      error: () => this.loading = false
    });
  }

  buildTrendChart() {
    if (!this.borrower?.riskTrend?.length) return;
    this.trendChartData = {
      labels: this.borrower.riskTrend.map(t => new Date(t.date).toLocaleDateString()),
      datasets: [{
        data: this.borrower.riskTrend.map(t => t.score),
        label: 'Risk Score',
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }

  scoreBorrower() {
    if (!this.borrower) return;
    this.scoring = true;
    this.borrowerService.scoreBorrower(this.borrower.borrowerId).subscribe({
      next: res => {
        this.borrower = res.borrower;
        this.scoring = false;
        this.buildTrendChart();
        this.snackBar.open('✅ Risk score updated', 'OK', { duration: 2500 });
      },
      error: () => {
        this.scoring = false;
        this.snackBar.open('Scoring failed', 'Close', { duration: 3000 });
      }
    });
  }

  runScenario() {
    if (!this.borrower) return;
    this.analyticsService.getScenario(this.borrower.borrowerId).subscribe({
      next: res => this.scenario = res
    });
  }

  submitQuery() {
    if (!this.borrower || !this.analystQuestion.trim()) return;
    this.queryLoading = true;
    this.borrowerService.queryBorrower(this.borrower.borrowerId, this.analystQuestion).subscribe({
      next: res => { this.queryAnswer = res.answer; this.queryLoading = false; },
      error: () => { this.queryLoading = false; this.queryAnswer = 'Unable to get answer at this time.'; }
    });
  }

  getRiskClass(category: string): string {
    const map: Record<string, string> = {
      'Critical': 'risk-critical', 'High Risk': 'risk-high',
      'Watchlist': 'risk-watchlist', 'Low': 'risk-low'
    };
    return map[category] || 'risk-low';
  }
}
