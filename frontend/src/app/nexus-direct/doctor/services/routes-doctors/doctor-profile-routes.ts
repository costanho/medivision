import { Routes } from '@angular/router';
import { AuthGuard } from '../../../../core/guards/auth.guard';

/**
 * Doctor Profile Routes
 *
 * Lazy-loaded routes for doctor profile management and related sub-pages.
 * These routes handle:
 * - Doctor profile landing page with profile overview
 * - Doctor profile details/view and management
 *
 * Routes are protected by AuthGuard and load components on-demand.
 */
export const doctorProfileRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-profile-landing/doctor-profile-landing.component')
      .then(m => m.DoctorProfileLandingComponent),
    data: { title: 'Doctor Profile' },
    children: [
      {
        path: 'details',
        canActivate: [AuthGuard],
        loadComponent: () => import('../../pages/doctor-profile/doctor-profile.component')
          .then(m => m.DoctorProfileComponent),
        data: { title: 'Profile Details' }
      }
    ]
  }
];
