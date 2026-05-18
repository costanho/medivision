import { Routes } from '@angular/router';
import { AuthGuard } from '../../../../core/guards/auth.guard';

/**
 * Patient Routes (Intermediate Router)
 *
 * Manages all patient-specific routes with lazy loading for better code splitting.
 * This is loaded by app.routes.ts using loadChildren at the root path.
 * All child routes are prefixed with 'patient/' to maintain clean route structure.
 *
 * Route Hierarchy:
 * ├── app.routes.ts (loads patient-routes at '')
 * │   └── patient-routes.ts (manages /patient/*)
 * │       └── /patient (auth guard)
 * │           ├── /patient/profile (redirect → /patient/nexus-direct/dashboard)
 * │           └── /patient/nexus-direct/* (lazy-loaded: patient-dashboard-routes)
 * │               └── PatientDashboardComponent
 * │                   ├── /dashboard/profile (ProfileComponent)
 * │                   ├── /dashboard/settings (SettingsComponent)
 * │                   └── ... (other child routes)
 *
 * Note: /patient/profile is a redirect to /patient/nexus-direct/dashboard
 * All profile functionality is now part of the dashboard
 */
export const patientRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      // Redirect /patient/profile to dashboard (landing page is now part of dashboard)
      {
        path: 'profile',
        redirectTo: 'nexus-direct/dashboard',
        pathMatch: 'full'
      },
      // Patient Nexus Direct Dashboard with all child routes
      {
        path: 'nexus-direct',
        loadChildren: () => import('./patient-dashboard-routes').then(m => m.patientDashboardRoutes),
        data: { title: 'Patient Dashboard' }
      },
      // Default redirect: /patient → /patient/nexus-direct/dashboard
      {
        path: '',
        redirectTo: 'nexus-direct/dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
