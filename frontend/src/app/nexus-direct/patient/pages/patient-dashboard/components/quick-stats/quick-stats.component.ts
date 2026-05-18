import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppointmentService } from '../../../../../services/appointment.service';
import { MessageService } from '../../../../../services/message.service';
import { DoctorService } from '../../../../../services/doctor.service';
import { AuthService } from '../../../../../../core/services/auth.service';

export interface Stat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-quick-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-stats.component.html',
  styleUrls: ['./quick-stats.component.scss']
})
export class QuickStatsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  stats: Stat[] = [
    { label: 'Upcoming Appointments', value: 0, icon: 'fas fa-calendar', color: '#667eea' },
    { label: 'Connected Doctors', value: 0, icon: 'fas fa-stethoscope', color: '#764ba2' },
    { label: 'Unread Messages', value: 0, icon: 'fas fa-envelope', color: '#f093fb' },
    { label: 'Health Score', value: '92%', icon: 'fas fa-heart', color: '#4caf50' }
  ];

  constructor(
    private appointmentService: AppointmentService,
    private messageService: MessageService,
    private doctorService: DoctorService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUpcomingAppointments();
    this.loadUnreadMessages();
    this.loadConnectedDoctorsCount();
  }

  private loadUpcomingAppointments(): void {
    this.appointmentService.getAppointments(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const appointments = response.content || [];
          // Count only scheduled/upcoming appointments (not completed or cancelled)
          const upcomingCount = appointments.filter(apt => apt.status === 'SCHEDULED').length;
          this.stats[0].value = upcomingCount;
          console.log('[QuickStats] Upcoming appointments loaded:', upcomingCount);
        },
        error: (err) => {
          console.error('[QuickStats] Failed to load appointments:', err);
          this.stats[0].value = 0;
        }
      });
  }

  private loadUnreadMessages(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.email) {
      this.stats[2].value = 0;
      return;
    }

    this.messageService.getMessages(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const messages = response.content || [];
          // Count unread messages received by the current user
          const unreadCount = messages.filter(msg => !msg.isRead && msg.recipientEmail === currentUser.email).length;
          this.stats[2].value = unreadCount;
          console.log('[QuickStats] Unread messages loaded:', unreadCount);
        },
        error: (err) => {
          console.error('[QuickStats] Failed to load messages:', err);
          this.stats[2].value = 0;
        }
      });
  }

  private loadConnectedDoctorsCount(): void {
    // Get total unique doctors the patient has messaged with from conversations
    this.messageService.getConversations(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const conversations = response.content || response.conversations || [];
          // Count unique doctors in conversations
          const uniqueDoctors = new Set(conversations.map((conv: any) => conv.otherPersonId || conv.doctorId));
          this.stats[1].value = uniqueDoctors.size;
          console.log('[QuickStats] Connected doctors (from conversations) loaded:', uniqueDoctors.size);
        },
        error: (err) => {
          console.warn('[QuickStats] Failed to load conversations:', err);
          // If conversations fail, try a fallback - count online doctors from directory
          this.loadOnlineDoctorsCount();
        }
      });
  }

  private loadOnlineDoctorsCount(): void {
    // Fallback: Count doctors from directory that have online status
    this.doctorService.getDoctors(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const doctors = response.content || [];
          // Count only online doctors
          const onlineDoctorsCount = doctors.filter((doc: any) => doc.isOnline === true).length;
          this.stats[1].value = onlineDoctorsCount;
          console.log('[QuickStats] Connected doctors (online from directory) loaded:', onlineDoctorsCount);
        },
        error: (err) => {
          console.error('[QuickStats] Failed to load online doctors:', err);
          this.stats[1].value = 0;
        }
      });
  }

  navigateToAppointments(): void {
    console.log('[QuickStats] Navigating to appointments');
    this.router.navigate(['/patient/nexus-direct/dashboard/appointments']);
  }

  navigateToDoctors(): void {
    console.log('[QuickStats] Navigating to doctors');
    this.router.navigate(['/patient/nexus-direct/dashboard/doctors']);
  }

  navigateToMessages(): void {
    console.log('[QuickStats] Navigating to messages');
    this.router.navigate(['/patient/nexus-direct/dashboard/messages']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
