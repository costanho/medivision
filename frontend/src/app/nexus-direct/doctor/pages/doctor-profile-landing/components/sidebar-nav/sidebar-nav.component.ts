import { Component, OnInit, OnDestroy, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { NavSection } from '../../services/sidebar-nav.service';

@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-nav.component.html',
  styleUrls: ['./sidebar-nav.component.scss']
})
export class SidebarNavComponent implements OnInit, OnDestroy {
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  // Mobile & Responsive - Initialize early so showDrawer setter can use them
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

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: CONSTRUCTOR & LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  constructor(private router: Router) {}

  ngOnInit(): void {
    console.log('[SidebarNav] ngOnInit called, navSections:', this.navSections);
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

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: RESPONSIVE DETECTION
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: NAVIGATION & MENU CONTROLS
  // ─────────────────────────────────────────────────────────────────────────

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

  logout(): void {
    console.log('[SidebarNav] Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
