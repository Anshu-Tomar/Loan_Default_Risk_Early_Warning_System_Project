import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/app.models';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  constructor(public authService: AuthService, private router: Router) {}

  get user(): User | null { return this.authService.currentUser; }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get navItems() {
    const items = [
      { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['analyst', 'manager', 'borrower'] },
      { label: 'Alerts', icon: 'notifications_active', route: '/alerts', roles: ['analyst', 'manager', 'borrower'] },
      { label: 'Portfolio', icon: 'assessment', route: '/portfolio', roles: ['manager'] }
    ];
    return items.filter(i => !this.user || i.roles.includes(this.user.role));
  }
}
