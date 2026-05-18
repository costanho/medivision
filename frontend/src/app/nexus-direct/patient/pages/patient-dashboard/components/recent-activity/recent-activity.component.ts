import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { AppointmentService } from '../../../../../services/appointment.service';
import { MessageService } from '../../../../../services/message.service';
import { DoctorService } from '../../../../../services/doctor.service';
import { AuthService } from '../../../../../../core/services/auth.service';

export interface Activity {
  title: string;
  description: string;
  date: string;
  icon: string;
  status: string;
}

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activity.component.html',
  styleUrls: ['./recent-activity.component.scss']
})
export class RecentActivityComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activities: Activity[] = [];

  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);
  private doctorService = inject(DoctorService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.loadRecentActivities();
  }

  private loadRecentActivities(): void {
    this.loadConfirmedAppointment();
    this.loadLatestMessage();
    this.loadScheduledAppointment();
  }

  private loadConfirmedAppointment(): void {
    // Get all appointments for authenticated patient
    this.appointmentService.getAppointments(0, 100)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((response) => {
          console.log('[RecentActivity] Appointments response:', response);
          const appointments = response.content || [];
          console.log('[RecentActivity] Total appointments:', appointments.length);

          // Find the most recent confirmed/completed appointment
          const confirmedApt = appointments
            .filter(apt => apt.status === 'COMPLETED')
            .sort((a, b) => new Date(b.appointmentTime).getTime() - new Date(a.appointmentTime).getTime())
            [0];

          if (confirmedApt && confirmedApt.doctorId) {
            // Fetch doctor details to get the name
            return this.doctorService.getDoctorById(confirmedApt.doctorId).pipe(
              switchMap((doctor) => {
                const appointmentTime = new Date(confirmedApt.appointmentTime).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                this.activities[0] = {
                  title: 'Appointment Confirmed',
                  description: doctor.name || 'Doctor',
                  date: appointmentTime,
                  icon: 'fas fa-check-circle',
                  status: 'confirmed'
                };
                console.log('[RecentActivity] Confirmed appointment loaded:', confirmedApt, 'Doctor:', doctor.name);
                return of(null);
              })
            );
          } else {
            console.log('[RecentActivity] No confirmed appointments found. Showing placeholder.');
            this.activities[0] = {
              title: 'Appointment Confirmed',
              description: 'No confirmed appointments yet',
              date: 'N/A',
              icon: 'fas fa-check-circle',
              status: 'confirmed'
            };
            return of(null);
          }
        })
      )
      .subscribe({
        error: (err) => {
          console.error('[RecentActivity] Failed to load confirmed appointments:', err);
          this.activities[0] = {
            title: 'Appointment Confirmed',
            description: 'Unable to load data',
            date: 'Error',
            icon: 'fas fa-check-circle',
            status: 'confirmed'
          };
        }
      });
  }

  private loadLatestMessage(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.email) {
      console.warn('[RecentActivity] No current user email available');
      this.activities[1] = {
        title: 'New Message',
        description: 'User not authenticated',
        date: 'N/A',
        icon: 'fas fa-envelope',
        status: 'new'
      };
      return;
    }

    // Get all messages for authenticated patient (paginated)
    this.messageService.getMessages(0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[RecentActivity] Messages response:', response);
          const messages = response.content || [];
          console.log('[RecentActivity] Total messages:', messages.length);
          console.log('[RecentActivity] Current user email:', currentUser.email);

          // Find the most recent message sent TO the logged-in user (patient)
          const latestMessage = messages
            .filter(msg => msg.recipientEmail === currentUser.email)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            [0];

          if (latestMessage) {
            const senderName = latestMessage.senderName || 'Doctor';
            const messageDate = new Date(latestMessage.createdAt || '').toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            this.activities[1] = {
              title: 'New Message',
              description: `${senderName} sent you a message`,
              date: messageDate,
              icon: 'fas fa-envelope',
              status: 'new'
            };
            console.log('[RecentActivity] Latest message loaded:', latestMessage);
          } else {
            console.log('[RecentActivity] No messages found for current user');
            this.activities[1] = {
              title: 'New Message',
              description: 'No new messages',
              date: 'N/A',
              icon: 'fas fa-envelope',
              status: 'new'
            };
          }
        },
        error: (err) => {
          console.error('[RecentActivity] Failed to load messages:', err);
          this.activities[1] = {
            title: 'New Message',
            description: 'Unable to load data',
            date: 'Error',
            icon: 'fas fa-envelope',
            status: 'new'
          };
        }
      });
  }

  private loadScheduledAppointment(): void {
    // Get upcoming appointments with pagination and sorting
    this.appointmentService.getAppointments(0, 10)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((response) => {
          console.log('[RecentActivity] Scheduled appointments response:', response);
          const appointments = response.content || [];
          console.log('[RecentActivity] Total appointments for scheduled check:', appointments.length);

          // Find the next upcoming scheduled appointment
          const now = new Date();
          const scheduledApt = appointments
            .filter(apt => apt.status === 'SCHEDULED' && new Date(apt.appointmentTime) > now)
            .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())
            [0];

          if (scheduledApt && scheduledApt.doctorId) {
            // Fetch doctor details to get the name
            return this.doctorService.getDoctorById(scheduledApt.doctorId).pipe(
              switchMap((doctor) => {
                const appointmentTime = new Date(scheduledApt.appointmentTime).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                this.activities[2] = {
                  title: 'Appointment Scheduled',
                  description: doctor.name || 'Doctor',
                  date: appointmentTime,
                  icon: 'fas fa-calendar-check',
                  status: 'scheduled'
                };
                console.log('[RecentActivity] Scheduled appointment loaded:', scheduledApt, 'Doctor:', doctor.name);
                return of(null);
              })
            );
          } else {
            console.log('[RecentActivity] No upcoming scheduled appointments found');
            this.activities[2] = {
              title: 'Appointment Scheduled',
              description: 'No upcoming appointments',
              date: 'N/A',
              icon: 'fas fa-calendar-check',
              status: 'scheduled'
            };
            return of(null);
          }
        })
      )
      .subscribe({
        error: (err) => {
          console.error('[RecentActivity] Failed to load scheduled appointments:', err);
          this.activities[2] = {
            title: 'Appointment Scheduled',
            description: 'Unable to load data',
            date: 'Error',
            icon: 'fas fa-calendar-check',
            status: 'scheduled'
          };
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
