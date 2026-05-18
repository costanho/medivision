import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TopNavbarComponent } from '../patient-profile-landing/components/top-navbar/top-navbar.component';
import { DashboardSidebarComponent } from '../patient-dashboard/components/dashboard-sidebar/dashboard-sidebar.component';
import { ProfileComponent } from '../patient-dashboard/components/profile/profile.component';
import { AuthService } from '../../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-patient-profile-view',
  standalone: true,
  imports: [CommonModule, TopNavbarComponent, DashboardSidebarComponent, ProfileComponent],
  templateUrl: './patient-profile-view.component.html',
  styleUrls: ['./patient-profile-view.component.scss']
})
export class PatientProfileViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: any = null;
  sidebarOpen: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.loadCurrentUser();
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
        console.log('[PatientProfileView] currentUser loaded from AuthService:', this.currentUser);
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}
