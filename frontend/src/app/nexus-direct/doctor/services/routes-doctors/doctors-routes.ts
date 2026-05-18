import { Routes } from '@angular/router';
import { AuthGuard } from '../../../../core/guards/auth.guard';

/**
 * Doctors Routes
 *
 * Lazy-loads doctor feature routes using loadChildren for proper code splitting:
 * - doctorDashboardRoutes - Dashboard and related features (lazy-loaded)
 * - doctorProfileRoutes - Profile management and viewing (lazy-loaded)
 *
 * Each child route set is loaded on-demand as a separate module to optimize bundle size.
 *
 * These routes handle:
 * - Doctor dashboard and management features
 * - Doctor profile viewing and management
 * - Doctor-specific settings and configurations
 * - All child doctor features
 */
export const doctorsRoutes: Routes = [
  // ═══════════════════════════════════════════════════════════
  // Dashboard Routes (lazy-loaded via loadChildren)
  // ═══════════════════════════════════════════════════════════
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () => import('./doctor-dashboard-routes').then(m => m.doctorDashboardRoutes),
    data: { title: 'Doctor Dashboard Routes' }
  },
  // ═══════════════════════════════════════════════════════════
  // Profile Routes (lazy-loaded via loadChildren)
  // ═══════════════════════════════════════════════════════════
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadChildren: () => import('./doctor-profile-routes').then(m => m.doctorProfileRoutes),
    data: { title: 'Doctor Profile Routes' }
  }
];
