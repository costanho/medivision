import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../../../core/services/auth.service';
import { AppointmentService, Appointment } from '../../../../../services/appointment.service';
import { DoctorService, Doctor } from '../../../../../services/doctor.service';
import { PatientService, Patient } from '../../../../../services/patient.service';

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-appointments.component.html',
  styleUrls: ['./doctor-appointments.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class DoctorAppointmentsComponent implements OnInit, OnDestroy {
  // Tab states
  activeTab: 'my-appointments' | 'system-appointments' | 'create' = 'my-appointments';

  // My appointments
  myAppointments: Appointment[] = [];
  myAppointmentsLoading = false;
  myAppointmentsError = '';
  myAppointmentPage = 0;
  myAppointmentPageSize = 10;
  myAppointmentTotal = 0;

  // System appointments (other doctors)
  systemAppointments: Appointment[] = [];
  systemAppointmentsLoading = false;
  systemAppointmentsError = '';
  systemAppointmentPage = 0;
  systemAppointmentPageSize = 10;
  systemAppointmentTotal = 0;
  systemFilterStatus: 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'PENDING' = 'ALL';
  systemSearchPatient = '';

  // Create appointment
  availableDoctors: Doctor[] = [];
  availablePatients: Patient[] = [];
  doctorsLoading = false;
  patientsLoading = false;
  createError = '';
  createSuccess = '';

  // Modal state
  selectedAppointment: Appointment | null = null;
  showDetailModal = false;
  modalError = '';
  modalSuccess = '';
  modalProcessing = false;

  // Appointment actions
  actionType: 'accept' | 'reschedule' | 'cancel' | null = null;
  newDate = '';
  newTime = '';
  cancelReason = '';

  // Pagination state
  currentDoctor: Doctor | null = null;

  // Expose Math for template
  Math = Math;

  private destroy$ = new Subject<void>();
  private isInitialized = false;

  constructor(
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private patientService: PatientService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.isInitialized) {
      this.isInitialized = true;
      console.log('[DoctorAppointments] Component initialized');
      this.loadMyAppointments();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MY APPOINTMENTS
  // ─────────────────────────────────────────────────────────────────────────

  loadMyAppointments(): void {
    const currentUser = this.authService.getCurrentUser();
    const doctorEmail = currentUser?.email;

    if (!doctorEmail) {
      console.error('[DoctorAppointments] No doctor email found in current user');
      this.myAppointmentsError = 'Unable to load appointments: Doctor email not available';
      this.myAppointmentsLoading = false;
      this.cdr.markForCheck();
      return;
    }

    console.log('[DoctorAppointments] Loading appointments for doctor email:', doctorEmail);
    this.myAppointmentsLoading = true;
    this.myAppointmentsError = '';

    // Use backend endpoint that filters by doctor email
    // GET /api/appointments/doctor/{doctorEmail}/paginated?page=0&size=10&sortBy=appointmentTime&direction=DESC
    this.appointmentService.getAppointmentsByDoctorEmail(
      doctorEmail,
      this.myAppointmentPage,
      this.myAppointmentPageSize,
      'appointmentTime',
      'DESC'
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[DoctorAppointments] ✓ Loaded appointments for doctor:', doctorEmail);
          console.log('[DoctorAppointments] Total appointments:', response.totalElements);
          console.log('[DoctorAppointments] Current page:', response.content);

          // Backend returns appointments for the specific doctor email
          this.myAppointments = response.content || [];
          this.myAppointmentTotal = response.totalElements || 0;
          this.myAppointmentsLoading = false;
          this.cdr.markForCheck();

          if (this.myAppointmentTotal === 0) {
            console.log('[DoctorAppointments] ℹ️ No appointments found for doctor:', doctorEmail);
          }
        },
        error: (err) => {
          console.error('[DoctorAppointments] ✗ Error loading appointments:', err);
          console.error('[DoctorAppointments] Error details:', {
            status: err.status,
            message: err.message,
            url: err.url
          });
          this.myAppointmentsError = `Failed to load appointments: ${err.status || 'unknown error'}`;
          this.myAppointmentsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  nextPageMyAppointments(): void {
    if (this.myAppointmentPage < Math.ceil(this.myAppointmentTotal / this.myAppointmentPageSize) - 1) {
      this.myAppointmentPage++;
      this.loadMyAppointments();
    }
  }

  previousPageMyAppointments(): void {
    if (this.myAppointmentPage > 0) {
      this.myAppointmentPage--;
      this.loadMyAppointments();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SYSTEM APPOINTMENTS
  // ─────────────────────────────────────────────────────────────────────────

  loadSystemAppointments(): void {
    console.log('[DoctorAppointments] Loading ALL system appointments');
    this.systemAppointmentsLoading = true;
    this.systemAppointmentsError = '';

    // Use getSystemAppointments() to get ALL appointments in the system
    this.appointmentService.getSystemAppointments(this.systemAppointmentPage, this.systemAppointmentPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[DoctorAppointments] ✓ System appointments loaded from ALL appointments:', response);
          console.log('[DoctorAppointments] Total system appointments:', response.totalElements);

          let filtered = response.content || [];

          // Filter by status
          if (this.systemFilterStatus !== 'ALL') {
            filtered = filtered.filter(a => a.status === this.systemFilterStatus);
          }

          // Filter by patient name search
          if (this.systemSearchPatient.trim()) {
            const search = this.systemSearchPatient.toLowerCase();
            filtered = filtered.filter(a =>
              (a.patientName || '').toLowerCase().includes(search)
            );
          }

          this.systemAppointments = filtered;
          this.systemAppointmentTotal = response.totalElements || 0;
          this.systemAppointmentsLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[DoctorAppointments] ✗ Error loading system appointments:', err);
          this.systemAppointmentsError = `Failed to load system appointments: ${err.status || 'unknown error'}`;
          this.systemAppointmentsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onSystemFilterStatusChange(): void {
    this.systemAppointmentPage = 0;
    this.loadSystemAppointments();
  }

  onSystemSearchChange(): void {
    this.systemAppointmentPage = 0;
    this.loadSystemAppointments();
  }

  nextPageSystemAppointments(): void {
    if (this.systemAppointmentPage < Math.ceil(this.systemAppointmentTotal / this.systemAppointmentPageSize) - 1) {
      this.systemAppointmentPage++;
      this.loadSystemAppointments();
    }
  }

  previousPageSystemAppointments(): void {
    if (this.systemAppointmentPage > 0) {
      this.systemAppointmentPage--;
      this.loadSystemAppointments();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE APPOINTMENT
  // ─────────────────────────────────────────────────────────────────────────

  switchToCreateTab(): void {
    this.activeTab = 'create';
    if (this.availableDoctors.length === 0) {
      this.loadAvailableDoctors();
    }
    if (this.availablePatients.length === 0) {
      this.loadAvailablePatients();
    }
  }

  loadAvailableDoctors(): void {
    console.log('[DoctorAppointments] Loading available doctors');
    this.doctorsLoading = true;

    this.doctorService.getDoctors(0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[DoctorAppointments] Doctors loaded:', response);
          this.availableDoctors = response.content || [];
          this.doctorsLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[DoctorAppointments] Error loading doctors:', err);
          this.createError = 'Failed to load doctors';
          this.doctorsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadAvailablePatients(): void {
    console.log('[DoctorAppointments] Loading available patients');
    this.patientsLoading = true;

    this.patientService.getPatients(0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[DoctorAppointments] Patients loaded:', response);
          this.availablePatients = response.content || [];
          this.patientsLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[DoctorAppointments] Error loading patients:', err);
          this.createError = 'Failed to load patients';
          this.patientsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // APPOINTMENT DETAIL MODAL
  // ─────────────────────────────────────────────────────────────────────────

  openAppointmentDetail(appointment: Appointment): void {
    console.log('[DoctorAppointments] Opening appointment detail:', appointment);
    this.selectedAppointment = { ...appointment };
    this.showDetailModal = true;
    this.actionType = null;
    this.modalError = '';
    this.modalSuccess = '';
    this.newDate = '';
    this.newTime = '';
    this.cancelReason = '';
  }

  closeDetailModal(): void {
    console.log('[DoctorAppointments] Closing detail modal');
    this.showDetailModal = false;
    this.selectedAppointment = null;
    this.actionType = null;
    this.newDate = '';
    this.newTime = '';
    this.cancelReason = '';
    this.modalError = '';
    this.modalSuccess = '';
  }

  acceptAppointment(): void {
    if (!this.selectedAppointment) return;

    console.log('[DoctorAppointments] Accepting appointment:', this.selectedAppointment.id);
    this.modalProcessing = true;
    this.modalError = '';

    const updatePayload = {
      ...this.selectedAppointment,
      status: 'SCHEDULED',
      doctorNotes: 'Appointment accepted'
    };

    this.appointmentService.updateAppointment(this.selectedAppointment.id, updatePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[DoctorAppointments] ✓ Appointment accepted');
          this.modalSuccess = 'Appointment accepted successfully';
          this.modalProcessing = false;
          setTimeout(() => {
            this.closeDetailModal();
            this.loadMyAppointments();
          }, 1500);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[DoctorAppointments] Error accepting appointment:', err);
          this.modalError = `Failed to accept appointment: ${err.status || 'unknown error'}`;
          this.modalProcessing = false;
          this.cdr.markForCheck();
        }
      });
  }

  rescheduleAppointment(): void {
    if (!this.selectedAppointment || !this.newDate || !this.newTime) {
      this.modalError = 'Please select date and time';
      return;
    }

    console.log('[DoctorAppointments] Rescheduling appointment:', this.selectedAppointment.id);
    this.modalProcessing = true;
    this.modalError = '';

    const newDateTime = `${this.newDate}T${this.newTime}:00`;
    const updatePayload = {
      ...this.selectedAppointment,
      appointmentTime: newDateTime,
      doctorNotes: `Rescheduled from original time`
    };

    this.appointmentService.updateAppointment(this.selectedAppointment.id, updatePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[DoctorAppointments] ✓ Appointment rescheduled');
          this.modalSuccess = 'Appointment rescheduled successfully';
          this.modalProcessing = false;
          setTimeout(() => {
            this.closeDetailModal();
            this.loadMyAppointments();
          }, 1500);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[DoctorAppointments] Error rescheduling appointment:', err);
          this.modalError = `Failed to reschedule appointment: ${err.status || 'unknown error'}`;
          this.modalProcessing = false;
          this.cdr.markForCheck();
        }
      });
  }

  cancelAppointment(): void {
    if (!this.selectedAppointment) return;

    if (!this.cancelReason.trim()) {
      this.modalError = 'Please provide a reason for cancellation';
      return;
    }

    console.log('[DoctorAppointments] Cancelling appointment:', this.selectedAppointment.id);
    this.modalProcessing = true;
    this.modalError = '';

    const updatePayload = {
      ...this.selectedAppointment,
      status: 'CANCELLED',
      doctorNotes: `Cancelled with reason: ${this.cancelReason}`
    };

    this.appointmentService.updateAppointment(this.selectedAppointment.id, updatePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[DoctorAppointments] ✓ Appointment cancelled');
          this.modalSuccess = 'Appointment cancelled successfully';
          this.modalProcessing = false;
          setTimeout(() => {
            this.closeDetailModal();
            this.loadMyAppointments();
          }, 1500);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[DoctorAppointments] Error cancelling appointment:', err);
          this.modalError = `Failed to cancel appointment: ${err.status || 'unknown error'}`;
          this.modalProcessing = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  formatTime(dateTimeStr: string | undefined): string {
    if (!dateTimeStr) return '—';
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeStr;
    }
  }

  getStatusClass(status: string): string {
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

  getStatusIcon(status: string): string {
    switch (status) {
      case 'SCHEDULED':
        return '📅';
      case 'COMPLETED':
        return '✓';
      case 'CANCELLED':
        return '✕';
      default:
        return '—';
    }
  }
}
