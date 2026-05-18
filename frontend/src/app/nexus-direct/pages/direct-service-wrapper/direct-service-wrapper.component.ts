import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

@Component({
  selector: 'app-direct-service-wrapper',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './direct-service-wrapper.component.html',
  styleUrls: ['./direct-service-wrapper.component.scss']
})
export class DirectServiceWrapperComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  activeTab: string = 'dashboard';
  sidebarOpen = true;
  isMobile = false;

  private destroy$ = new Subject<void>();

  navigationItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'fas fa-chart-bar',
      path: 'dashboard'
    },
    {
      label: 'Profile',
      icon: 'fas fa-user',
      path: 'profile'
    },
    {
      label: 'Medical Records',
      icon: 'fas fa-file-alt',
      path: 'medical-records'
    },
    {
      label: 'Doctors',
      icon: 'fas fa-user-md',
      path: 'doctors'
    },
    {
      label: 'Appointments',
      icon: 'fas fa-calendar',
      path: 'appointments'
    },
    {
      label: 'Messages',
      icon: 'fas fa-comments',
      path: 'messages',
      badge: 3
    },
    {
      label: 'Billing & Payments',
      icon: 'fas fa-credit-card',
      path: 'billing'
    },
    {
      label: 'Reports',
      icon: 'fas fa-chart-line',
      path: 'reports'
    },
    {
      label: 'Settings',
      icon: 'fas fa-cog',
      path: 'settings'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.checkMobileView();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    console.log('[DirectServiceWrapper] Loaded for user:', this.currentUser?.email);

    // Track route changes - only listen to NavigationEnd events
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        const match = url.match(/nexus-direct\/(\w+)/);
        if (match) {
          this.activeTab = match[1];
        } else if (url.includes('nexus-direct') && !url.includes('nexus-direct/')) {
          this.activeTab = 'dashboard';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkMobileView(): void {
    this.isMobile = window.innerWidth < 768;
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 768;
      if (this.isMobile) {
        this.sidebarOpen = false;
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  selectNavItem(path: string): void {
    this.activeTab = path;
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
    this.router.navigate(['/patient/nexus-direct', path]);
  }

  goBack(): void {
    this.router.navigate(['/service-selection']);
  }
}
