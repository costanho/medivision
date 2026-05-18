import { Component, OnInit, OnDestroy, ViewEncapsulation, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LabResultsService, LabResult } from '../../../../../services/lab-results.service';
import { AuthService } from '../../../../../../core/services/auth.service';

@Component({
  selector: 'app-lab-results',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './lab-results.component.html',
  styleUrls: ['./lab-results.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default
})
export class LabResultsComponent implements OnInit, OnDestroy {
  labResults: LabResult[] = [];
  loading = false;
  error = '';
  success = '';

  private destroy$ = new Subject<void>();
  private isInitialized = false;

  constructor(
    private labResultsService: LabResultsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('[LabResultsComponent] ngOnInit called');
    const currentUser = this.authService.getCurrentUser();
    console.log('[LabResultsComponent] Current user from AuthService:', currentUser);

    // Load lab results immediately when component initializes
    console.log('[LabResultsComponent] isInitialized:', this.isInitialized);
    if (!this.isInitialized) {
      this.isInitialized = true;
      console.log('[LabResultsComponent] First time initialization - loading lab results');
      this.loadLabResults();
    } else {
      console.log('[LabResultsComponent] Already initialized, skipping load');
    }
  }

  private loadLabResults(): void {
    console.log('[LabResultsComponent] loadLabResults() called');
    this.loading = true;
    this.error = '';
    this.success = '';

    const currentUser = this.authService.getCurrentUser();
    console.log('[LabResultsComponent] Current user:', currentUser?.email);
    console.log('[LabResultsComponent] Calling getAllLabResults(0, 100)');

    this.labResultsService.getAllLabResults(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[LabResultsComponent] ✅ Response received successfully');
          console.log('[LabResultsComponent] Response object:', response);
          console.log('[LabResultsComponent] Response.content:', response?.content);
          console.log('[LabResultsComponent] Content length:', response?.content?.length || 0);

          this.populateLabResults(response);

          this.loading = false;
          console.log('[LabResultsComponent] Setting loading to false');

          this.cdr.markForCheck();
          this.cdr.detectChanges();
          console.log('[LabResultsComponent] Change detection triggered');

          console.log('[LabResultsComponent] Final labResults array length:', this.labResults.length);

          if (this.labResults.length > 0) {
            this.success = `Loaded ${this.labResults.length} lab results`;
            console.log('[LabResultsComponent] ✅ Success - lab results loaded');
          }
          setTimeout(() => { this.success = ''; }, 3000);
        },
        error: (err) => {
          console.error('[LabResultsComponent] ❌ Error loading lab results');
          console.error('[LabResultsComponent] Error status:', err.status);
          console.error('[LabResultsComponent] Error statusText:', err.statusText);
          console.error('[LabResultsComponent] Error message:', err.message);
          console.error('[LabResultsComponent] Error body:', err.error);
          console.error('[LabResultsComponent] Full error object:', err);

          this.loading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();

          this.error = `Failed to load lab results (${err.status || 'unknown error'})`;
          console.error('[LabResultsComponent] Set error message:', this.error);

          setTimeout(() => { this.error = ''; }, 5000);
        }
      });
  }

  private populateLabResults(response: any): void {
    console.log('[LabResultsComponent] Populating lab results from API response');

    if (response && response.content && Array.isArray(response.content)) {
      this.labResults = response.content;
      console.log('[LabResultsComponent] ✓ Loaded', this.labResults.length, 'results from content array');
    } else if (Array.isArray(response)) {
      this.labResults = response;
      console.log('[LabResultsComponent] ✓ Loaded', this.labResults.length, 'results from direct array');
    } else {
      this.labResults = [];
      console.log('[LabResultsComponent] ✗ No lab results found in response');
    }

    console.log('[LabResultsComponent] Final labResults array:', {
      count: this.labResults.length,
      firstItem: this.labResults[0] || null,
      allItems: this.labResults
    });
  }

  getStatusClass(status: string): string {
    const normalizedStatus = (status || '').toLowerCase();
    // Map backend result status values to display classes
    switch (normalizedStatus) {
      case 'abnormal':
      case 'high':
      case 'low':
        return 'status-abnormal';
      case 'normal':
      case 'final':
        return 'status-normal';
      case 'pending':
      case 'processing':
        return 'status-pending';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    const normalizedStatus = (status || '').toLowerCase();
    // Map backend result status values to icons
    switch (normalizedStatus) {
      case 'abnormal':
      case 'high':
      case 'low':
        return '⚠️';
      case 'normal': return '✅';
      case 'final': return '✅';
      case 'pending':
      case 'processing':
        return '⏳';
      default: return '🧪';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
