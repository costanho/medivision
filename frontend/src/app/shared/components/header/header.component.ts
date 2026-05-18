import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: any;
  showUserMenu = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes (reactive updates)
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        console.log('[Header] Current user updated:', user);
      });
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  getDashboardRoute(): string {
    // Return the correct dashboard route based on user role
    if (!this.currentUser) {
      return '/dashboard';
    }

    const role = this.currentUser.role?.toUpperCase();

    switch (role) {
      case 'PATIENT':
        return '/patient/nexus-direct/dashboard';
      case 'DOCTOR':
        return '/doctor/nexus-direct/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/dashboard';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
