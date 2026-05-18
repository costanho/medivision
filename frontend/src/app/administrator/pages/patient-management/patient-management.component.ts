import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { AdminHeaderComponent } from '../../components/admin-header/admin-header.component';
import { AdminSidebarComponent } from '../../components/admin-sidebar/admin-sidebar.component';
import { AuthService } from '../../../core/services/auth.service';

export interface CombinedPatient {
  email: string;
  name: string;
  surname: string;
  sex: string;
  phone: string;
  dateOfBirth: string;
  verified: boolean;
  active: boolean;
  userId?: number;
  patientId?: number;
}

@Component({
  selector: 'app-patient-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminHeaderComponent, AdminSidebarComponent],
  templateUrl: './patient-management.component.html',
  styleUrls: ['./patient-management.component.scss']
})
export class PatientManagementComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  showSidebar: boolean = false;

  // Table data
  patients: CombinedPatient[] = [];
  filteredPatients: CombinedPatient[] = [];

  // Loading & Error states
  loading: boolean = false;
  error: string = '';
  success: string = '';

  // Search & Filter
  searchTerm: string = '';
  filterVerified: string = 'all'; // all, verified, unverified
  filterActive: string = 'all'; // all, active, inactive

  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  totalElements: number = 0;

  // Selected patients for bulk actions
  selectedPatients: Set<string> = new Set();
  selectAll: boolean = false;

  // Action states
  actionLoading: boolean = false;

  // Expose Math for template
  Math = Math;

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadPatients();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  loadPatients(): void {
    this.loading = true;
    this.error = '';

    // Fetch combined patient data from admin endpoint (combines auth + direct service data)
    this.apiService.get<any>('/admin/patients/combined', {
      page: 0,
      size: 1000,
      sortBy: 'email',
      direction: 'ASC'
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[PatientManagement] Combined patients response:', response);

          const patients = response.content || response || [];
          this.patients = patients.map((p: any) => ({
            email: p.email,
            name: p.name || '',
            surname: p.surname || '',
            sex: p.sex || '',
            phone: p.phone || '',
            dateOfBirth: p.dateOfBirth || '',
            verified: p.verified || false,
            active: p.active || false,
            userId: p.userId,
            patientId: p.patientId
          }));

          this.totalElements = this.patients.length;
          console.log('[PatientManagement] Loaded patients:', this.patients);

          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          console.error('[PatientManagement] Error loading patients:', err);
          this.error = 'Failed to load patients. Please try again.';
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.patients];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.email.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.surname.toLowerCase().includes(term) ||
        p.phone.includes(term)
      );
    }

    // Verified filter
    if (this.filterVerified === 'verified') {
      filtered = filtered.filter(p => p.verified);
    } else if (this.filterVerified === 'unverified') {
      filtered = filtered.filter(p => !p.verified);
    }

    // Active filter
    if (this.filterActive === 'active') {
      filtered = filtered.filter(p => p.active);
    } else if (this.filterActive === 'inactive') {
      filtered = filtered.filter(p => !p.active);
    }

    this.filteredPatients = filtered;
    this.totalElements = filtered.length;
    this.totalPages = Math.ceil(this.totalElements / this.pageSize);
    this.currentPage = 0;
  }

  get paginatedPatients(): CombinedPatient[] {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredPatients.slice(start, end);
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
    }
  }

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.paginatedPatients.forEach(p => this.selectedPatients.add(p.email));
    } else {
      this.selectedPatients.clear();
    }
  }

  toggleSelect(email: string): void {
    if (this.selectedPatients.has(email)) {
      this.selectedPatients.delete(email);
    } else {
      this.selectedPatients.add(email);
    }
    this.selectAll = this.selectedPatients.size === this.paginatedPatients.length;
  }

  isSelected(email: string): boolean {
    return this.selectedPatients.has(email);
  }

  // CRUD Operations
  verifyPatient(patient: CombinedPatient): void {
    if (!patient.email) return;

    this.actionLoading = true;
    this.apiService.put(`/admin/patients/${patient.email}/verify`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          patient.verified = true;
          this.success = `Patient ${patient.email} verified successfully`;
          setTimeout(() => this.success = '', 3000);
          this.actionLoading = false;
        },
        error: (err) => {
          console.error('[PatientManagement] Error verifying patient:', err);
          this.error = 'Failed to verify patient';
          setTimeout(() => this.error = '', 3000);
          this.actionLoading = false;
        }
      });
  }

  activatePatient(patient: CombinedPatient): void {
    if (!patient.email) return;

    this.actionLoading = true;
    this.apiService.put(`/admin/patients/${patient.email}/activate`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          patient.active = true;
          this.success = `Patient ${patient.email} activated successfully`;
          setTimeout(() => this.success = '', 3000);
          this.actionLoading = false;
        },
        error: (err) => {
          console.error('[PatientManagement] Error activating patient:', err);
          this.error = 'Failed to activate patient';
          setTimeout(() => this.error = '', 3000);
          this.actionLoading = false;
        }
      });
  }

  deactivatePatient(patient: CombinedPatient): void {
    if (!patient.email) return;
    if (!confirm(`Are you sure you want to deactivate ${patient.email}?`)) return;

    this.actionLoading = true;
    this.apiService.put(`/admin/patients/${patient.email}/deactivate`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          patient.active = false;
          this.success = `Patient ${patient.email} deactivated successfully`;
          setTimeout(() => this.success = '', 3000);
          this.actionLoading = false;
        },
        error: (err) => {
          console.error('[PatientManagement] Error deactivating patient:', err);
          this.error = 'Failed to deactivate patient';
          setTimeout(() => this.error = '', 3000);
          this.actionLoading = false;
        }
      });
  }

  deletePatient(patient: CombinedPatient): void {
    if (!patient.email) return;
    if (!confirm(`Are you sure you want to delete ${patient.email}? This action cannot be undone.`)) return;

    this.actionLoading = true;

    // Delete from both auth and direct service via admin endpoint
    this.apiService.delete(`/admin/patients/${patient.email}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.patients = this.patients.filter(p => p.email !== patient.email);
          this.applyFilters();
          this.success = `Patient ${patient.email} deleted successfully`;
          setTimeout(() => this.success = '', 3000);
          this.actionLoading = false;
        },
        error: (err) => {
          console.error('[PatientManagement] Error deleting patient:', err);
          this.error = 'Failed to delete patient';
          setTimeout(() => this.error = '', 3000);
          this.actionLoading = false;
        }
      });
  }

  bulkVerify(): void {
    if (this.selectedPatients.size === 0) return;
    if (!confirm(`Verify ${this.selectedPatients.size} selected patients?`)) return;

    this.actionLoading = true;
    const selectedEmails = Array.from(this.selectedPatients);
    const patientsToVerify = this.patients.filter(p => selectedEmails.includes(p.email) && !p.verified);

    if (patientsToVerify.length === 0) {
      this.error = 'No unverified patients selected';
      setTimeout(() => this.error = '', 3000);
      this.actionLoading = false;
      return;
    }

    let completed = 0;
    patientsToVerify.forEach(patient => {
      if (patient.email) {
        this.apiService.put(`/admin/patients/${patient.email}/verify`, {})
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              patient.verified = true;
              completed++;
              if (completed === patientsToVerify.length) {
                this.success = `${completed} patients verified successfully`;
                setTimeout(() => this.success = '', 3000);
                this.selectedPatients.clear();
                this.selectAll = false;
                this.actionLoading = false;
              }
            },
            error: () => {
              completed++;
              if (completed === patientsToVerify.length) {
                this.actionLoading = false;
              }
            }
          });
      }
    });
  }

  bulkActivate(): void {
    if (this.selectedPatients.size === 0) return;
    if (!confirm(`Activate ${this.selectedPatients.size} selected patients?`)) return;

    this.actionLoading = true;
    const selectedEmails = Array.from(this.selectedPatients);
    const patientsToActivate = this.patients.filter(p => selectedEmails.includes(p.email) && !p.active);

    if (patientsToActivate.length === 0) {
      this.error = 'No inactive patients selected';
      setTimeout(() => this.error = '', 3000);
      this.actionLoading = false;
      return;
    }

    let completed = 0;
    patientsToActivate.forEach(patient => {
      if (patient.email) {
        this.apiService.put(`/admin/patients/${patient.email}/activate`, {})
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              patient.active = true;
              completed++;
              if (completed === patientsToActivate.length) {
                this.success = `${completed} patients activated successfully`;
                setTimeout(() => this.success = '', 3000);
                this.selectedPatients.clear();
                this.selectAll = false;
                this.actionLoading = false;
              }
            },
            error: () => {
              completed++;
              if (completed === patientsToActivate.length) {
                this.actionLoading = false;
              }
            }
          });
      }
    });
  }

  bulkDeactivate(): void {
    if (this.selectedPatients.size === 0) return;
    if (!confirm(`Deactivate ${this.selectedPatients.size} selected patients?`)) return;

    this.actionLoading = true;
    const selectedEmails = Array.from(this.selectedPatients);
    const patientsToDeactivate = this.patients.filter(p => selectedEmails.includes(p.email) && p.active);

    if (patientsToDeactivate.length === 0) {
      this.error = 'No active patients selected';
      setTimeout(() => this.error = '', 3000);
      this.actionLoading = false;
      return;
    }

    let completed = 0;
    patientsToDeactivate.forEach(patient => {
      if (patient.email) {
        this.apiService.put(`/admin/patients/${patient.email}/deactivate`, {})
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              patient.active = false;
              completed++;
              if (completed === patientsToDeactivate.length) {
                this.success = `${completed} patients deactivated successfully`;
                setTimeout(() => this.success = '', 3000);
                this.selectedPatients.clear();
                this.selectAll = false;
                this.actionLoading = false;
              }
            },
            error: () => {
              completed++;
              if (completed === patientsToDeactivate.length) {
                this.actionLoading = false;
              }
            }
          });
      }
    });
  }

  exportToCSV(): void {
    const headers = ['Email', 'Name', 'Surname', 'Sex', 'Phone', 'Date of Birth', 'Verified', 'Active'];
    const csvData = this.filteredPatients.map(p => [
      p.email,
      p.name,
      p.surname,
      p.sex,
      p.phone,
      p.dateOfBirth,
      p.verified ? 'Yes' : 'No',
      p.active ? 'Yes' : 'No'
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  refreshData(): void {
    this.loadPatients();
  }
}
