import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard - Protects routes from unauthorized access
 *
 * How it works:
 * 1. User tries to visit /dashboard
 * 2. Guard checks: Is user logged in?
 * 3. If YES → Allow access ✓
 * 4. If NO → Redirect to /login ✗
 *
 * Used on: Protected routes (dashboard, appointments, doctors, etc.)
 * Not used on: Public routes (login, register)
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    // Check if user is authenticated
    const isAuthenticated = this.authService.isAuthenticated();
    const token = localStorage.getItem('accessToken');
    
    console.log('[AuthGuard] Checking authentication...');
    console.log('[AuthGuard] isAuthenticated():', isAuthenticated);
    console.log('[AuthGuard] Token in localStorage:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    console.log('[AuthGuard] User in AuthService:', this.authService.getCurrentUser());
    
    if (isAuthenticated || token) {
      // User logged in → Allow access
      console.log('[AuthGuard] ✓ Access allowed');
      return true;
    } else {
      // User not logged in → Redirect to login
      console.log('[AuthGuard] ✗ No authentication found, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }
  }
}
