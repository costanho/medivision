import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { TopNavbarComponent } from '../patient-profile-landing/components/top-navbar/top-navbar.component';
import { DashboardSidebarComponent } from './components/dashboard-sidebar/dashboard-sidebar.component';
import { QuickStatsComponent } from './components/quick-stats/quick-stats.component';
import { RecentActivityComponent } from './components/recent-activity/recent-activity.component';
import { AuthService } from '../../../../core/services/auth.service';
import { PatientService } from '../../../services/patient.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TopNavbarComponent, DashboardSidebarComponent, QuickStatsComponent, RecentActivityComponent],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: any = null;
  sidebarOpen: boolean = false;
  activeComponent: string = 'dashboard'; // Track which component to show

  constructor(private authService: AuthService, private patientService: PatientService, private router: Router) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.preloadPatientData();
    this.detectRoute();
  }

  // Pre-load patient data when dashboard initializes
  private preloadPatientData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.email) {
      console.log('[PatientDashboard] Pre-loading patient data for:', currentUser.email);
      this.patientService.loadAndCachePatientByEmail(currentUser.email)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (patient) => {
            console.log('[PatientDashboard] ✅ Patient data pre-loaded and cached successfully');
            console.log('[PatientDashboard] Cached patient object:', patient);
          },
          error: (err) => {
            console.warn('[PatientDashboard] ⚠️ Failed to pre-load patient data:', err);
            // This is not critical - profile will handle its own loading if needed
          }
        });
    } else {
      console.warn('[PatientDashboard] ⚠️ No current user available for pre-loading');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        console.log('[PatientDashboard] currentUser loaded from AuthService:', this.currentUser);
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  private detectRoute(): void {
    // Listen to route changes to determine which component should be displayed
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;

        // Extract the active component from the URL
        // Routes are now: /patient/nexus-direct/dashboard/<component>
        // e.g., /patient/nexus-direct/dashboard/profile, /patient/nexus-direct/dashboard/appointments
        const match = url.match(/\/patient\/nexus-direct\/dashboard\/([\w-]+)/);
        if (match) {
          this.activeComponent = match[1];
        } else {
          this.activeComponent = 'dashboard';
        }
      });
  }
}
