import { Routes } from '@angular/router';

/**
 * Patient Profile Routes (Lazy-Loaded)
 *
 * Contains patient profile landing page route.
 * This route set is lazy-loaded by patient-routes.ts using loadChildren.
 * The path 'profile' is handled by the parent route, so this exports just the component route.
 *
 * Loaded at: /patient/profile
 */
export const patientProfileRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../pages/patient-profile-landing/patient-profile-landing.component')
      .then(m => m.PatientProfileLandingComponent),
    data: { title: 'Patient Profile' }
  }
];
