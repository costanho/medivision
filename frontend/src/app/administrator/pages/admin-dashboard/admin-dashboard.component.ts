import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { AdminHeaderComponent } from '../../components/admin-header/admin-header.component';
import { AdminSidebarComponent } from '../../components/admin-sidebar/admin-sidebar.component';
import { StatsGridComponent, StatCard } from './components/stats-grid.component';
import { RecentActivityComponent, Activity } from './components/recent-activity.component';
import { QuickActionsComponent, QuickAction } from './components/quick-actions.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AdminHeaderComponent,
    AdminSidebarComponent,
    StatsGridComponent,
    RecentActivityComponent,
    QuickActionsComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  currentRole: string | null = null;
  showSidebar: boolean = false;

  // Dashboard stats
  stats: StatCard[] = [
    { label: 'Total Users', value: '1,234', icon: 'fa-users', color: '#667eea', change: '+12%' },
    { label: 'Active Doctors', value: '156', icon: 'fa-user-md', color: '#764ba2', change: '+8%' },
    { label: 'Active Patients', value: '892', icon: 'fa-user-injured', color: '#f093fb', change: '+15%' },
    { label: 'Total Revenue', value: '$54,320', icon: 'fa-dollar-sign', color: '#4caf50', change: '+23%' }
  ];

  recentActivities: Activity[] = [
    {
      title: 'New Doctor Registration',
      description: 'Dr. Sarah Johnson registered as Cardiologist',
      timestamp: '5 minutes ago',
      icon: 'fa-user-plus',
      type: 'success'
    },
    {
      title: 'Payment Received',
      description: 'Payment of $150 received from John Doe',
      timestamp: '15 minutes ago',
      icon: 'fa-dollar-sign',
      type: 'info'
    },
    {
      title: 'System Alert',
      description: 'High server load detected',
      timestamp: '1 hour ago',
      icon: 'fa-exclamation-triangle',
      type: 'warning'
    },
    {
      title: 'User Account Suspended',
      description: 'Account suspended due to policy violation',
      timestamp: '2 hours ago',
      icon: 'fa-ban',
      type: 'danger'
    }
  ];

  quickActions: QuickAction[] = [
    { icon: 'fa-user-injured', label: 'Manage Patients', route: '/admin/patients' },
    { icon: 'fa-user-md', label: 'Manage Doctors', route: '/admin/doctors' },
    { icon: 'fa-credit-card', label: 'View Transactions', route: '/admin/payments/transactions' },
    { icon: 'fa-chart-line', label: 'View Analytics', route: '/admin/analytics/users' },
    { icon: 'fa-cog', label: 'System Settings', route: '/admin/settings' },
    { icon: 'fa-clipboard-list', label: 'Activity Logs', route: '/admin/logs' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.currentRole = this.authService.getCurrentRole();

    console.log('[AdminDashboard] User:', this.currentUser?.email);
    console.log('[AdminDashboard] Role:', this.currentRole);

    // Redirect if not admin
    if (!this.currentRole || (this.currentRole !== 'ROLE_ADMIN' && this.currentRole !== 'ADMIN')) {
      console.warn('[AdminDashboard] Unauthorized access');
      this.router.navigate(['/login']);
      return;
    }

    // Listen for logout
    this.authService.currentUserRole$
      .pipe(takeUntil(this.destroy$))
      .subscribe(role => {
        if (!role) {
          this.router.navigate(['/login']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
