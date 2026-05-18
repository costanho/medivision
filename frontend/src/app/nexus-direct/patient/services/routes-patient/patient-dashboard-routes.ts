import { Routes } from '@angular/router';

/**
 * Patient Dashboard Routes (Lazy-Loaded)
 *
 * Lazy-loaded routes for the patient dashboard and all its child components.
 * This route set is lazy-loaded by patient-routes.ts using loadChildren.
 * The path 'nexus-direct' is handled by the parent route.
 *
 * Main component: `PatientDashboardComponent` (lazy-loaded)
 * Dashboard child routes under: `patient/nexus-direct/dashboard/*`
 * - `profile` - Patient profile
 * - `settings` - Patient settings
 * - `medical-records` - Medical records
 * - `doctors` - Browse doctors
 * - `doctor/:id` - View doctor profile
 * - `appointments` - View appointments
 * - `messages` - Patient messaging
 * - `billing` - Billing & payments
 * - `reports` - Medical reports
 * - `schedule-appointment/:doctorId` - Book appointments
 *
 * Loaded at: /patient/nexus-direct
 */
export const patientDashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../pages/patient-dashboard/patient-dashboard.component')
      .then(m => m.PatientDashboardComponent),
    data: { title: 'Patient Dashboard' },
    children: [
      // Default route: redirect to dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        children: [
          {
            path: '',
            redirectTo: 'profile',
            pathMatch: 'full'
          },
          {
            path: 'profile',
            loadComponent: () => import('../../pages/patient-dashboard/components/profile/profile.component')
              .then(m => m.ProfileComponent),
            data: { title: 'Profile' }
          },
          {
            path: 'settings',
            loadComponent: () => import('../../pages/patient-dashboard/components/settings/settings.component')
              .then(m => m.SettingsComponent),
            data: { title: 'Settings' }
          },
          {
            path: 'medical-records',
            loadComponent: () => import('../../pages/patient-dashboard/components/medical-records/medical-records.component')
              .then(m => m.MedicalRecordsComponent),
            data: { title: 'Medical Records' }
          },
          {
            path: 'doctors',
            loadComponent: () => import('../../pages/patient-dashboard/components/doctors/doctor-list.component')
              .then(m => m.DoctorListComponent),
            data: { title: 'Doctors' }
          },
          {
            path: 'doctor/:id',
            loadComponent: () => import('../../pages/patient-dashboard/components/doctor-detail/doctor-detail.component')
              .then(m => m.DoctorDetailComponent),
            data: { title: 'Doctor Profile' }
          },
          {
            path: 'appointments',
            loadComponent: () => import('../../pages/patient-dashboard/components/appointments/appointments.component')
              .then(m => m.AppointmentsComponent),
            data: { title: 'Appointments' }
          },
          {
            path: 'messages',
            loadComponent: () => import('../../pages/messages/messages.page')
              .then(m => m.MessagesPage),
            data: { title: 'Messages' }
          },
          {
            path: 'billing',
            loadComponent: () => import('../../pages/patient-dashboard/components/billing/billing.component')
              .then(m => m.BillingComponent),
            data: { title: 'Billing & Payments' }
          },
          {
            path: 'reports',
            loadComponent: () => import('../../pages/patient-dashboard/components/reports/reports.component')
              .then(m => m.ReportsComponent),
            data: { title: 'Reports' }
          },
          {
            path: 'schedule-appointment/:doctorId',
            loadComponent: () => import('../../../pages/schedule-appointment/schedule-appointment.component')
              .then(m => m.ScheduleAppointmentComponent),
            data: { title: 'Book Appointment' }
          },
          {
            path: 'call',
            loadComponent: () => import('../../../webrtc/patient/components/patient-call-screen/patient-call-screen.component')
              .then(m => m.PatientCallScreenComponent),
            data: { title: 'Start Consultation Call' }
          }
        ]
      }
    ]
  }
];
