import { Routes } from '@angular/router';
import { AuthGuard } from '../../../../core/guards/auth.guard';

/**
 * Doctor Dashboard Routes
 *
 * Lazy-loaded route for the main doctor dashboard component only.
 * Child routes (messages, appointments, etc.) are managed at app.routes.ts level
 * for better control and separation of concerns.
 *
 * Parent route: `/doctor/nexus-direct/dashboard`
 */
export const doctorDashboardRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-dashboard/doctor-dashboard.component')
      .then(m => m.DoctorDashboardComponent),
    data: { title: 'Dashboard' }
  },
  {
    path: 'messages',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-messages/doctor-messages.component')
      .then(m => m.DoctorMessagesComponent),
    data: { title: 'Messages' }
  },
  {
    path: 'consultations',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-consultations/doctor-consultations.component')
      .then(m => m.DoctorConsultationsComponent),
    data: { title: 'Consultations' }
  },
  {
    path: 'reports',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-reports/doctor-reports.component')
      .then(m => m.DoctorReportsComponent),
    data: { title: 'Reports' }
  },
  {
    path: 'appointments',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-appointments-page/doctor-appointments-page.component')
      .then(m => m.DoctorAppointmentsPageComponent),
    data: { title: 'Appointments' }
  },
  {
    path: 'patients',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-patients/doctor-patients.component')
      .then(m => m.DoctorPatientsComponent),
    data: { title: 'Patients' }
  },
  {
    path: 'schedule',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-schedule/doctor-schedule.component')
      .then(m => m.DoctorScheduleComponent),
    data: { title: 'Schedule' }
  },
  {
    path: 'earnings',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-earnings/doctor-earnings.component')
      .then(m => m.DoctorEarningsComponent),
    data: { title: 'Earnings' }
  },
  {
    path: 'settings',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-settings/doctor-settings.component')
      .then(m => m.DoctorSettingsComponent),
    data: { title: 'Settings' }
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../pages/doctor-profile/doctor-profile.component')
      .then(m => m.DoctorProfileComponent),
    data: { title: 'Profile' }
  },
  {
    path: 'schedule-appointment/:doctorId',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../../pages/schedule-appointment/schedule-appointment.component')
      .then(m => m.ScheduleAppointmentComponent),
    data: { title: 'Schedule Appointment' }
  },
  {
    path: 'call',
    canActivate: [AuthGuard],
    loadComponent: () => import('../../../webrtc/doctor/components/doctor-call-screen/doctor-call-screen.component')
      .then(m => m.DoctorCallScreenComponent),
    data: { title: 'Patient Calls' }
  }
];
