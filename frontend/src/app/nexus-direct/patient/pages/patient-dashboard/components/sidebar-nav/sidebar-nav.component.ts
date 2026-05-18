import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

interface NavSection {
  name?: string;
  items: Array<{
    label: string;
    icon: string;
    route?: string;
    children?: Array<{
      label: string;
      icon: string;
      route?: string;
    }>;
  }>;
}

@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-nav.component.html',
  styleUrls: ['./sidebar-nav.component.scss']
})
export class SidebarNavComponent implements OnInit, OnDestroy {
  isMobile: boolean = window.innerWidth <= 768;
  isTablet: boolean = window.innerWidth > 768 && window.innerWidth <= 1024;
  screenWidth: number = window.innerWidth;
  sidebarCollapsed: boolean = false;
  sidebarOpen: boolean = false;

  @Input() navSections: NavSection[] = [];
  @Input() set showDrawer(value: boolean) {
    if (this.isMobile || this.isTablet) {
      this.sidebarOpen = value;
    }
  }

  @Output() sidebarToggle = new EventEmitter<void>();

  expandedSections: { [key: number]: boolean } = {};
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private location: Location) {}

  ngOnInit(): void {
    this.detectScreenSize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private detectScreenSize(): void {
    this.screenWidth = window.innerWidth;
    this.isMobile = this.screenWidth <= 768;
    this.isTablet = this.screenWidth > 768 && this.screenWidth <= 1024;

    if (!this.isMobile && !this.isTablet) {
      this.sidebarCollapsed = false;
      this.sidebarOpen = true;
    } else {
      this.sidebarOpen = false;
    }
  }

  toggleSection(index: number): void {
    this.expandedSections[index] = !this.expandedSections[index];
  }

  navigateTo(route?: string): void {
    if (route) {
      console.log('[PatientDashboardSidebar] Navigating to:', route);
      this.router.navigate([route]);
      if (this.isMobile || this.isTablet) {
        this.sidebarOpen = false;
      }
    }
  }

  logout(): void {
    console.log('[PatientDashboardSidebar] Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  goBack(): void {
    console.log('[PatientDashboardSidebar] Going back...');
    this.location.back();
  }
}
