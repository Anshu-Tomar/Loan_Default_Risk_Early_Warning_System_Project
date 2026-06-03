import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ShellComponent } from './components/shell/shell.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BorrowerDetailComponent } from './components/borrower-detail/borrower-detail.component';
import { AlertPanelComponent } from './components/alert-panel/alert-panel.component';
import { PortfolioSummaryComponent } from './components/portfolio-summary/portfolio-summary.component';
import { AuthGuard } from './guards/auth.guard';
// BUG FIX #4: role.guard.ts simply re-exports from auth.guard.ts, so both
// AuthGuard and RoleGuard should be imported directly from auth.guard to avoid
// a circular/empty import issue if the re-export barrel is not resolved properly.
import { RoleGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'borrowers/:borrowerId', component: BorrowerDetailComponent },
      { path: 'alerts', component: AlertPanelComponent },
      {
        path: 'portfolio',
        component: PortfolioSummaryComponent,
        canActivate: [RoleGuard],
        data: { roles: ['manager'] }
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
