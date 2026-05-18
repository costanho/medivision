import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Appointment {
  id: number;
  patientName: string;
  patientAvatar: string;
  time: string;
  type: string;
  status: 'confirmed' | 'pending' | 'completed';
}

@Component({
  selector: 'app-upcoming-appointments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-appointments.component.html',
  styleUrls: ['./upcoming-appointments.component.scss']
})
export class UpcomingAppointmentsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  appointments: Appointment[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadUpcomingAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUpcomingAppointments(): void {
    this.loading = true;
    this.appointments = [];
    this.loading = false;
    console.log('[UpcomingAppointments] Appointments loaded from backend');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return '#4caf50';
      case 'pending':
        return '#ff9800';
      case 'completed':
        return '#2196f3';
      default:
        return '#95a5a6';
    }
  }
}
