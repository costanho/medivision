import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fromEvent } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrls: ['./dashboard-sidebar.component.scss']
})
export class DashboardSidebarComponent implements OnInit, OnDestroy {
  isMobile: boolean = window.innerWidth <= 768;
  isTablet: boolean = window.innerWidth > 768 && window.innerWidth <= 1024;
  isSmallPhone: boolean = window.innerWidth <= 480;
  screenWidth: number = window.innerWidth;
  sidebarOpen: boolean = false;

  @Input() currentUser: any = null;
  @Input() set showDrawer(value: boolean) {
    // Always update sidebarOpen from parent
    this.sidebarOpen = value;
  }

  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() closeDrawer = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  navigationItems: NavItem[] = [
    {
      label: 'Start Call',
      icon: 'fas fa-phone',
      path: 'call'
    },
    {
      label: 'Profile',
      icon: 'fas fa-user',
      path: 'profile'
    },
    {
      label: 'Medical Records',
      icon: 'fas fa-file-alt',
      path: 'medical-records'
    },
    {
      label: 'Doctors',
      icon: 'fas fa-user-md',
      path: 'doctors'
    },
    {
      label: 'Appointments',
      icon: 'fas fa-calendar',
      path: 'appointments'
    },
    {
      label: 'Messages',
      icon: 'fas fa-comments',
      path: 'messages',
      badge: 3
    },
    {
      label: 'Billing & Payments',
      icon: 'fas fa-credit-card',
      path: 'billing'
    },
    {
      label: 'Reports',
      icon: 'fas fa-chart-line',
      path: 'reports'
    },
    {
      label: 'Settings',
      icon: 'fas fa-cog',
      path: 'settings'
    }
  ];

  constructor(private router: Router, private location: Location, private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    this.detectScreenSize();
    // Listen for window resize events
    fromEvent(window, 'resize')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.detectScreenSize());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private detectScreenSize(): void {
    this.screenWidth = window.innerWidth;
    const wasMobile = this.isMobile;
    const wasTablet = this.isTablet;

    this.isMobile = this.screenWidth <= 768;
    this.isTablet = this.screenWidth > 768 && this.screenWidth <= 1024;
    this.isSmallPhone = this.screenWidth <= 480;

    // Auto-hide sidebar when transitioning to mobile/tablet
    if ((this.isMobile || this.isTablet) && (!wasMobile && !wasTablet)) {
      this.sidebarOpen = false;
    }

    // Auto-show sidebar when transitioning to desktop
    if (!this.isMobile && !this.isTablet && (wasMobile || wasTablet)) {
      this.sidebarOpen = true;
    }
  }

  toggleSidebarMobile(): void {
    if (this.isMobile || this.isTablet) {
      this.sidebarOpen = !this.sidebarOpen;
    }
  }

  closeSidebarMobile(): void {
    this.sidebarOpen = false;
  }

  selectNavItem(path: string): void {
    console.log('[DashboardSidebar] selectNavItem called with path:', path);

    // Navigate to dashboard child routes using relative navigation
    // Routes are under: /patient/nexus-direct/dashboard/*
    console.log('[DashboardSidebar] Navigating to: dashboard/', path);
    this.router.navigate(['dashboard', path], { relativeTo: this.activatedRoute });

    // Close sidebar on mobile after selection
    if (this.isMobile || this.isTablet) {
      console.log('[DashboardSidebar] Closing mobile sidebar');
      this.closeSidebarMobile();
      this.closeDrawer.emit();
    }
  }

  logout(): void {
    console.log('[DashboardSidebar] Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  goBack(): void {
    console.log('[DashboardSidebar] Going back...');
    this.location.back();
  }
}
