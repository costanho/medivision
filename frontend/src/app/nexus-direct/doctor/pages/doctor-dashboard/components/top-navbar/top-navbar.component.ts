import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-top-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-navbar.component.html',
  styleUrls: ['./top-navbar.component.scss'],
  host: { 'ngSkipHydration': '' }
})
export class TopNavbarComponent implements OnInit {
  @Input() currentUser: any = null;
  @Input() appointmentBadge: number = 0;
  @Input() messageBadge: number = 0;
  @Output() sidebarToggle = new EventEmitter<void>();

  // Mobile & Responsive
  isMobileMenuOpen: boolean = false;
  isSearchOpen: boolean = false;
  screenWidth: number = 0;
  isMobile: boolean = false;
  isTablet: boolean = false;
  isIonic: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.detectScreenSize();
    this.detectIonicPlatform();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.detectScreenSize();
  }

  private detectScreenSize(): void {
    this.screenWidth = window.innerWidth;
    this.isMobile = this.screenWidth <= 768;
    this.isTablet = this.screenWidth > 768 && this.screenWidth <= 1024;

    // Close mobile menu on resize to desktop
    if (!this.isMobile && this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  private detectIonicPlatform(): void {
    this.isIonic = !!(window as any).Capacitor || !!(window as any).cordova;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    console.log('[TopNavbar] Menu toggled, isMobileMenuOpen:', this.isMobileMenuOpen, 'isMobile:', this.isMobile, 'isTablet:', this.isTablet);
    this.isSearchOpen = false;
    console.log('[TopNavbar] Emitting sidebarToggle event');
    this.sidebarToggle.emit();
  }

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
    if (this.isSearchOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  getInitials(): string {
    const name = this.currentUser?.fullName || 'D';
    return name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvatarColor(): string {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4caf50'];
    const charCode = this.currentUser?.email?.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  }

  getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    const styles = getComputedStyle(document.documentElement);
    return {
      top: parseInt(styles.getPropertyValue('--safe-area-inset-top')) || 0,
      bottom: parseInt(styles.getPropertyValue('--safe-area-inset-bottom')) || 0,
      left: parseInt(styles.getPropertyValue('--safe-area-inset-left')) || 0,
      right: parseInt(styles.getPropertyValue('--safe-area-inset-right')) || 0
    };
  }

  logout(): void {
    console.log('[TopNavbar] Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  navigateToMessages(): void {
    console.log('[TopNavbar] Navigating to messages...');
    this.router.navigate(['/doctor/nexus-direct/messages']);
    this.closeMobileMenu();
  }

  navigateToAppointments(): void {
    console.log('[TopNavbar] Navigating to appointments...');
    this.router.navigate(['/doctor/nexus-direct/appointments']);
    this.closeMobileMenu();
  }
}
