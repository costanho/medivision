import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TopNavbarComponent } from './pages/doctor-dashboard/components/top-navbar/top-navbar.component';
import { SidebarNavComponent } from './pages/doctor-dashboard/components/sidebar-nav/sidebar-nav.component';
import { AuthService } from '../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  selector: 'app-doctor-service-wrapper',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TopNavbarComponent,
    SidebarNavComponent
  ],
  templateUrl: './doctor-service-wrapper.component.html',
  styleUrls: ['./doctor-service-wrapper.component.scss']
})
export class DoctorServiceWrapperComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: any = null;
  showSidebarDrawer: boolean = false;
  navSections: NavSection[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    console.log('[DoctorServiceWrapper] ngOnInit STARTED');
    this.loadCurrentUser();
    this.initializeNavigation();
    console.log('[DoctorServiceWrapper] ngOnInit COMPLETE - navSections:', this.navSections);
    console.log('[DoctorServiceWrapper] navSections count:', this.navSections.length);
    this.navSections.forEach((section, idx) => {
      console.log(`[DoctorServiceWrapper] Section ${idx} (${section.name}):`, section.items.map(i => i.label).join(', '));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        console.log('[DoctorServiceWrapper] currentUser loaded:', this.currentUser);
      });
  }

  private initializeNavigation(): void {
    this.navSections = [
      {
        name: 'Main Navigation',
        items: [
          {
            label: 'Dashboard',
            icon: 'fas fa-home',
            route: '/doctor/nexus-direct/dashboard'
          },
          {
            label: 'Appointments',
            icon: 'fas fa-calendar-check',
            route: '/doctor/nexus-direct/dashboard/appointments'
          },
          {
            label: 'Patients',
            icon: 'fas fa-users',
            route: '/doctor/nexus-direct/dashboard/patients'
          },
          {
            label: 'Schedule',
            icon: 'fas fa-clock',
            route: '/doctor/nexus-direct/dashboard/schedule'
          }
        ]
      },
      {
        name: 'Services',
        items: [
          {
            label: 'Patient Calls',
            icon: 'fas fa-phone',
            route: '/doctor/nexus-direct/dashboard/call'
          },
          {
            label: 'Consultations',
            icon: 'fas fa-stethoscope',
            route: '/doctor/nexus-direct/dashboard/consultations'
          },
          {
            label: 'Messages',
            icon: 'fas fa-envelope',
            route: '/doctor/nexus-direct/dashboard/messages'
          },
          {
            label: 'Reports',
            icon: 'fas fa-file-medical',
            route: '/doctor/nexus-direct/dashboard/reports'
          }
        ]
      },
      {
        name: 'Account',
        items: [
          {
            label: 'Profile',
            icon: 'fas fa-user',
            route: '/doctor/nexus-direct/dashboard/profile'
          },
          {
            label: 'Settings',
            icon: 'fas fa-cog',
            route: '/doctor/nexus-direct/dashboard/settings'
          },
          {
            label: 'Earnings',
            icon: 'fas fa-chart-line',
            route: '/doctor/nexus-direct/dashboard/earnings'
          }
        ]
      }
    ];
  }

  onNavbarSidebarToggle(): void {
    this.showSidebarDrawer = !this.showSidebarDrawer;
  }
}
