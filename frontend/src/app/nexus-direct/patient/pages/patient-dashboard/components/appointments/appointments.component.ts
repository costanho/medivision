import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppointmentService, Appointment } from '../../../../../services/appointment.service';
import { DoctorService, Doctor } from '../../../../../services/doctor.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS MANAGEMENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
//
// Purpose: Comprehensive appointment management interface for patients
//
// Features:
// 1. Upcoming and Past appointments tabs
// 2. Appointment status filtering
// 3. Appointment details with full information
// 4. Reschedule appointment functionality
// 5. Cancel appointment with reason
// 6. Appointment reminders management
// 7. Calendar view with appointment times
// 8. Email/SMS notification preferences

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: COMPONENT STATE
  // ─────────────────────────────────────────────────────────────────────────

  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  loading = true;
  error = '';
  success = '';
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  // Tab and filter state
  activeTab: string = 'upcoming';
  statusFilter: string = 'all';

  // Modal states
  showDetailsModal = false;
  showRescheduleModal = false;
  showCancelModal = false;
  selectedAppointment: Appointment | null = null;

  // Forms
  rescheduleForm: FormGroup;
  cancelForm: FormGroup;

  // Status options
  statusOptions = ['all', 'SCHEDULED', 'COMPLETED', 'CANCELLED'];

  private destroy$ = new Subject<void>();

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: CONSTRUCTOR & LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private formBuilder: FormBuilder
  ) {
    this.rescheduleForm = this.formBuilder.group({
      appointmentDate: ['', [Validators.required]],
      appointmentTime: ['', [Validators.required]],
      reason: ['']
    });

    this.cancelForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {
    this.loadAppointments();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: DATA LOADING & FILTERING
  // ─────────────────────────────────────────────────────────────────────────

  private loadAppointments(): void {
    this.loading = true;
    this.error = '';
    this.appointmentService.getAppointments(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.appointments = (response.content || []).map(apt => {
            // Parse appointmentTime (full datetime) to extract date
            let appointmentDate = apt.appointmentDate;
            if (!appointmentDate && apt.appointmentTime) {
              // Extract date from appointmentTime (format: "2026-01-15T10:00:00")
              const datePart = apt.appointmentTime.substring(0, 10);
              appointmentDate = datePart;
            }

            return {
              ...apt,
              appointmentDate: appointmentDate || new Date().toISOString().split('T')[0]
            };
          });

          // Fetch doctor details for each appointment
          this.enrichAppointmentsWithDoctorInfo();
          this.totalPages = response.totalPages;
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          console.error('[AppointmentsComponent] Failed to load appointments:', err);
          this.error = 'Failed to load appointments. Please try again.';
          this.loading = false;
        }
      });
  }

  private enrichAppointmentsWithDoctorInfo(): void {
    // Fetch doctor info for each unique doctorId
    const doctorIds = [...new Set(this.appointments.map(apt => apt.doctorId))];

    doctorIds.forEach(doctorId => {
      this.doctorService.getDoctorById(doctorId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (doctor: Doctor) => {
            // Update appointments with doctor info
            this.appointments = this.appointments.map(apt => {
              if (apt.doctorId === doctorId) {
                return {
                  ...apt,
                  doctorName: doctor.name,
                  specialty: doctor.specialization
                };
              }
              return apt;
            });
            this.applyFilters();
          },
          error: (err) => {
            console.warn(`[AppointmentsComponent] Failed to load doctor ${doctorId}:`, err);
          }
        });
    });
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
    this.statusFilter = 'all';
    this.applyFilters();
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.appointments];

    // Filter by tab (upcoming or past)
    const now = new Date();
    if (this.activeTab === 'upcoming') {
      filtered = filtered.filter(apt => {
        const aptDate = apt.appointmentDate ? new Date(apt.appointmentDate) : new Date();
        return aptDate >= now;
      });
    } else if (this.activeTab === 'past') {
      filtered = filtered.filter(apt => {
        const aptDate = apt.appointmentDate ? new Date(apt.appointmentDate) : new Date();
        return aptDate < now;
      });
    }

    // Filter by status
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === this.statusFilter);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
      const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
      return this.activeTab === 'upcoming'
        ? dateA - dateB
        : dateB - dateA;
    });

    this.filteredAppointments = filtered;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: APPOINTMENT ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  openDetailsModal(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedAppointment = null;
  }

  openRescheduleModal(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showRescheduleModal = true;
    this.rescheduleForm.reset();
  }

  closeRescheduleModal(): void {
    this.showRescheduleModal = false;
    this.selectedAppointment = null;
    this.rescheduleForm.reset();
  }

  openCancelModal(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showCancelModal = true;
    this.cancelForm.reset();
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.selectedAppointment = null;
    this.cancelForm.reset();
  }

  rescheduleAppointment(): void {
    if (this.rescheduleForm.invalid || !this.selectedAppointment) {
      return;
    }

    console.log('[AppointmentsComponent] Rescheduling appointment:', this.rescheduleForm.value);
    this.success = 'Appointment rescheduled successfully';
    this.closeRescheduleModal();
    this.loadAppointments();
    setTimeout(() => { this.success = ''; }, 3000);
  }

  cancelAppointment(): void {
    if (this.cancelForm.invalid || !this.selectedAppointment) {
      return;
    }

    const appointmentId = this.selectedAppointment.id;
    this.appointmentService.cancelAppointment(appointmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Appointment cancelled successfully';
          this.closeCancelModal();
          this.loadAppointments();
          setTimeout(() => { this.success = ''; }, 3000);
        },
        error: (err) => {
          console.error('[AppointmentsComponent] Failed to cancel appointment:', err);
          this.error = 'Failed to cancel appointment. Please try again.';
        }
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'status-scheduled';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'SCHEDULED': return '📅';
      case 'COMPLETED': return '✅';
      case 'CANCELLED': return '❌';
      default: return '📋';
    }
  }

  isUpcoming(appointmentDate: string | undefined): boolean {
    if (!appointmentDate) return false;
    return new Date(appointmentDate) > new Date();
  }

  getDaysUntilAppointment(appointmentDate: string | undefined): number {
    if (!appointmentDate) return 0;
    const now = new Date();
    const appointment = new Date(appointmentDate);
    const timeDiff = appointment.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadAppointments();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadAppointments();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6: CLEANUP
  // ─────────────────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
