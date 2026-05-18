import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { TopNavbarComponent } from './components/top-navbar/top-navbar.component';
import { SidebarNavComponent } from './components/sidebar-nav/sidebar-nav.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT PROFILE LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════
//
// Purpose: Role-specific landing page for patients after login
//
// Features:
// 1. User profile section with avatar, name, role badge
// 2. Quick stats (total appointments, doctors, messages)
// 3. Available services grid with icons
// 4. Recent activity section
// 5. Quick action buttons
//
// Flow:
// 1. User logs in → redirected to /patient/profile
// 2. Component displays patient profile and available services
// 3. User can click a service to navigate to that service's dashboard
// 4. Or use quick actions to access profile/settings

@Component({
  selector: 'app-patient-profile-landing',
  standalone: true,
  imports: [CommonModule, TopNavbarComponent, SidebarNavComponent],
  templateUrl: './patient-profile-landing.component.html',
  styleUrls: ['./patient-profile-landing.component.scss']
})
export class PatientProfileLandingComponent implements OnInit, OnDestroy {

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: COMPONENT STATE
  // ─────────────────────────────────────────────────────────────────────────

  currentUser: any = null;
  currentRole: string | null = null;
  destroy$ = new Subject<void>();

  // Sidebar state
  showSidebarDrawer: boolean = false;

  // Navigation state
  isCareNexusExpanded: boolean = false;

  // Mobile & Ionic Platform Detection
  isMobileDevice: boolean = false;
  isIonicApp: boolean = false;
  screenWidth: number = 0;
  isSmallPhone: boolean = false; // iPhone SE, 375px and below

  // Patient stats
  stats = [
    { label: 'Upcoming Appointments', value: '3', icon: '📅', color: '#667eea' },
    { label: 'Connected Doctors', value: '5', icon: '👨‍⚕️', color: '#764ba2' },
    { label: 'Unread Messages', value: '2', icon: '💬', color: '#f093fb' },
    { label: 'Total Appointments', value: '12', icon: '✅', color: '#4caf50' }
  ];

  // Available services for patient
  availableServices = [
    {
      id: 'carenexus-direct',
      name: 'CareNexus Direct',
      icon: 'fas fa-hospital-user',
      description: 'Subscription-based primary care',
      features: ['Find Doctors', 'Schedule Appointments', 'Message Doctors', 'View Records']
    },
    {
      id: 'carenexus-connect',
      name: 'CareNexus Connect',
      icon: 'fas fa-link',
      description: 'Third-party booking interface',
      features: ['Multi-Provider Integration', 'Easy Scheduling', 'Unified Dashboard', 'Cross-Platform Support']
    },
    {
      id: 'carenexus-urgent',
      name: 'CareNexus Urgent',
      icon: 'fas fa-ambulance',
      description: 'Emergency triage & dispatch',
      features: ['Emergency Response', 'Triage Assessment', 'Dispatch Services', '24/7 Availability']
    },
    {
      id: 'carenexus-proxy',
      name: 'CareNexus Proxy',
      icon: 'fas fa-people-group',
      description: 'Care orchestration by others',
      features: ['Delegate Care', 'Family Management', 'Proxy Access', 'Shared Records']
    },
    {
      id: 'carenexus-learn',
      name: 'CareNexus Learn',
      icon: 'fas fa-book',
      description: 'Education & training hub',
      features: ['Health Courses', 'Expert Guides', 'Wellness Training', 'Certification Programs']
    },
    {
      id: 'carenexus-claims',
      name: 'CareNexus Claims',
      icon: 'fas fa-clipboard',
      description: 'Insurance claim gateway',
      features: ['Submit Claims', 'Track Status', 'Documentation', 'Insurance Integration']
    }
  ];

  // Quick actions
  quickActions = [
    { label: 'Edit Profile', icon: '✏️', action: 'editProfile' },
    { label: 'My Appointments', icon: '📅', action: 'appointments' },
    { label: 'Messages', icon: '💬', action: 'messages' },
    { label: 'Settings', icon: '⚙️', action: 'settings' }
  ];

  // Recent activity
  recentActivity = [
    {
      title: 'Appointment Confirmed',
      description: 'Dr. Sarah Johnson - Cardiology',
      date: 'Nov 25, 2025 • 2:00 PM',
      icon: '✅',
      status: 'confirmed'
    },
    {
      title: 'New Message',
      description: 'Dr. Michael Chen sent you a message',
      date: 'Nov 21, 2025',
      icon: '💬',
      status: 'new'
    },
    {
      title: 'Appointment Scheduled',
      description: 'Dr. Emily Watson - General Checkup',
      date: 'Nov 20, 2025',
      icon: '📅',
      status: 'scheduled'
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
    // Get current user from BehaviorSubject (may be null initially)
    this.currentUser = this.authService.getCurrentUser();

    // Get role from both sources
    this.currentRole = this.authService.getCurrentRole();
    const roleFromStorage = localStorage.getItem('userRole');

    console.log('[PatientProfileLanding] Initialization:');
    console.log('  - User:', this.currentUser?.email || 'NOT_LOADED');
    console.log('  - Role from service:', this.currentRole);
    console.log('  - Role from localStorage:', roleFromStorage);

    // 🔍 DEBUG: Check what properties are available in currentUser
    if (this.currentUser) {
      console.log('[PatientProfileLanding] User properties:');
      console.log('  - fullName:', this.currentUser.fullName);
      console.log('  - email:', this.currentUser.email);
      console.log('  - All keys:', Object.keys(this.currentUser));
    } else {
      console.warn('[PatientProfileLanding] ⚠️ currentUser is NULL - may still be loading');
    }

    // Detect mobile platform
    this.detectMobileDevice();
    this.detectIonicApp();

    // Check authorization: look for role in service OR localStorage
    const hasValidRole = (this.currentRole === 'PATIENT' || this.currentRole === 'ROLE_PATIENT' || roleFromStorage === 'PATIENT' || roleFromStorage === 'ROLE_PATIENT');

    if (!hasValidRole) {
      console.warn('[PatientProfileLanding] ⚠️ No valid patient role found:');
      console.warn('  - currentRole:', this.currentRole);
      console.warn('  - roleFromStorage:', roleFromStorage);
      console.warn('  - Expected: PATIENT or ROLE_PATIENT');

      // Wait a moment for role to be loaded, then check again
      setTimeout(() => {
        const updatedRole = this.authService.getCurrentRole();
        const updatedRoleFromStorage = localStorage.getItem('userRole');
        const finalCheck = (updatedRole === 'PATIENT' || updatedRole === 'ROLE_PATIENT' || updatedRoleFromStorage === 'PATIENT' || updatedRoleFromStorage === 'ROLE_PATIENT');

        if (!finalCheck) {
          console.error('[PatientProfileLanding] Still no valid role, redirecting to login');
          this.router.navigate(['/login']);
        } else {
          console.log('[PatientProfileLanding] ✓ Role loaded after timeout:', updatedRole || updatedRoleFromStorage);
          this.currentRole = updatedRole || updatedRoleFromStorage;
        }
      }, 500);
    } else {
      console.log('[PatientProfileLanding] ✓ Valid role found:', this.currentRole || roleFromStorage);
    }

    // Listen for logout (role becomes null/undefined)
    this.authService.currentUserRole$
      .pipe(takeUntil(this.destroy$))
      .subscribe(role => {
        console.log('[PatientProfileLanding] Role changed to:', role);
        if (!role) {
          this.router.navigate(['/login']);
        } else {
          this.currentRole = role;
        }
      });

    console.log('[PatientProfileLanding] Setup complete - Mobile Device:', this.isMobileDevice, 'Ionic App:', this.isIonicApp);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: SERVICE NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  selectService(service: any): void {
    console.log('[PatientProfileLanding] Selected service:', service.id);
    console.log('[PatientProfileLanding] Current authentication state:');
    console.log('  - isAuthenticated():', this.authService.isAuthenticated());
    console.log('  - Token:', localStorage.getItem('accessToken') ? 'EXISTS' : 'MISSING');
    console.log('  - User:', this.authService.getCurrentUser());

    // Map service IDs to actual routes
    let route = `/patient/${service.id}`;

    // Special handling for CareNexus Direct - route to nexus-direct (lazy-loads dashboard)
    if (service.id === 'carenexus-direct') {
      route = '/patient/nexus-direct';
    }

    localStorage.setItem('selectedService', service.id);
    localStorage.setItem('selectedServiceName', service.name);

    console.log('[PatientProfileLanding] Navigating to:', route);
    this.router.navigate([route]);
  }

  selectServiceById(serviceId: string): void {
    const service = this.availableServices.find(s => s.id === serviceId);
    if (service) {
      this.selectService(service);
    } else {
      console.error('[PatientProfileLanding] Service not found:', serviceId);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: QUICK ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  handleQuickAction(action: string): void {
    console.log('[PatientProfileLanding] Quick action:', action);

    switch (action) {
      case 'editProfile':
        this.router.navigate(['/patient/nexus-direct/profile']);
        break;
      case 'appointments':
        this.router.navigate(['/patient/nexus-direct/appointments']);
        break;
      case 'messages':
        this.router.navigate(['/patient/nexus-direct/messages']);
        break;
      case 'settings':
        this.router.navigate(['/patient/nexus-direct/settings']);
        break;
      default:
        console.warn('[PatientProfileLanding] Unknown action:', action);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4.5: NAVIGATION TOGGLES
  // ─────────────────────────────────────────────────────────────────────────

  toggleCareNexus(): void {
    this.isCareNexusExpanded = !this.isCareNexusExpanded;
    console.log('[PatientProfileLanding] CareNexus menu expanded:', this.isCareNexusExpanded);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  getInitials(): string {
    const name = this.currentUser?.fullName || 'U';
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

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6: MOBILE & IONIC SUPPORT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Detect if running on a mobile device
   * Checks for common mobile user agents and platform info
   */
  private detectMobileDevice(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobilePatterns = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const maxTouchPoints = navigator.maxTouchPoints || 0;

    this.isMobileDevice = mobilePatterns.test(userAgent) || maxTouchPoints > 0;
    this.screenWidth = window.innerWidth;
    this.isSmallPhone = this.screenWidth <= 375;

    console.log('[PatientProfileLanding] Mobile Detection:', {
      userAgent: userAgent.substring(0, 50),
      isMobile: this.isMobileDevice,
      maxTouchPoints: maxTouchPoints,
      screenWidth: this.screenWidth
    });
  }

  /**
   * Detect if running as an Ionic application
   * Checks for Ionic's capacitor or cordova APIs
   */
  private detectIonicApp(): void {
    // Check for Ionic Capacitor (modern Ionic)
    this.isIonicApp = !!(window as any).CapacitorConsoleHandler || !!(window as any).Capacitor;

    // Check for Cordova (legacy)
    if (!this.isIonicApp && (window as any).cordova) {
      this.isIonicApp = true;
    }

    console.log('[PatientProfileLanding] Ionic Detection:', {
      isIonicApp: this.isIonicApp,
      hasCapacitor: !!(window as any).Capacitor,
      hasCordova: !!(window as any).cordova
    });
  }

  /**
   * Listen for window resize events to update responsive state
   * This helps handle orientation changes and window resizing on mobile
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    const newWidth = window.innerWidth;
    if (newWidth !== this.screenWidth) {
      this.screenWidth = newWidth;
      this.isSmallPhone = this.screenWidth <= 375;

      console.log('[PatientProfileLanding] Window resized:', {
        newWidth: this.screenWidth,
        isSmallPhone: this.isSmallPhone,
        isPortrait: window.innerHeight > window.innerWidth,
        isLandscape: window.innerHeight < window.innerWidth
      });
    }
  }

  /**
   * Handle back button on mobile devices
   * If using Ionic with Capacitor, this integrates with hardware back button
   *
   * Future Integration with Ionic:
   * If migrating to Ionic components, integrate with:
   * - Hardware back button: this.backButtonService.registerHandler()
   * - Navigation: ion-nav, ion-router
   * - Menu: ion-menu for sidebar
   */
  handleBackButton(): void {
    console.log('[PatientProfileLanding] Back button pressed');
    this.router.navigate(['/login']);
  }

  /**
   * Prevent zoom on double-tap (mobile browsers)
   * Improves mobile UX by disabling pinch-zoom
   */
  @HostListener('window:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }

  /**
   * Get computed safe area for devices with notches/cutouts
   * Useful for iOS devices with notch
   */
  getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    const safeAreaInsets = getComputedStyle(document.documentElement);
    return {
      top: parseInt(safeAreaInsets.getPropertyValue('--safe-area-inset-top')) || 0,
      bottom: parseInt(safeAreaInsets.getPropertyValue('--safe-area-inset-bottom')) || 0,
      left: parseInt(safeAreaInsets.getPropertyValue('--safe-area-inset-left')) || 0,
      right: parseInt(safeAreaInsets.getPropertyValue('--safe-area-inset-right')) || 0
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 7: SIDEBAR TOGGLE
  // ─────────────────────────────────────────────────────────────────────────

  onNavbarSidebarToggle(): void {
    this.showSidebarDrawer = !this.showSidebarDrawer;
  }
}
