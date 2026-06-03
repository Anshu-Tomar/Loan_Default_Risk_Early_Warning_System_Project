import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BorrowerService, AlertService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Borrower, Alert, RiskCategory } from '../../models/app.models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  borrowers: Borrower[] = [];
  activeAlerts: Alert[] = [];
  loading = false;
  scoringAll = false;
  selectedFilter: RiskCategory | '' = '';

  displayedColumns = ['name', 'borrowerId', 'riskCategory', 'riskScore', 'outstandingBalance', 'lastScored', 'actions'];

  riskFilters: { label: string; value: RiskCategory | '' }[] = [
    { label: 'All', value: '' },
    { label: 'Critical', value: 'Critical' },
    { label: 'High Risk', value: 'High Risk' },
    { label: 'Watchlist', value: 'Watchlist' },
    { label: 'Low', value: 'Low' }
  ];

  constructor(
    private borrowerService: BorrowerService,
    private alertService: AlertService,
    public authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    const filters = this.selectedFilter ? { riskCategory: this.selectedFilter } : undefined;

    this.borrowerService.getBorrowers(filters).subscribe({
      next: res => { this.borrowers = res.borrowers; this.loading = false; },
      error: () => { this.loading = false; }
    });

    this.alertService.getAlerts({ isAcknowledged: false }).subscribe({
      next: res => this.activeAlerts = res.alerts.slice(0, 5)
    });
  }

  onFilterChange(val: RiskCategory | '') {
    this.selectedFilter = val;
    this.loadData();
  }

  viewBorrower(id: string) {
    this.router.navigate(['/borrowers', id]);
  }

  scoreAll() {
    this.scoringAll = true;
    this.borrowerService.scoreAll().subscribe({
      next: res => {
        this.scoringAll = false;
        this.snackBar.open(`✅ ${res.message}`, 'OK', { duration: 3000 });
        this.loadData();
      },
      error: err => {
        this.scoringAll = false;
        this.snackBar.open('Scoring failed: ' + (err.error?.message || 'Unknown error'), 'Close', { duration: 4000 });
      }
    });
  }

  // Accepts RiskCategory OR empty string (for "All" filter button)
  getRiskColor(category: RiskCategory | string): string {
    const map: Record<string, string> = {
      'Critical': 'critical',
      'High Risk': 'high',
      'Watchlist': 'watchlist',
      'Low': 'low',
      '': 'all'
    };
    return map[category] ?? 'all';
  }

  get criticalCount() { return this.borrowers.filter(b => b.riskCategory === 'Critical').length; }
  get highRiskCount() { return this.borrowers.filter(b => b.riskCategory === 'High Risk').length; }
  get watchlistCount() { return this.borrowers.filter(b => b.riskCategory === 'Watchlist').length; }
}
