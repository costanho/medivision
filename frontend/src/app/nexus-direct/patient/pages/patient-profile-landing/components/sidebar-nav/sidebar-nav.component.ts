import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fromEvent } from 'rxjs';

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
  isSmallPhone: boolean = window.innerWidth <= 480;
  screenWidth: number = window.innerWidth;
  sidebarCollapsed: boolean = false;
  sidebarOpen: boolean = false;

  @Input() set showDrawer(value: boolean) {
    if (this.isMobile || this.isTablet) {
      this.sidebarOpen = value;
    }
  }

  @Output() serviceSelected = new EventEmitter<string>();

  isCareNexusExpanded: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(private router: Router, private location: Location) {}

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
      this.sidebarCollapsed = false;
    }
  }

  toggleCareNexus(): void {
    this.isCareNexusExpanded = !this.isCareNexusExpanded;
  }

  toggleSidebarMobile(): void {
    if (this.isMobile || this.isTablet) {
      this.sidebarOpen = !this.sidebarOpen;
    }
  }

  closeSidebarMobile(): void {
    this.sidebarOpen = false;
  }

  selectServiceById(serviceId: string): void {
    console.log('[PatientSidebarNav] Service selected:', serviceId);
    this.serviceSelected.emit(serviceId);
    // Close sidebar on mobile after selection
    if (this.isMobile || this.isTablet) {
      this.closeSidebarMobile();
    }
  }

  logout(): void {
    console.log('[PatientSidebarNav] Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  goBack(): void {
    console.log('[PatientSidebarNav] Going back...');
    this.location.back();
  }
}
