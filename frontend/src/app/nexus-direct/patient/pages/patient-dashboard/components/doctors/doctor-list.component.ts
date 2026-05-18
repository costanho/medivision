import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DoctorService, Doctor, DoctorListResponse } from '../../../../../services/doctor.service';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctor-list.component.html',
  styleUrls: ['./doctor-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DoctorListComponent implements OnInit, OnDestroy {
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  loading = true;
  error = '';
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  searchTerm = '';
  selectedSpecialization = '';
  specializations: string[] = [];
  specializationsLoading = true;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private doctorService: DoctorService) {}

  ngOnInit(): void {
    console.log('[DoctorList] Component initialized');
    this.loadSpecializations();
    this.loadDoctors();
    this.setupSearch();
  }

  private setupSearch(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.loading = true;
          if (term.trim()) {
            return this.doctorService.searchByName(term, 0, this.pageSize);
          } else if (this.selectedSpecialization) {
            return this.doctorService.searchBySpecialization(this.selectedSpecialization, 0, this.pageSize);
          } else {
            return this.doctorService.getDoctors(0, this.pageSize);
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: DoctorListResponse) => this.handleResponse(response),
        error: (err: any) => this.handleError(err)
      });
  }

  private loadDoctors(): void {
    this.loading = true;
    this.error = '';

    // Try simple endpoint first
    console.log(`[DoctorList] Attempting to load doctors from /doctors endpoint`);
    this.doctorService.getAllDoctors()
      .pipe(
        takeUntil(this.destroy$),
        // Fall back to paginated endpoint if simple one fails
        catchError((err) => {
          console.warn('[DoctorList] Simple endpoint failed, trying paginated:', err);
          return this.doctorService.getDoctors(this.currentPage, this.pageSize);
        })
      )
      .subscribe({
        next: (response: DoctorListResponse) => {
          console.log('[DoctorList] Doctors loaded successfully:', response);
          this.handleResponse(response);
        },
        error: (err: any) => {
          console.error('[DoctorList] Error loading doctors from both endpoints:', err);
          this.handleError(err);
        }
      });
  }

  private handleResponse(response: DoctorListResponse): void {
    this.doctors = response.content || [];
    this.filteredDoctors = this.doctors;
    this.totalElements = response.totalElements || this.doctors.length || 0;
    this.totalPages = response.totalPages || 1;
    this.loading = false;
  }

  private handleError(err: any): void {
    console.error('[DoctorList] Failed to load doctors:', err);

    let errorMessage = 'Failed to load doctors. Please try again.';

    if (err.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
    } else if (err.status === 403) {
      errorMessage = 'You do not have permission to view doctors.';
    } else if (err.status === 404) {
      errorMessage = 'Doctors API endpoint not found.';
    } else if (err.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (err.status === 0) {
      errorMessage = 'Cannot connect to backend. Is the server running?';
    } else if (err.message) {
      errorMessage = err.message;
    }

    this.error = errorMessage;
    this.loading = false;
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 0;
    this.search$.next(term);
  }

  onSpecializationChange(specialization: string): void {
    this.selectedSpecialization = specialization;
    this.currentPage = 0;
    if (specialization) {
      // Search by specialization
      console.log('[DoctorList] Filtering by specialization:', specialization);
      this.loading = true;
      this.doctorService.searchBySpecialization(specialization, this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: DoctorListResponse) => {
            console.log('[DoctorList] Specialization search results:', response);
            this.handleResponse(response);
          },
          error: (err: any) => {
            console.error('[DoctorList] Error searching by specialization:', err);
            this.handleError(err);
          }
        });
    } else {
      // Clear specialization filter, load all doctors
      this.search$.next(this.searchTerm);
    }
  }

  private loadSpecializations(): void {
    console.log('[DoctorList] Loading specializations from backend');
    this.doctorService.getSpecializations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (specializations: string[]) => {
          console.log('[DoctorList] Specializations loaded:', specializations);
          this.specializations = specializations;
          this.specializationsLoading = false;
        },
        error: (err: any) => {
          console.error('[DoctorList] Error loading specializations:', err);
          this.specializations = [];
          this.specializationsLoading = false;
        }
      });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadDoctors();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadDoctors();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
