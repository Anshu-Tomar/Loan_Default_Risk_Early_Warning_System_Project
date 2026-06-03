import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../../services/api.service';
import { PortfolioSummary, RiskCategory } from '../../models/app.models';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-portfolio-summary',
  templateUrl: './portfolio-summary.component.html',
  styleUrls: ['./portfolio-summary.component.scss']
})
export class PortfolioSummaryComponent implements OnInit {
  summary?: PortfolioSummary;
  loading = false;

  // Typed array to avoid template index errors
  riskCategories: RiskCategory[] = ['Critical', 'High Risk', 'Watchlist', 'Low'];

  donutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Low', 'Watchlist', 'High Risk', 'Critical'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
      borderWidth: 0
    }]
  };

  donutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.loading = true;
    this.analyticsService.getPortfolio().subscribe({
      next: res => {
        this.summary = res.summary;
        this.loading = false;
        this.donutChartData = {
          labels: ['Low', 'Watchlist', 'High Risk', 'Critical'],
          datasets: [{
            data: [
              res.summary.distribution['Low'],
              res.summary.distribution['Watchlist'],
              res.summary.distribution['High Risk'],
              res.summary.distribution['Critical']
            ],
            backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
            borderWidth: 0
          }]
        };
      },
      error: () => this.loading = false
    });
  }

  // Helper used in template — safe typed accessor
  getDistribution(category: RiskCategory): number {
    return this.summary?.distribution[category] ?? 0;
  }

  getBarPercent(category: RiskCategory): number {
    if (!this.summary || this.summary.totalBorrowers === 0) return 0;
    return (this.summary.distribution[category] / this.summary.totalBorrowers) * 100;
  }
}
