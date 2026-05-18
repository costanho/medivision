import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface DashboardStats {
  appointmentsToday: number;
  pendingConsultations: number;
  newMessages: number;
  totalPatients: number;
  avgRating: number;
  monthlyEarnings: number;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.scss']
})
export class DashboardOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: any = null;
  today = new Date();
  stats: DashboardStats = {
    appointmentsToday: 0,
    pendingConsultations: 0,
    newMessages: 0,
    totalPatients: 0,
    avgRating: 0,
    monthlyEarnings: 0
  };

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadDashboardStats();
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
        console.log('[DashboardOverview] Current user:', this.currentUser);
      });
  }

  private loadDashboardStats(): void {
    // Mock data - in production, this would come from backend APIs
    this.stats = {
      appointmentsToday: 5,
      pendingConsultations: 3,
      newMessages: 7,
      totalPatients: 142,
      avgRating: 4.8,
      monthlyEarnings: 8500
    };
    console.log('[DashboardOverview] Stats loaded:', this.stats);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }
}
