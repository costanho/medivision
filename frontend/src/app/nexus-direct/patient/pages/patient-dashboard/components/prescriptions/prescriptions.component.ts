import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../../../core/services/auth.service';
import { PrescriptionService, Prescription } from '../../../../../services/prescription.service';
import { PatientService } from '../../../../../services/patient.service';

@Component({
  selector: 'app-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './prescriptions.component.html',
  styleUrls: ['./prescriptions.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PrescriptionsComponent implements OnInit, OnDestroy {
  prescriptions: Prescription[] = [];
  loading = false;
  error = '';
  success = '';

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private prescriptionService: PrescriptionService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    console.log('[PrescriptionsComponent] Initialized');
    this.loadPrescriptions();
  }

  private loadPrescriptions(): void {
    this.loading = true;
    let userEmail: string | null = null;
    const currentUser = this.authService.getCurrentUser();

    console.log('[PrescriptionsComponent] Current user from AuthService:', currentUser);

    if (currentUser?.email) {
      userEmail = currentUser.email;
    } else {
      // Try to get email from token as fallback
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            userEmail = payload.sub || null;
            console.log('[PrescriptionsComponent] Using email from token:', userEmail);
          }
        } catch (e) {
          console.error('[PrescriptionsComponent] Failed to decode token:', e);
        }
      }
    }

    if (!userEmail) {
      console.warn('[PrescriptionsComponent] No user email available from AuthService or token');
      this.loading = false;
      this.error = 'Unable to load prescriptions: User not authenticated';
      return;
    }

    console.log('[PrescriptionsComponent] Loading prescriptions for user:', userEmail);

    this.patientService.loadAndCachePatientByEmail(userEmail)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          console.log('[PrescriptionsComponent] Patient data loaded:', patient);
          if (patient && patient.id) {
            this.fetchPrescriptionsForPatient(patient.id);
          } else {
            console.error('[PrescriptionsComponent] Patient ID not found');
            this.loading = false;
            this.error = 'Unable to retrieve patient ID for loading prescriptions';
            setTimeout(() => { this.error = ''; }, 3000);
          }
        },
        error: (err) => {
          console.error('[PrescriptionsComponent] Failed to load patient data:', err);
          this.loading = false;
          this.error = 'Unable to load patient information';
          setTimeout(() => { this.error = ''; }, 3000);
        }
      });
  }

  private fetchPrescriptionsForPatient(patientId: number): void {
    console.log('[PrescriptionsComponent] Fetching prescriptions for patientId:', patientId);

    this.prescriptionService.getPrescriptionsByPatient(patientId, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[PrescriptionsComponent] Prescriptions response:', response);
          this.populatePrescriptions(response);
          this.loading = false;
          this.success = 'Prescriptions loaded successfully';
          setTimeout(() => { this.success = ''; }, 3000);
        },
        error: (err) => {
          console.error('[PrescriptionsComponent] Failed to load prescriptions:', err);
          this.loading = false;
          this.error = 'Unable to load prescriptions from database';
          setTimeout(() => { this.error = ''; }, 3000);
        }
      });
  }

  private populatePrescriptions(response: any): void {
    console.log('[PrescriptionsComponent] Populating prescriptions from API response:', response);

    if (response && response.content && Array.isArray(response.content)) {
      this.prescriptions = response.content;
      console.log('[PrescriptionsComponent] Loaded prescriptions from content array:', this.prescriptions);
    } else if (Array.isArray(response)) {
      this.prescriptions = response;
      console.log('[PrescriptionsComponent] Loaded prescriptions from direct array:', this.prescriptions);
    } else {
      this.prescriptions = [];
      console.log('[PrescriptionsComponent] No prescriptions found in response');
    }

    console.log('[PrescriptionsComponent] Prescriptions populated:', {
      count: this.prescriptions.length,
      prescriptions: this.prescriptions
    });
  }

  getStatusClass(status: string): string {
    const normalizedStatus = (status || '').toLowerCase();
    switch (normalizedStatus) {
      case 'active':
        return 'status-active';
      case 'completed':
        return 'status-completed';
      case 'discontinued':
        return 'status-discontinued';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    const normalizedStatus = (status || '').toLowerCase();
    switch (normalizedStatus) {
      case 'active': return '💊';
      case 'completed': return '✅';
      case 'discontinued': return '⛔';
      default: return '📋';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
