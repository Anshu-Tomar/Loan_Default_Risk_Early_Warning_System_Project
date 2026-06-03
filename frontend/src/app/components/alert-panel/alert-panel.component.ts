import { Component, OnInit } from '@angular/core';
import { AlertService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Alert } from '../../models/app.models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-alert-panel',
  templateUrl: './alert-panel.component.html',
  styleUrls: ['./alert-panel.component.scss']
})
export class AlertPanelComponent implements OnInit {
  alerts: Alert[] = [];
  loading = false;
  showAcknowledged = false;
  acknowledgeNotes: { [id: string]: string } = {};

  constructor(
    private alertService: AlertService,
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() { this.loadAlerts(); }

  loadAlerts() {
    this.loading = true;
    this.alertService.getAlerts({ isAcknowledged: this.showAcknowledged }).subscribe({
      next: res => { this.alerts = res.alerts; this.loading = false; },
      error: () => this.loading = false
    });
  }

  acknowledge(alert: Alert) {
    const notes = this.acknowledgeNotes[alert._id];
    this.alertService.acknowledgeAlert(alert._id, notes).subscribe({
      next: () => {
        this.snackBar.open('Alert acknowledged', 'OK', { duration: 2000 });
        this.loadAlerts();
      }
    });
  }

  viewBorrower(borrowerId: string) {
    this.router.navigate(['/borrowers', borrowerId]);
  }

  getSeverityClass(severity: string): string {
    const map: Record<string, string> = {
      'Critical': 'sev-critical', 'High Risk': 'sev-high',
      'Watchlist': 'sev-watchlist', 'Low': 'sev-low'
    };
    return map[severity] || 'sev-low';
  }
}
