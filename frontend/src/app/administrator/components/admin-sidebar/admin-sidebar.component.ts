import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fromEvent } from 'rxjs';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss']
})
export class AdminSidebarComponent implements OnInit, OnDestroy {
  isMobile: boolean = window.innerWidth <= 768;
  isTablet: boolean = window.innerWidth > 768 && window.innerWidth <= 1024;
  isSmallPhone: boolean = window.innerWidth <= 480;
  screenWidth: number = window.innerWidth;
  sidebarCollapsed: boolean = false;
  sidebarOpen: boolean = false;

  @Input() set showDrawer(value: boolean) {
    if (this.isMobile || this.isTablet) {
      this.sidebarOpen = value;
    }
  }

  @Output() menuSelected = new EventEmitter<string>();

  isUserManagementExpanded: boolean = false;
  isPaymentsExpanded: boolean = false;
  isAnalyticsExpanded: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(private router: Router, private location: Location) {}

  ngOnInit(): void {
    this.detectScreenSize();
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

    if ((this.isMobile || this.isTablet) && (!wasMobile && !wasTablet)) {
      this.sidebarOpen = false;
    }

    if (!this.isMobile && !this.isTablet && (wasMobile || wasTablet)) {
      this.sidebarOpen = true;
      this.sidebarCollapsed = false;
    }
  }

  toggleUserManagement(): void {
    this.isUserManagementExpanded = !this.isUserManagementExpanded;
  }

  togglePayments(): void {
    this.isPaymentsExpanded = !this.isPaymentsExpanded;
  }

  toggleAnalytics(): void {
    this.isAnalyticsExpanded = !this.isAnalyticsExpanded;
  }

  toggleSidebarMobile(): void {
    if (this.isMobile || this.isTablet) {
      this.sidebarOpen = !this.sidebarOpen;
    }
  }

  closeSidebarMobile(): void {
    this.sidebarOpen = false;
  }

  navigateTo(route: string): void {
    console.log('[AdminSidebar] Navigating to:', route);
    this.router.navigate([route]);
    if (this.isMobile || this.isTablet) {
      this.closeSidebarMobile();
    }
  }

  logout(): void {
    console.log('[AdminSidebar] Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  goBack(): void {
    console.log('[AdminSidebar] Going back...');
    this.location.back();
  }
}
