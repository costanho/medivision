import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AllergyService } from '../../../../../services/allergy.service';
import { PatientService } from '../../../../../services/patient.service';
import { AuthService } from '../../../../../../core/services/auth.service';

interface Allergy {
  id: number;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
  dateIdentified: string;
}

@Component({
  selector: 'app-allergies',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './allergies.component.html',
  styleUrls: ['./allergies.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AllergiesComponent implements OnInit, OnDestroy {
  allergies: Allergy[] = [];
  loading = false;
  error = '';
  success = '';

  allergyForm: FormGroup;
  showAllergyModal = false;
  editingAllergy: Allergy | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private allergyService: AllergyService,
    private patientService: PatientService,
    private authService: AuthService
  ) {
    this.allergyForm = this.formBuilder.group({
      allergen: ['', [Validators.required, Validators.minLength(2)]],
      severity: ['moderate', Validators.required],
      reaction: ['', [Validators.required, Validators.minLength(5)]],
      dateIdentified: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('[AllergiesComponent] Initialized');
    this.loadAllergies();
  }

  private loadAllergies(): void {
    this.loading = true;
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.email) {
      console.warn('[AllergiesComponent] No current user email available');
      this.loading = false;
      this.error = 'Unable to load allergies: User not authenticated';
      return;
    }

    console.log('[AllergiesComponent] Loading allergies for user:', currentUser.email);

    this.patientService.loadAndCachePatientByEmail(currentUser.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          console.log('[AllergiesComponent] Patient data loaded:', patient);
          if (patient && patient.id) {
            this.fetchAllergiesForPatient(patient.id);
          } else {
            console.error('[AllergiesComponent] Patient ID not found');
            this.loading = false;
            this.error = 'Unable to retrieve patient ID for loading allergies';
            setTimeout(() => { this.error = ''; }, 3000);
          }
        },
        error: (err) => {
          console.error('[AllergiesComponent] Failed to load patient data:', err);
          this.loading = false;
          this.error = 'Unable to load patient information';
          setTimeout(() => { this.error = ''; }, 3000);
        }
      });
  }

  private fetchAllergiesForPatient(patientId: number): void {
    console.log('[AllergiesComponent] Fetching allergies for patientId:', patientId);

    this.allergyService.getAllergiesByPatient(patientId, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AllergiesComponent] Allergies response:', response);
          this.populateAllergies(response);
          this.loading = false;
          this.success = 'Allergies loaded successfully';
          setTimeout(() => { this.success = ''; }, 3000);
        },
        error: (err) => {
          console.error('[AllergiesComponent] Failed to load allergies:', err);
          this.loading = false;
          this.error = 'Unable to load allergies from database';
          setTimeout(() => { this.error = ''; }, 3000);
        }
      });
  }

  private populateAllergies(response: any): void {
    console.log('[AllergiesComponent] Populating allergies from API response:', response);

    if (response && response.content && Array.isArray(response.content)) {
      this.allergies = response.content;
      console.log('[AllergiesComponent] Loaded allergies from content array:', this.allergies);
    } else if (Array.isArray(response)) {
      this.allergies = response;
      console.log('[AllergiesComponent] Loaded allergies from direct array:', this.allergies);
    } else {
      this.allergies = [];
      console.log('[AllergiesComponent] No allergies found in response');
    }

    console.log('[AllergiesComponent] Allergies populated:', {
      count: this.allergies.length,
      allergies: this.allergies
    });
  }

  openAllergyModal(allergy?: Allergy): void {
    this.editingAllergy = allergy || null;
    if (allergy) {
      this.allergyForm.patchValue(allergy);
    } else {
      this.allergyForm.reset({ severity: 'moderate' });
    }
    this.showAllergyModal = true;
  }

  closeAllergyModal(): void {
    this.showAllergyModal = false;
    this.editingAllergy = null;
    this.allergyForm.reset({ severity: 'moderate' });
  }

  saveAllergy(): void {
    if (this.allergyForm.invalid) {
      return;
    }

    const newAllergy: Allergy = {
      id: this.editingAllergy?.id || Math.max(...this.allergies.map(a => a.id), 0) + 1,
      ...this.allergyForm.value
    };

    if (this.editingAllergy) {
      const index = this.allergies.findIndex(a => a.id === this.editingAllergy!.id);
      if (index >= 0) {
        this.allergies[index] = newAllergy;
      }
    } else {
      this.allergies.push(newAllergy);
    }

    this.success = `Allergy ${this.editingAllergy ? 'updated' : 'added'} successfully`;
    this.closeAllergyModal();
    setTimeout(() => { this.success = ''; }, 3000);
  }

  deleteAllergy(id: number): void {
    if (confirm('Are you sure you want to delete this allergy record?')) {
      this.allergyService.deleteAllergy(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.allergies = this.allergies.filter(a => a.id !== id);
            this.success = 'Allergy deleted successfully';
            console.log('[AllergiesComponent] Allergy deleted:', id);
            setTimeout(() => { this.success = ''; }, 3000);
          },
          error: (err) => {
            console.error('[AllergiesComponent] Failed to delete allergy:', err);
            this.error = 'Failed to delete allergy';
            setTimeout(() => { this.error = ''; }, 3000);
          }
        });
    }
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'mild': return 'severity-mild';
      case 'moderate': return 'severity-moderate';
      case 'severe': return 'severity-severe';
      default: return '';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'mild': return '🟢';
      case 'moderate': return '🟡';
      case 'severe': return '🔴';
      default: return '⚪';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
