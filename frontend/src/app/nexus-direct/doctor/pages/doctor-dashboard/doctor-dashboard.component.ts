import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardOverviewComponent } from './components/dashboard-overview/dashboard-overview.component';
import { UpcomingAppointmentsComponent } from './components/upcoming-appointments/upcoming-appointments.component';
import { PendingConsultationsComponent } from './components/pending-consultations/pending-consultations.component';
import { NewPatientRequestsComponent } from './components/new-patient-requests/new-patient-requests.component';
import { QuickMessagesComponent } from './components/quick-messages/quick-messages.component';
import { AllAppointmentsComponent } from './components/all-appointments/all-appointments.component';
import { DoctorAppointmentsComponent } from './components/doctor-appointments/doctor-appointments.component';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardOverviewComponent,
    UpcomingAppointmentsComponent,
    PendingConsultationsComponent,
    NewPatientRequestsComponent,
    QuickMessagesComponent,
    AllAppointmentsComponent,
    DoctorAppointmentsComponent
  ],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  ngOnInit(): void {
    console.log('[DoctorDashboard] Dashboard loaded');
  }
}
