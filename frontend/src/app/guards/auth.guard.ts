import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isLoggedIn()) return true;
    this.router.navigate(['/login']);
    return false;
  }
}

// BUG FIX #8: RoleGuard was in a separate file that simply re-exported from here,
// which caused Angular DI to sometimes not find the provider. Consolidated into
// auth.guard.ts and role.guard.ts now just re-exports from here (no change needed).
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles: string[] = route.data['roles'] || [];
    if (this.authService.hasRole(...allowedRoles)) return true;
    this.router.navigate(['/dashboard']);
    return false;
  }
}
