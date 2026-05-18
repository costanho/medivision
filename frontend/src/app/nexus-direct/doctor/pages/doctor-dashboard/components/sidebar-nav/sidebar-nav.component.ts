import { Component, OnInit, OnDestroy, HostListener, Input } from '@angular/core';
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
  // Mobile & Responsive - Initialize early
  isMobile: boolean = window.innerWidth <= 768;
  isTablet: boolean = window.innerWidth > 768 && window.innerWidth <= 1024;
  screenWidth: number = window.innerWidth;
  sidebarCollapsed: boolean = false;
  sidebarOpen: boolean = false;

  @Input() set showDrawer(value: boolean) {
    console.log('[SidebarNav] showDrawer setter called with value:', value, 'isMobile:', this.isMobile, 'isTablet:', this.isTablet);
    if (this.isMobile || this.isTablet) {
      this.sidebarOpen = value;
      console.log('[SidebarNav] Sidebar state changed, sidebarOpen:', this.sidebarOpen);
    }
  }

  // Navigation data from parent component
  @Input() navSections: NavSection[] = [];
  isCareNexusExpanded: boolean = false;

  // RxJS cleanup
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private location: Location) {}

  ngOnInit(): void {
    console.log('[SidebarNav] ngOnInit called');
    console.log('[SidebarNav] navSections received:', this.navSections);
    console.log('[SidebarNav] navSections length:', this.navSections?.length || 0);
    if (this.navSections && this.navSections.length > 0) {
      this.navSections.forEach((s, i) => {
        console.log(`[SidebarNav] Section ${i}: ${s.name}, items: ${s.items?.map(it => it.label).join(', ')}`);
      });
    }
    this.detectScreenSize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.detectScreenSize();
  }

  private detectScreenSize(): void {
    this.screenWidth = window.innerWidth;
    this.isMobile = this.screenWidth <= 768;
    this.isTablet = this.screenWidth > 768 && this.screenWidth <= 1024;

    // On desktop: keep normal expanded state
    if (!this.isMobile && !this.isTablet) {
      this.sidebarCollapsed = false;
      this.sidebarOpen = true;
    } else {
      // On mobile/tablet: close sidebar (it only opens when menu is clicked)
      this.sidebarOpen = false;
    }

    console.log('[SidebarNav] Screen detected:', {
      width: this.screenWidth,
      isMobile: this.isMobile,
      isTablet: this.isTablet,
      sidebarCollapsed: this.sidebarCollapsed,
      sidebarOpen: this.sidebarOpen
    });
  }

  toggleCareNexus(): void {
    this.isCareNexusExpanded = !this.isCareNexusExpanded;
    console.log('[SidebarNav] CareNexus menu expanded:', this.isCareNexusExpanded);
  }

  toggleSidebarCollapse(): void {
    // On mobile/tablet: toggle drawer open/close
    // On desktop: toggle collapsed width
    if (this.isMobile || this.isTablet) {
      this.sidebarOpen = !this.sidebarOpen;
      console.log('[SidebarNav] Sidebar drawer open:', this.sidebarOpen);
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      console.log('[SidebarNav] Sidebar collapsed:', this.sidebarCollapsed);
    }
  }

  closeSidebarMobile(): void {
    this.sidebarOpen = false;
  }

  navigateTo(route: string | undefined): void {
    console.log('[SidebarNav.navigateTo] Called with route:', route, 'Type:', typeof route);
    if (route) {
      console.log('[SidebarNav.navigateTo] ✓ Valid route detected, attempting navigation to:', route);
      this.router.navigate([route]).then(
        (success) => {
          console.log('[SidebarNav.navigateTo] ✓ Navigation success:', success);
          console.log('[SidebarNav.navigateTo] Current URL after navigation:', window.location.href);
        },
        (error) => {
          console.error('[SidebarNav.navigateTo] ✗ Navigation failed. Error:', error);
          console.error('[SidebarNav.navigateTo] Router state:', this.router.routerState);
        }
      );
      // Close sidebar on mobile/tablet after navigation
      if (this.isMobile || this.isTablet) {
        this.closeSidebarMobile();
      }
    } else {
      console.warn('[SidebarNav.navigateTo] ✗ No route provided - route is:', route);
    }
  }

  logout(): void {
    console.log('[SidebarNav] Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  goBack(): void {
    console.log('[SidebarNav] Going back...');
    this.location.back();
  }
}
