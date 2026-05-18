import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import child components
import { WelcomeBannerComponent } from './components/welcome-banner/welcome-banner.component';
import { ServicesGridComponent } from './components/services-grid/services-grid.component';

@Component({
  selector: 'app-doctor-profile-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WelcomeBannerComponent,
    ServicesGridComponent
  ],
  templateUrl: './doctor-profile-landing.component.html',
  styleUrls: ['./doctor-profile-landing.component.scss']
})
export class DoctorProfileLandingComponent implements OnInit, OnDestroy {
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: COMPONENT STATE
  // ─────────────────────────────────────────────────────────────────────────

  currentUser: any = null;
  currentRole: string | null = null;
  destroy$ = new Subject<void>();
  hasChildRoute: boolean = false;

  // Mobile & Ionic Platform Detection
  isMobileDevice: boolean = false;
  isIonicApp: boolean = false;
  screenWidth: number = 0;
  isSmallPhone: boolean = false;

  // Doctor stats
  stats = [
    { label: 'Active Patients', value: '24', icon: 'fa-users', color: '#667eea' },
    { label: "Today's Appointments", value: '6', icon: 'fa-calendar', color: '#764ba2' },
    { label: 'Patient Messages', value: '5', icon: 'fa-comments', color: '#f093fb' },
    { label: 'Total Consultations', value: '248', icon: 'fa-check-circle', color: '#4caf50' }
  ];

  // Available services for doctor
  availableServices = [
    {
      id: 'nexus-direct',
      name: 'Nexus Direct',
      icon: 'fa-hospital',
      description: 'Manage your patients, appointments, and consultations',
      features: ['View Appointments', 'Manage Patients', 'Message Patients', 'Schedule Management']
    },
    {
      id: 'nexus-companion',
      name: 'Nexus Companion',
      icon: 'fa-robot',
      description: 'AI tools to support your practice',
      features: ['Patient Insights', 'Clinical Support', 'Analytics', 'Documentation Help']
    }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: CONSTRUCTOR & LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('[DoctorProfileLanding] Component initialized');

    // Get current user and role
    this.currentUser = this.authService.getCurrentUser();
    this.currentRole = this.authService.getCurrentRole();

    console.log('[DoctorProfileLanding] User:', this.currentUser?.email);
    console.log('[DoctorProfileLanding] Role:', this.currentRole);

    // Detect mobile platform
    this.detectMobileDevice();
    this.detectIonicApp();

    // Redirect to login if no role
    if (!this.currentRole || (this.currentRole !== 'ROLE_DOCTOR' && this.currentRole !== 'DOCTOR')) {
      console.warn('[DoctorProfileLanding] Unauthorized access, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    // Listen for logout
    this.authService.currentUserRole$
      .pipe(takeUntil(this.destroy$))
      .subscribe((role: string | null) => {
        if (!role) {
          this.router.navigate(['/login']);
        }
      });

    // Listen for route changes to detect if a child route is active
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Check if current URL has a child path (e.g., /doctor/nexus-direct/profile/details)
        this.hasChildRoute = this.router.url.includes('/details');
        console.log('[DoctorProfileLanding] hasChildRoute:', this.hasChildRoute);
      });

    console.log('[DoctorProfileLanding] Mobile Device:', this.isMobileDevice);
    console.log('[DoctorProfileLanding] Ionic App:', this.isIonicApp);
    console.log('[DoctorProfileLanding] Screen Width:', this.screenWidth);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: SERVICE NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  selectService(service: any): void {
    console.log('[DoctorProfileLanding] Selected service:', service.id);
    const route = `/doctor/${service.id}`;
    localStorage.setItem('selectedService', service.id);
    localStorage.setItem('selectedServiceName', service.name);
    this.router.navigate([route]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: MOBILE & IONIC SUPPORT
  // ─────────────────────────────────────────────────────────────────────────

  private detectMobileDevice(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobilePatterns = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const maxTouchPoints = navigator.maxTouchPoints || 0;

    this.isMobileDevice = mobilePatterns.test(userAgent) || maxTouchPoints > 0;
    this.screenWidth = window.innerWidth;
    this.isSmallPhone = this.screenWidth <= 375;

    console.log('[DoctorProfileLanding] Mobile Detection:', {
      userAgent: userAgent.substring(0, 50),
      isMobile: this.isMobileDevice,
      maxTouchPoints: maxTouchPoints,
      screenWidth: this.screenWidth
    });
  }

  private detectIonicApp(): void {
    this.isIonicApp = !!(window as any).CapacitorConsoleHandler || !!(window as any).Capacitor;

    if (!this.isIonicApp && (window as any).cordova) {
      this.isIonicApp = true;
    }

    console.log('[DoctorProfileLanding] Ionic Detection:', {
      isIonicApp: this.isIonicApp,
      hasCapacitor: !!(window as any).Capacitor,
      hasCordova: !!(window as any).cordova
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const newWidth = window.innerWidth;
    if (newWidth !== this.screenWidth) {
      this.screenWidth = newWidth;
      this.isSmallPhone = this.screenWidth <= 375;

      console.log('[DoctorProfileLanding] Window resized:', {
        newWidth: this.screenWidth,
        isSmallPhone: this.isSmallPhone,
        isPortrait: window.innerHeight > window.innerWidth,
        isLandscape: window.innerHeight < window.innerWidth
      });
    }
  }

  handleBackButton(): void {
    console.log('[DoctorProfileLanding] Back button pressed');
    this.router.navigate(['/login']);
  }

  @HostListener('window:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }

  getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    const safeAreaInsets = getComputedStyle(document.documentElement);
    return {
      top: parseInt(safeAreaInsets.getPropertyValue('--safe-area-inset-top')) || 0,
      bottom: parseInt(safeAreaInsets.getPropertyValue('--safe-area-inset-bottom')) || 0,
      left: parseInt(safeAreaInsets.getPropertyValue('--safe-area-inset-left')) || 0,
      right: parseInt(safeAreaInsets.getPropertyValue('--safe-area-inset-right')) || 0
    };
  }
}
