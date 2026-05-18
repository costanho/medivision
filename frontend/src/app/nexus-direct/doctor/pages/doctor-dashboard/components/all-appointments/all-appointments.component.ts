import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppointmentService, Appointment } from '../../../../../services/appointment.service';
import { AuthService } from '../../../../../../core/services/auth.service';

@Component({
  selector: 'app-all-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './all-appointments.component.html',
  styleUrls: ['./all-appointments.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class AllAppointmentsComponent implements OnInit, OnDestroy {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];

  loading = false;
  error = '';
  success = '';

  // Filter options
  filterStatus: 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' = 'ALL';
  searchPatient = '';
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('[AllAppointments] Component initialized');
    const currentUser = this.authService.getCurrentUser();
    console.log('[AllAppointments] Current doctor:', currentUser?.email);
    this.loadAppointments();
  }

  private loadAppointments(): void {
    console.log('[AllAppointments] Loading appointments...');
    this.loading = true;
    this.error = '';

    this.appointmentService.getAppointments(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AllAppointments] Response received:', response);
          this.appointments = response.content || [];
          this.totalElements = response.totalElements || 0;
          this.totalPages = response.totalPages || 0;

          console.log('[AllAppointments] Total appointments:', this.appointments.length);
          this.applyFilters();
          this.loading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[AllAppointments] Error loading appointments:', err);
          this.loading = false;
          this.error = `Failed to load appointments (${err.status || 'error'})`;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          setTimeout(() => { this.error = ''; }, 5000);
        }
      });
  }

  private applyFilters(): void {
    console.log('[AllAppointments] Applying filters - Status:', this.filterStatus, 'Patient:', this.searchPatient);

    let filtered = [...this.appointments];

    // Filter by status
    if (this.filterStatus !== 'ALL') {
      filtered = filtered.filter(a => a.status === this.filterStatus);
    }

    // Filter by patient name
    if (this.searchPatient.trim()) {
      const search = this.searchPatient.toLowerCase();
      filtered = filtered.filter(a =>
        (a.patientName || '').toLowerCase().includes(search)
      );
    }

    this.filteredAppointments = filtered;
    console.log('[AllAppointments] Filtered to', this.filteredAppointments.length, 'appointments');
  }

  onFilterStatusChange(): void {
    console.log('[AllAppointments] Status filter changed to:', this.filterStatus);
    this.currentPage = 0;
    this.applyFilters();
  }

  onSearchChange(): void {
    console.log('[AllAppointments] Search changed to:', this.searchPatient);
    this.currentPage = 0;
    this.applyFilters();
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadAppointments();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadAppointments();
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
        return '✅';
      case 'CANCELLED':
        return '❌';
      default:
        return '📋';
    }
  }

  formatTime(dateTime: string): string {
    if (!dateTime) return '—';
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateTime;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
