import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  name?: string;
  items: NavItem[];
}

@Injectable({
  providedIn: 'root'
})
export class SidebarNavService {
  constructor() {}

  getNavigation(): Observable<NavSection[]> {
    const navigation: NavSection[] = [
      {
        id: 'main-nav',
        name: '',
        items: [
          {
            id: 'profile',
            label: 'Profile',
            icon: 'fas fa-user',
            route: '/doctor/profile'
          },
          {
            id: 'appointments',
            label: 'My Appointments',
            icon: 'fas fa-calendar',
            route: '/doctor/appointments'
          },
          {
            id: 'patients',
            label: 'My Patients',
            icon: 'fas fa-users',
            route: '/doctor/patients'
          },
          {
            id: 'messages',
            label: 'Messages',
            icon: 'fas fa-comments',
            route: '/doctor/messages'
          },
          {
            id: 'medical-records',
            label: 'Medical Records',
            icon: 'fas fa-file-medical',
            route: '/doctor/medical-records'
          }
        ]
      },
      {
        id: 'services',
        name: 'Services',
        items: [
          {
            id: 'carenexus',
            label: 'CareNexus',
            icon: 'fas fa-hospital',
            children: [
              {
                id: 'direct',
                label: 'Direct',
                icon: 'fas fa-hospital'
              },
              {
                id: 'proxy',
                label: 'Proxy',
                icon: 'fas fa-users'
              },
              {
                id: 'urgent',
                label: 'Urgent',
                icon: 'fas fa-ambulance'
              },
              {
                id: 'companion',
                label: 'Companion',
                icon: 'fas fa-robot'
              },
              {
                id: 'claims',
                label: 'Claims',
                icon: 'fas fa-file-contract'
              },
              {
                id: 'learn',
                label: 'Learn',
                icon: 'fas fa-book'
              }
            ]
          },
          {
            id: 'connect',
            label: 'Connect',
            icon: 'fas fa-link',
            route: '/doctor/connect'
          },
          {
            id: 'analytics',
            label: 'Analytics',
            icon: 'fas fa-chart-bar',
            route: '/doctor/analytics'
          }
        ]
      },
      {
        id: 'settings',
        name: 'Settings',
        items: [
          {
            id: 'settings',
            label: 'Settings',
            icon: 'fas fa-cog',
            route: '/doctor/settings'
          },
          {
            id: 'privacy',
            label: 'Privacy & Security',
            icon: 'fas fa-lock',
            route: '/doctor/privacy'
          },
          {
            id: 'help',
            label: 'Help & Support',
            icon: 'fas fa-question-circle',
            route: '/doctor/help'
          }
        ]
      }
    ];

    // Return as observable (can be replaced with HTTP call later)
    return of(navigation);
  }
}
