import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { MessageService, Message } from '../../services/message.service';
import { PatientService, Patient } from '../../services/patient.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: any;
  patient: Patient | null = null;
  upcomingAppointments: Appointment[] = [];
  recentMessages: Message[] = [];
  loading = true;
  error = '';
  private destroy$ = new Subject<void>();

  // Enhanced dashboard data
  healthMetrics = {
    bloodPressure: '120/80',
    heartRate: '72 bpm',
    temperature: '37°C',
    weight: '70 kg'
  };

  yourDoctors = [
    { name: 'Dr. Sarah Johnson', specialty: 'Cardiology', avatar: 'SJ', color: '#667eea' },
    { name: 'Dr. Michael Chen', specialty: 'Neurology', avatar: 'MC', color: '#764ba2' },
    { name: 'Dr. Emily Watson', specialty: 'General', avatar: 'EW', color: '#f093fb' }
  ];

  recommendedActions = [
    { title: 'Lab Test Due', description: 'Blood test scheduled for next week', icon: '🩸', status: 'pending' },
    { title: 'Medication Refill', description: 'Your prescription expires in 3 days', icon: '💊', status: 'urgent' },
    { title: 'Follow-up Call', description: 'Dr. Johnson needs to discuss your results', icon: '📞', status: 'pending' }
  ];

  healthTips = [
    '💧 Stay hydrated: Drink 8 glasses of water daily',
    '🏃 Exercise: 30 minutes of moderate activity is recommended',
    '😴 Sleep: Aim for 7-9 hours of quality sleep',
    '🥗 Nutrition: Include more vegetables in your diet'
  ];

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private messageService: MessageService,
    private patientService: PatientService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.loading = true;
    this.error = '';

    // Load patient profile
    this.patientService.getCurrentPatient()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          this.patient = patient;
        },
        error: (err) => {
          console.error('Failed to load patient profile:', err);
          this.error = 'Failed to load patient profile';
        }
      });

    // Load upcoming appointments (first 5)
    this.appointmentService.getAppointments(0, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.upcomingAppointments = response.content || [];
        },
        error: (err) => {
          console.error('Failed to load appointments:', err);
        }
      });

    // Load recent messages (first 5)
    this.messageService.getMessages(0, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.recentMessages = response.content || [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load messages:', err);
          this.loading = false;
        }
      });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  getAppointmentStatusClass(status: string): string {
    switch (status) {
      case 'SCHEDULED':
        return 'status-scheduled';
      case 'COMPLETED':
        return 'status-completed';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'urgent':
        return '#ff5252';
      case 'pending':
        return '#ffa726';
      default:
        return '#667eea';
    }
  }

  getDayOfWeek(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return dateString;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
