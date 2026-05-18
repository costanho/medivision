import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MedicalConditionService } from '../../../../../services/medical-condition.service';
import { PatientService } from '../../../../../services/patient.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { AllergiesComponent } from '../allergies/allergies.component';
import { PrescriptionsComponent } from '../prescriptions/prescriptions.component';
import { LabResultsComponent } from '../lab-results/lab-results.component';

// ═══════════════════════════════════════════════════════════════════════════
// MEDICAL RECORDS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
//
// Purpose: Comprehensive medical records management interface for patients
//
// Features:
// 1. Medical History - Chronic conditions and past illnesses
// 2. Allergies - Known allergies with severity levels
// 3. Prescriptions - Current and past prescriptions
// 4. Lab Results - Test results with trends
// 5. Medications - Current medications and dosage
// 6. Immunizations - Vaccination history
// 7. Documents - Upload and manage medical documents

interface MedicalCondition {
  id: number;
  name?: string;
  conditionName?: string;
  description?: string;
  diagnosedDate: string;
  status: 'active' | 'resolved' | 'archived';
  notes?: string;
  doctorName?: string;
  doctorEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  patientId?: number;
}

interface LabResult {
  id: number;
  testName: string;
  resultDate: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
}

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  reason: string;
}

interface Immunization {
  id: number;
  vaccineName: string;
  dateAdministered: string;
  provider: string;
  nextDueDate?: string;
}

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AllergiesComponent, PrescriptionsComponent, LabResultsComponent],
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MedicalRecordsComponent implements OnInit, OnDestroy {
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: COMPONENT STATE
  // ─────────────────────────────────────────────────────────────────────────

  activeTab: string = 'conditions';
  loading = false;
  error = '';
  success = '';

  // Forms
  conditionForm: FormGroup;

  // Modal states
  showConditionModal = false;
  editingCondition: MedicalCondition | null = null;

  // Data
  medicalConditions: MedicalCondition[] = [];

  labResults: LabResult[] = [];

  medications: Medication[] = [];

  immunizations: Immunization[] = [];

  private destroy$ = new Subject<void>();

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: CONSTRUCTOR & LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    private formBuilder: FormBuilder,
    private medicalConditionService: MedicalConditionService,
    private patientService: PatientService,
    private authService: AuthService
  ) {
    this.conditionForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      diagnosedDate: ['', Validators.required],
      status: ['active', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    console.log('[MedicalRecordsComponent] Initialized');
    this.loadMedicalConditions();
  }

  private loadMedicalConditions(): void {
    this.loading = true;
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.email) {
      console.warn('[MedicalRecordsComponent] No current user email available');
      this.loading = false;
      this.error = 'Unable to load medical conditions: User not authenticated';
      return;
    }

    console.log('[MedicalRecordsComponent] Loading medical conditions for user:', currentUser.email);

    // First, get patient data to retrieve patientId
    this.patientService.loadAndCachePatientByEmail(currentUser.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          console.log('[MedicalRecordsComponent] Patient data loaded:', patient);
          if (patient && patient.id) {
            // Now fetch medical conditions for this patient
            this.fetchMedicalConditionsForPatient(patient.id);
          } else {
            console.error('[MedicalRecordsComponent] Patient ID not found in patient data');
            this.loading = false;
            this.error = 'Unable to retrieve patient ID for loading medical conditions';
            setTimeout(() => { this.error = ''; }, 3000);
          }
        },
        error: (err) => {
          console.error('[MedicalRecordsComponent] Failed to load patient data:', err);
          this.loading = false;
          this.error = 'Unable to load patient information';
          setTimeout(() => { this.error = ''; }, 3000);
        }
      });
  }

  private fetchMedicalConditionsForPatient(patientId: number): void {
    console.log('[MedicalRecordsComponent] Fetching medical conditions for patientId:', patientId);

    this.medicalConditionService.getConditionsByPatient(patientId, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[MedicalRecordsComponent] Medical conditions response:', response);
          this.populateMedicalConditions(response);
          this.loading = false;
          this.success = 'Medical conditions loaded successfully';
          setTimeout(() => { this.success = ''; }, 3000);
        },
        error: (err) => {
          console.error('[MedicalRecordsComponent] Failed to load medical conditions:', err);
          this.loading = false;
          this.error = 'Unable to load medical conditions from database';
          setTimeout(() => { this.error = ''; }, 3000);
        }
      });
  }

  private populateMedicalConditions(response: any): void {
    console.log('[MedicalRecordsComponent] Populating medical conditions from API response:', response);

    // Extract conditions from paginated response
    if (response && response.content && Array.isArray(response.content)) {
      this.medicalConditions = response.content;
      console.log('[MedicalRecordsComponent] Loaded medical conditions from content array:', this.medicalConditions);
    } else if (Array.isArray(response)) {
      this.medicalConditions = response;
      console.log('[MedicalRecordsComponent] Loaded medical conditions from direct array:', this.medicalConditions);
    } else {
      this.medicalConditions = [];
      console.log('[MedicalRecordsComponent] No medical conditions found in response');
    }

    console.log('[MedicalRecordsComponent] Medical conditions populated:', {
      count: this.medicalConditions.length,
      conditions: this.medicalConditions
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: TAB NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  selectTab(tab: string): void {
    this.activeTab = tab;
    this.error = '';
    this.success = '';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: MEDICAL CONDITIONS
  // ─────────────────────────────────────────────────────────────────────────

  openConditionModal(condition?: MedicalCondition): void {
    this.editingCondition = condition || null;
    if (condition) {
      this.conditionForm.patchValue(condition);
    } else {
      this.conditionForm.reset({ status: 'active' });
    }
    this.showConditionModal = true;
  }

  closeConditionModal(): void {
    this.showConditionModal = false;
    this.editingCondition = null;
    this.conditionForm.reset({ status: 'active' });
  }

  saveCondition(): void {
    if (this.conditionForm.invalid) {
      return;
    }

    const newCondition: MedicalCondition = {
      id: this.editingCondition?.id || Math.max(...this.medicalConditions.map(c => c.id), 0) + 1,
      ...this.conditionForm.value
    };

    if (this.editingCondition) {
      const index = this.medicalConditions.findIndex(c => c.id === this.editingCondition!.id);
      if (index >= 0) {
        this.medicalConditions[index] = newCondition;
      }
    } else {
      this.medicalConditions.push(newCondition);
    }

    this.success = `Medical condition ${this.editingCondition ? 'updated' : 'added'} successfully`;
    this.closeConditionModal();
    setTimeout(() => { this.success = ''; }, 3000);
  }

  deleteCondition(id: number): void {
    if (confirm('Are you sure you want to delete this medical condition?')) {
      this.medicalConditionService.deleteCondition(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.medicalConditions = this.medicalConditions.filter(c => c.id !== id);
            this.success = 'Medical condition deleted successfully';
            console.log('[MedicalRecordsComponent] Condition deleted:', id);
            setTimeout(() => { this.success = ''; }, 3000);
          },
          error: (err) => {
            console.error('[MedicalRecordsComponent] Failed to delete condition:', err);
            this.error = 'Failed to delete medical condition';
            setTimeout(() => { this.error = ''; }, 3000);
          }
        });
    }
  }

  updateConditionStatus(id: number): void {
    const condition = this.medicalConditions.find(c => c.id === id);
    if (!condition) return;

    // Toggle status: active -> resolved, resolved -> active
    const newStatus = condition.status === 'active' ? 'resolved' : 'active';

    const updatedCondition = { ...condition, status: newStatus };

    this.medicalConditionService.updateCondition(id, updatedCondition)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.medicalConditions.findIndex(c => c.id === id);
          if (index >= 0) {
            this.medicalConditions[index] = updated;
          }
          this.success = `Medical condition status updated to ${newStatus.toUpperCase()}`;
          console.log('[MedicalRecordsComponent] Condition updated:', id, updated);
          setTimeout(() => { this.success = ''; }, 3000);
        },
        error: (err) => {
          console.error('[MedicalRecordsComponent] Failed to update condition:', err);
          this.error = 'Failed to update medical condition status';
          setTimeout(() => { this.error = ''; }, 3000);
        }
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
      case 'normal':
        return 'status-active';
      case 'abnormal':
        return 'status-abnormal';
      case 'critical':
        return 'status-critical';
      case 'resolved':
      case 'completed':
        return 'status-completed';
      case 'discontinued':
        return 'status-discontinued';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return '🔄';
      case 'resolved': return '✅';
      case 'normal': return '✅';
      case 'abnormal': return '⚠️';
      case 'critical': return '🚨';
      case 'completed': return '✅';
      case 'discontinued': return '⛔';
      default: return '📋';
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
