import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE SELECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
//
// Purpose: Allow users to select which CareNexus service they want to use
//
// Services available:
// 1. Nexus Direct - In-house doctors, appointments, messaging
// 2. Nexus Proxy - Care for family members
// 3. Nexus Companion - AI chatbot assistance
// 4. (Future) Nexus Connect - External providers
// 5. (Future) Nexus Urgent - Emergency services
//
// Flow:
// 1. User logs in → redirected to /service-selection
// 2. Component displays available services for their role
// 3. User clicks a service → navigates to /patient|doctor/service-name
// 4. That service's dashboard loads
// 5. User can click header to return to service selection

@Component({
  selector: 'app-service-selection',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './service-selection.component.html',
  styleUrls: ['./service-selection.component.scss']
})
export class ServiceSelectionComponent implements OnInit, OnDestroy {

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: COMPONENT STATE
  // ─────────────────────────────────────────────────────────────────────────

  currentRole: string | null = null;
  currentUser: any = null;
  userType: 'patient' | 'doctor' | null = null;

  destroy$ = new Subject<void>();

  // Available services for PATIENT role
  patientServices = [
    {
      id: 'nexus-direct',
      name: 'Nexus Direct',
      icon: '🏥',
      description: 'Find and book appointments with our in-house doctors',
      features: ['Find Doctors', 'Schedule Appointments', 'Message Doctors', 'View Records']
    },
    {
      id: 'nexus-proxy',
      name: 'Nexus Proxy',
      icon: '👨‍👩‍👧‍👦',
      description: 'Manage healthcare for your family members',
      features: ['Add Family Members', 'Manage Dependents', 'Family History', 'Group Booking']
    },
    {
      id: 'nexus-companion',
      name: 'Nexus Companion',
      icon: '🤖',
      description: 'AI-powered health guidance and support',
      features: ['Health Tips', 'Symptom Check', 'Medication Reminders', '24/7 Support']
    }
  ];

  // Available services for DOCTOR role
  doctorServices = [
    {
      id: 'nexus-direct',
      name: 'Nexus Direct',
      icon: '🏥',
      description: 'Manage your patients, appointments, and consultations',
      features: ['View Appointments', 'Manage Patients', 'Message Patients', 'Schedule Management']
    },
    {
      id: 'nexus-companion',
      name: 'Nexus Companion',
      icon: '🤖',
      description: 'AI tools to support your practice',
      features: ['Patient Insights', 'Clinical Support', 'Analytics', 'Documentation Help']
    }
  ];

  // Available services based on role
  availableServices: any[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: CONSTRUCTOR & LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Get current user and role
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.currentUser = this.authService.getCurrentUser();
    this.currentRole = this.authService.getCurrentRole();

    console.log('[ServiceSelection] User:', this.currentUser?.email);
    console.log('[ServiceSelection] Role:', this.currentRole);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Redirect to login if no role (user may not always be available)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!this.currentRole) {
      console.warn('[ServiceSelection] No role found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Set user type and available services based on role
    // Handle both ROLE_* and * formats (backend returns PATIENT, DOCTOR, ADMIN)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (this.currentRole === 'ROLE_DOCTOR' || this.currentRole === 'DOCTOR') {
      this.userType = 'doctor';
      this.availableServices = this.doctorServices;
      console.log('[ServiceSelection] Doctor user - showing doctor services');
    } else if (this.currentRole === 'ROLE_PATIENT' || this.currentRole === 'PATIENT') {
      this.userType = 'patient';
      this.availableServices = this.patientServices;
      console.log('[ServiceSelection] Patient user - showing patient services');
    } else {
      console.warn('[ServiceSelection] Unknown role:', this.currentRole);
      this.router.navigate(['/login']);
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Listen for role changes (in case user logs out or role changes)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.authService.currentUserRole$
      .pipe(takeUntil(this.destroy$))
      .subscribe(role => {
        if (!role) {
          // User logged out
          console.log('[ServiceSelection] User logged out, redirecting to login');
          this.router.navigate(['/login']);
        }
      });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: SERVICE SELECTION LOGIC
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle service selection
   *
   * When user clicks a service card, navigate to that service's dashboard
   * Path: /patient|doctor/{service-id}
   * Example: /patient/nexus-direct
   */
  selectService(service: any): void {
    console.log('[ServiceSelection] Selected service:', service.id, 'for user type:', this.userType);

    // Create route based on user type and service
    const route = `/${this.userType}/${service.id}`;
    console.log('[ServiceSelection] Navigating to:', route);

    // Store selected service for later reference
    localStorage.setItem('selectedService', service.id);
    localStorage.setItem('selectedServiceName', service.name);

    // Navigate to service dashboard
    this.router.navigate([route]);
  }
}
