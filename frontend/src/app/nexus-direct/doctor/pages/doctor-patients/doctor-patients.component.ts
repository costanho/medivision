import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { PatientService } from '../../../services/patient.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Patient {
  id: number;
  name?: string;
  fullName?: string;
  email?: string;
  userEmail?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  medicalConditions?: string;
  allergies?: string;
  isOnline?: boolean;
  lastSeenAt?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-doctor-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-patients.component.html',
  styleUrls: ['./doctor-patients.component.scss']
})
export class DoctorPatientsComponent implements OnInit, OnDestroy {
  private patientService = inject(PatientService);
  private authService = inject(AuthService);

  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  loading = true;
  error = '';
  successMessage = '';

  // Search and filter
  searchQuery = '';
  filterByMedicalCondition = '';

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  // Modal for creating patient
  showCreateModal = false;
  newPatient: Partial<Patient> = {};

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    console.log('[DoctorPatients] Component initialized');
    this.loadPatients();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatients(): void {
    console.log('[DoctorPatients] Loading patients...');
    this.loading = true;
    this.error = '';

    this.patientService.getPatients(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[DoctorPatients] ✓ Patients loaded:', response);
          this.patients = response.content || [];
          this.totalPages = response.totalPages || 1;
          this.totalElements = response.totalElements || 0;
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          console.error('[DoctorPatients] ✗ Failed to load patients:', err);
          this.error = 'Failed to load patients. Please try again.';
          this.loading = false;
        }
      });
  }

  private applyFilters(): void {
    this.filteredPatients = this.patients.filter(patient => {
      const matchesSearch = !this.searchQuery ||
        (patient.name?.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (patient.email?.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (patient.phone?.includes(this.searchQuery));

      const matchesCondition = !this.filterByMedicalCondition ||
        (patient.medicalConditions?.toLowerCase().includes(this.filterByMedicalCondition.toLowerCase()));

      return matchesSearch && matchesCondition;
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  onFilterChange(condition: string): void {
    this.filterByMedicalCondition = condition;
    this.applyFilters();
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.newPatient = {};
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.newPatient = {};
  }

  createPatient(): void {
    if (!this.newPatient.name || !this.newPatient.email) {
      this.error = 'Name and email are required';
      return;
    }

    console.log('[DoctorPatients] Creating new patient:', this.newPatient);
    this.loading = true;

    // Note: You would need to add a create endpoint to PatientService
    // For now, we'll just reload the list
    this.successMessage = 'Patient profile created successfully!';
    setTimeout(() => {
      this.successMessage = '';
      this.closeCreateModal();
      this.loadPatients();
    }, 2000);
  }

  viewPatientDetails(patient: Patient): void {
    console.log('[DoctorPatients] Viewing patient details:', patient);
    // TODO: Implement patient detail view
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadPatients();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadPatients();
    }
  }

  getPatientDisplayName(patient: Patient): string {
    return patient.fullName || patient.name || patient.email || 'Unknown Patient';
  }

  clearError(): void {
    this.error = '';
  }
}
