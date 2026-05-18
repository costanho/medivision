import { Routes } from '@angular/router';
import { AuthGuard } from '../../../core/guards/auth.guard';

/**
 * Admin Routes (Lazy-Loaded)
 *
 * Admin feature routes for administrative functionality.
 * Lazy-loaded via app.routes.ts under /admin path.
 *
 * Routes:
 * - /admin/profile - Admin dashboard
 * - /admin/dashboard - Admin dashboard (alias)
 * - /admin/patients - Patient management
 *
 * All routes are protected by AuthGuard and load components on-demand.
 */
export const adminRoutes: Routes = [
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/admin-dashboard/admin-dashboard.component')
      .then(m => m.AdminDashboardComponent),
    data: { title: 'Admin Dashboard' }
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/admin-dashboard/admin-dashboard.component')
      .then(m => m.AdminDashboardComponent),
    data: { title: 'Admin Dashboard' }
  },
  {
    path: 'patients',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/patient-management/patient-management.component')
      .then(m => m.PatientManagementComponent),
    data: { title: 'Patient Management' }
  },
   {
    path: 'admin/profile',
    loadComponent: () => import('../../pages/admin-dashboard/admin-dashboard.component')
    .then(m => m.AdminDashboardComponent),
    canActivate: [AuthGuard],
    data: { title: 'Admin Dashboard' }
  },

  {
    path: 'admin/dashboard',
    loadComponent: () => import('../../pages/admin-dashboard/admin-dashboard.component')
    .then(m => m.AdminDashboardComponent),
    canActivate: [AuthGuard],
    data: { title: 'Admin Dashboard' }
  },

  {
    path: 'admin/patients',
    loadComponent: () => import('../../pages/patient-management/patient-management.component')
    .then(m => m.PatientManagementComponent),
    canActivate: [AuthGuard],
    data: { title: 'Patient Management' }
  }
];
