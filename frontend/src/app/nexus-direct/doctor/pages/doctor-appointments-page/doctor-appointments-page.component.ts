import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DoctorAppointmentsComponent } from '../doctor-dashboard/components/doctor-appointments/doctor-appointments.component';

@Component({
  selector: 'app-doctor-appointments-page',
  standalone: true,
  imports: [CommonModule, DoctorAppointmentsComponent],
  templateUrl: './doctor-appointments-page.component.html',
  styleUrls: ['./doctor-appointments-page.component.scss']
})
export class DoctorAppointmentsPageComponent implements OnInit {
  ngOnInit(): void {
    console.log('[DoctorAppointmentsPage] Appointments page loaded');
  }
}
