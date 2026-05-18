import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PatientService } from '../../services/patient.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PatientListResponse {
  content: any[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss']
})
export class PatientListComponent implements OnInit, OnDestroy {
  patients: any[] = [];
  loading = false;
  error: string | null = null;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Search
  searchQuery = '';
  searchType: 'all' | 'name' | 'email' = 'all';

  private destroy$ = new Subject<void>();

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.error = null;

    if (this.searchQuery.trim() && this.searchType === 'name') {
      // Search by name
      this.patientService.searchByName(this.searchQuery, this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.patients = response.content || [];
            this.totalElements = response.totalElements || 0;
            this.totalPages = response.totalPages || 0;
            this.loading = false;
            console.log('[PatientList] Patients loaded:', this.patients.length);
          },
          error: (err) => {
            console.error('[PatientList] Error loading patients:', err);
            this.error = 'Failed to load patients. Please try again.';
            this.loading = false;
          }
        });
    } else if (this.searchQuery.trim() && this.searchType === 'email') {
      // Search by email
      this.patientService.searchByEmail(this.searchQuery)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (patient) => {
            this.patients = patient ? [patient] : [];
            this.totalElements = this.patients.length;
            this.totalPages = 1;
            this.loading = false;
          },
          error: (err) => {
            console.error('[PatientList] Error searching by email:', err);
            this.error = 'Patient not found.';
            this.loading = false;
          }
        });
    } else {
      // Load all patients
      this.patientService.getPatients(this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.patients = response.content || [];
            this.totalElements = response.totalElements || 0;
            this.totalPages = response.totalPages || 0;
            this.loading = false;
            console.log('[PatientList] Patients loaded:', this.patients.length);
          },
          error: (err) => {
            console.error('[PatientList] Error loading patients:', err);
            this.error = 'Failed to load patients. Please try again.';
            this.loading = false;
          }
        });
    }
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadPatients();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchType = 'all';
    this.currentPage = 0;
    this.loadPatients();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadPatients();
    }
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

  get pageNumbers(): number[] {
    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(0, this.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisiblePages);

    for (let i = startPage; i < endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
