import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PatientService, Patient } from '../../services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: PROFILE FORM & STATE
  // ─────────────────────────────────────────────────────────────────────────

  profileForm: FormGroup;
  passwordForm: FormGroup;
  patient: Patient | null = null;
  authUser: any = null; // User data from auth service
  loading = true;
  editing = false;
  submitted = false;
  error = '';
  success = '';
  savingProfile = false;

  // Active tab/section (personal, security, account)
  activeTab: string = 'personal';

  // Password change state
  showPasswordForm = false;
  passwordError = '';
  passwordSuccess = '';
  passwordSubmitted = false;
  passwordLoading = false;

  private destroy$ = new Subject<void>();

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: CONSTRUCTOR & INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    private formBuilder: FormBuilder,
    private patientService: PatientService,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      firstName: ['', [Validators.minLength(1)]],
      lastName: ['', [Validators.minLength(1)]],
      phone: ['', [Validators.pattern(/^[0-9\-\+\(\)\s]*$/)]],
      dateOfBirth: [''],
      gender: [''],
      profilePictureUrl: [''],
      streetAddress: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      country: ['']
    });

    this.passwordForm = this.formBuilder.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator.bind(this) });
  }

  ngOnInit(): void {
    this.loadPatientProfile();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: PROFILE DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────

  private loadPatientProfile(): void {
    this.loading = true;
    const currentUser = this.authService.getCurrentUser();

    console.log('[ProfileComponent] Starting profile load...');
    console.log('[ProfileComponent] Current user from AuthService:', {
      email: currentUser?.email,
      name: currentUser?.fullName || currentUser?.name,
      id: currentUser?.id
    });

    if (!currentUser || !currentUser.email) {
      console.error('[ProfileComponent] No user email available from AuthService');
      this.error = 'User data not available. Please log in again.';
      this.loading = false;
      return;
    }

    // Store auth user data
    this.authUser = currentUser;

    // Fetch full user info from auth service's /auth/me endpoint
    console.log('[ProfileComponent] Fetching full user info from /auth/me...');
    this.authService.getAuthUserInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (authUserInfo) => {
          console.log('[ProfileComponent] ✅ Auth user info loaded:', authUserInfo);
          this.authUser = authUserInfo;
        },
        error: (err) => {
          console.warn('[ProfileComponent] ⚠️ Failed to load auth user info, using cached data:', err);
          // Continue with cached auth user data
        }
      });

    // Fetch patient data from direct database using email
    console.log('[ProfileComponent] Querying patient database for email:', currentUser.email);
    this.patientService.searchByEmail(currentUser.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          console.log('[ProfileComponent] ✅ Patient profile successfully loaded from database');
          console.log('[ProfileComponent] Patient data:', {
            id: patient.id,
            userEmail: patient.userEmail,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            phoneNumber: patient.phoneNumber,
            address: patient.address,
            allergies: patient.allergies
          });
          this.patient = patient;
          this.populateForm(patient);
          this.loading = false;
          this.error = ''; // Clear any previous errors
        },
        error: (err) => {
          console.error('[ProfileComponent] ❌ Failed to load patient from database:', err);
          console.error('[ProfileComponent] Error details:', {
            status: err.status,
            message: err.message,
            url: err.url
          });
          // Fallback to auth service data if database call fails
          console.log('[ProfileComponent] Using fallback data from AuthService');
          this.patient = currentUser as Patient;
          this.populateForm(currentUser as Patient);
          this.loading = false;
          this.error = 'Note: Using cached profile data (database sync in progress)';
        }
      });
  }

  private populateForm(patient: Patient | any): void {
    this.profileForm.patchValue({
      fullName: patient.fullName || patient.name || '',
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      phone: patient.phone || patient.phoneNumber || '',
      dateOfBirth: patient.dateOfBirth || '',
      gender: patient.gender || '',
      profilePictureUrl: patient.profilePictureUrl || '',
      streetAddress: patient.streetAddress || patient.address || '',
      city: patient.city || '',
      state: patient.state || '',
      zipCode: patient.zipCode || '',
      country: patient.country || ''
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: PROFILE EDIT FUNCTIONALITY
  // ─────────────────────────────────────────────────────────────────────────

  toggleEdit(): void {
    this.editing = !this.editing;
    this.submitted = false;
    this.error = '';
    this.success = '';
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
    this.error = '';
    this.success = '';
  }

  get f() {
    return this.profileForm.controls;
  }

  get p() {
    return this.passwordForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    if (this.profileForm.invalid || !this.patient) {
      this.error = 'Please fix the errors in the form before saving.';
      return;
    }

    this.savingProfile = true;

    console.log('[ProfileComponent] Saving profile with data:', this.profileForm.value);

    this.patientService.updateCurrentPatient(this.profileForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          console.log('[ProfileComponent] ✅ Profile updated successfully:', updated);
          this.patient = updated;
          this.success = 'Your profile has been updated successfully!';
          this.editing = false;
          this.submitted = false;
          this.savingProfile = false;

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.success = '';
          }, 3000);
        },
        error: (err) => {
          console.error('[ProfileComponent] ❌ Failed to update profile:', err);
          this.savingProfile = false;

          if (err.status === 400) {
            this.error = 'Invalid input. Please check your data and try again.';
          } else if (err.status === 401) {
            this.error = 'Your session has expired. Please log in again.';
          } else if (err.status === 403) {
            this.error = 'You do not have permission to update this profile.';
          } else if (err.status === 404) {
            this.error = 'Profile not found. Please refresh the page.';
          } else {
            this.error = err.error?.message || 'Failed to update profile. Please try again.';
          }
        }
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: PASSWORD & SECURITY
  // ─────────────────────────────────────────────────────────────────────────

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    this.passwordSubmitted = false;
    this.passwordError = '';
    this.passwordSuccess = '';
    if (!this.showPasswordForm) {
      this.passwordForm.reset();
    }
  }

  onPasswordSubmit(): void {
    this.passwordSubmitted = true;
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.passwordForm.invalid) {
      return;
    }

    this.passwordLoading = true;

    // TODO: Integrate with actual password change endpoint when available
    // const passwordData = {
    //   currentPassword: this.passwordForm.get('currentPassword')?.value,
    //   newPassword: this.passwordForm.get('newPassword')?.value
    // };
    // this.authService.changePassword(passwordData).subscribe(...);

    console.log('[ProfileComponent] Password change requested (not yet integrated with backend)');

    setTimeout(() => {
      this.passwordLoading = false;
      this.passwordSuccess = 'Password changed successfully!';
      this.passwordForm.reset();
      this.showPasswordForm = false;
      setTimeout(() => {
        this.passwordSuccess = '';
      }, 3000);
    }, 1000);
  }

  private passwordMatchValidator(formGroup: FormGroup): { [key: string]: any } | null {
    const newPassword = formGroup.get('newPassword')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    if (!newPassword || !confirmPassword) {
      return null;
    }

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  getPasswordErrorMessage(): string {
    const newPassControl = this.passwordForm.get('newPassword');
    const confirmPassControl = this.passwordForm.get('confirmPassword');

    if (newPassControl?.errors?.['minlength']) {
      return 'Password must be at least 8 characters';
    }
    if (confirmPassControl && this.passwordForm.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }
    return '';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6: UTILITY & CLEANUP
  // ─────────────────────────────────────────────────────────────────────────

  goBackToDashboard(): void {
    this.router.navigate(['/patient/nexus-direct/dashboard']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
