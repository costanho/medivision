import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface Service {
  id: string;
  name: string;
  icon: string;
  isAvailable: boolean;
}

@Component({
  selector: 'app-service-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './service-header.component.html',
  styleUrls: ['./service-header.component.scss']
})
export class ServiceHeaderComponent implements OnInit {

  currentUser: any = null;
  currentRole: string | null = null;
  currentService: string | null = null;
  userType: 'patient' | 'doctor' | null = null;

  showServiceMenu = false;

  // Available services
  patientServices: Service[] = [
    { id: 'nexus-direct', name: 'Nexus Direct', icon: '🏥', isAvailable: true },
    { id: 'nexus-proxy', name: 'Nexus Proxy', icon: '👨‍👩‍👧‍👦', isAvailable: true },
    { id: 'nexus-companion', name: 'Nexus Companion', icon: '🤖', isAvailable: true }
  ];

  doctorServices: Service[] = [
    { id: 'nexus-direct', name: 'Nexus Direct', icon: '🏥', isAvailable: true },
    { id: 'nexus-companion', name: 'Nexus Companion', icon: '🤖', isAvailable: true }
  ];

  availableServices: Service[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get current user info
    this.currentUser = this.authService.getCurrentUser();
    this.currentRole = this.authService.getCurrentRole();

    // Get current service from localStorage
    this.currentService = localStorage.getItem('selectedService') || 'nexus-direct';

    // Set user type and available services
    if (this.currentRole === 'ROLE_DOCTOR') {
      this.userType = 'doctor';
      this.availableServices = this.doctorServices;
    } else if (this.currentRole === 'ROLE_PATIENT') {
      this.userType = 'patient';
      this.availableServices = this.patientServices;
    }

    console.log('[ServiceHeader] Loaded for user type:', this.userType, 'with service:', this.currentService);
  }

  /**
   * Navigate to selected service
   */
  switchService(serviceId: string): void {
    if (!this.userType) return;

    console.log('[ServiceHeader] Switching to service:', serviceId);

    // Store selected service
    localStorage.setItem('selectedService', serviceId);

    // Navigate to service dashboard
    const route = `/${this.userType}/${serviceId}`;
    this.router.navigate([route]);

    // Close menu
    this.showServiceMenu = false;
  }

  /**
   * Toggle service menu
   */
  toggleServiceMenu(): void {
    this.showServiceMenu = !this.showServiceMenu;
  }

  /**
   * Close service menu
   */
  closeServiceMenu(): void {
    this.showServiceMenu = false;
  }

  /**
   * Get current service name
   */
  getCurrentServiceName(): string {
    const service = this.availableServices.find(s => s.id === this.currentService);
    return service ? service.name : 'Services';
  }

  /**
   * Logout user
   */
  logout(): void {
    console.log('[ServiceHeader] Logging out user');
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
