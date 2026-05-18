import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { PatientService, Patient } from '../../../../../services/patient.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ProfileDataService, ProfileData } from '../../../../services/profile-data.service';
import { ProfileFormService } from '../../../../services/profile-form.service';
import { ProfileFileService } from '../../../../services/profile-file.service';
import { PasswordUpdateService } from '../../../../services/password-update.service';
import { ProfileUpdateService } from '../../../../services/profile-update.service';
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
  private destroy$ = new Subject<void>();

  patient: Patient | null = null;
  authUser: any = null;
  loading = true;
  editMode = false;
  submitted = false;
  error = '';
  success = '';
  savingProfile = false;
  hasChanges = false;
  activeTab: 'personal' | 'more' | 'security' = 'personal';

  // Forms
  profileForm: FormGroup;
  medicalForm: FormGroup;
  passwordForm: FormGroup;

  // File uploads
  profilePictureFile: File | null = null;
  profilePicturePreview: string | null = null;
  documents: File[] = [];
  documentNames: string[] = [];
  uploading = false;

  constructor(
    private authService: AuthService,
    private patientService: PatientService,
    private profileDataService: ProfileDataService,
    private profileFormService: ProfileFormService,
    private profileFileService: ProfileFileService,
    private passwordUpdateService: PasswordUpdateService,
    private profileUpdateService: ProfileUpdateService
  ) {
    // Initialize forms using ProfileFormService
    this.profileForm = this.profileFormService.createProfileForm();
    this.medicalForm = this.profileFormService.createMedicalForm();
    this.passwordForm = this.profileFormService.createPasswordForm();
  }

  ngOnInit(): void {
    console.log('[PatientProfile] Component initialized');
    this.loadPatientProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatientProfile(): void {
    this.loading = true;
    this.authUser = this.authService.getCurrentUser();

    console.log('[PatientProfile] Loading profile for user:', this.authUser?.email);
    console.log('[PatientProfile] Current authUser from service:', JSON.stringify(this.authUser, null, 2));

    if (!this.authUser || !this.authUser.email) {
      console.error('[PatientProfile] No authenticated user found');
      this.error = 'User not authenticated. Please log in again.';
      this.initializeEmptyProfile();
      return;
    }

    // First, fetch the full user info from /api/auth/me to ensure we have firstName, lastName, phone
    console.log('[PatientProfile] Fetching full user info from /api/auth/me...');
    this.authService.getAuthUserInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fullUserInfo: any) => {
          console.log('[PatientProfile] ✅ Full user info received from /api/auth/me:', JSON.stringify(fullUserInfo, null, 2));
          // Update authUser with full info
          this.authUser = fullUserInfo;
          console.log('[PatientProfile] authUser updated with full info:', JSON.stringify(this.authUser, null, 2));
          // Now load patient data
          this.loadProfileByEmail();
        },
        error: (err: any) => {
          console.warn('[PatientProfile] Could not fetch full user info, will use cached:', err);
          // Fall back to using what we have
          this.loadProfileByEmail();
        }
      });
  }

  private loadProfileByReferenceNumber(referenceNumber: string): void {
    this.profileDataService.loadProfileByReferenceNumber(referenceNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profileData: ProfileData) => {
          this.handlePatientDataLoaded(profileData.patientData);
        },
        error: (err: any) => {
          console.warn('[PatientProfile] Error loading by reference, falling back to email');
          this.loadProfileByEmail();
        }
      });
  }

  private loadProfileByEmail(): void {
    const email = this.authUser?.email;
    const referenceNumber = this.authUser?.referenceNumber;

    console.log('[PatientProfile] Loading patient data by email:', email);
    console.log('[PatientProfile] With reference number:', referenceNumber);
    console.log('[PatientProfile] authUser already loaded from AuthService:', JSON.stringify(this.authUser, null, 2));

    this.profileDataService.loadProfileByEmail(email, referenceNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profileData: ProfileData) => {
          console.log('[PatientProfile] 📥 Received profileData from service:', JSON.stringify(profileData, null, 2));
          console.log('[PatientProfile] 📥 profileData.patientData.location:', profileData.patientData?.location);
          console.log('[PatientProfile] 📥 profileData.patientData.address:', profileData.patientData?.address);
          // User data is already in this.authUser from AuthService
          // We only need to load patient data from Direct Service
          this.handlePatientDataLoaded(profileData.patientData);
        },
        error: (err: any) => {
          console.error('[PatientProfile] Error loading profile:', err);
          this.error = 'Failed to load profile data. Please try again.';
          this.initializeEmptyProfile();
        }
      });
  }

  private handlePatientDataLoaded(patientData: Patient): void {
    console.log('[PatientProfile] 🔍 handlePatientDataLoaded called');
    console.log('[PatientProfile] Patient data received:', JSON.stringify(patientData, null, 2));
    console.log('[PatientProfile] 🔍 patientData.location:', patientData?.location);
    console.log('[PatientProfile] 🔍 patientData.address:', patientData?.address);
    console.log('[PatientProfile] 🔍 patientData.city:', patientData?.city);
    console.log('[PatientProfile] 🔍 patientData.country:', patientData?.country);
    console.log('[PatientProfile] Current authUser (from AuthService):', JSON.stringify(this.authUser, null, 2));
    console.log('[PatientProfile] authUser.firstName:', this.authUser?.firstName);
    console.log('[PatientProfile] authUser.lastName:', this.authUser?.lastName);
    console.log('[PatientProfile] authUser.email:', this.authUser?.email);
    console.log('[PatientProfile] authUser.phone:', this.authUser?.phone);
    console.log('[PatientProfile] authUser.role:', this.authUser?.role);
    console.log('[PatientProfile] authUser.referenceNumber:', this.authUser?.referenceNumber);

    if (patientData && patientData.id) {
      this.patient = patientData;
      console.log('[PatientProfile] ✅ Patient data set:', patientData.id);
      console.log('[PatientProfile] ✅ After assignment - this.patient.location:', this.patient?.location);
      console.log('[PatientProfile] ✅ After assignment - this.patient.address:', this.patient?.address);
      console.log('[PatientProfile] ✅ After assignment - this.patient.city:', this.patient?.city);
      console.log('[PatientProfile] ✅ After assignment - this.patient.country:', this.patient?.country);
      this.populateForms(this.patient);
      this.success = 'Profile loaded successfully';
      setTimeout(() => (this.success = ''), 3000);
    } else {
      console.warn('[PatientProfile] No patient data found, initializing empty form');
      this.patient = {} as Patient;
      this.populateForms(this.patient);
    }

    this.loading = false;
  }

  private initializeEmptyProfile(): void {
    this.patient = {} as Patient;
    this.populateForms(this.patient);
    this.loading = false;
  }

  private populateForms(patient: Patient | any = {}): void {
    console.log('[PatientProfile] 📝 populateForms called with patient:', JSON.stringify(patient, null, 2));
    console.log('[PatientProfile] 📝 patient.location from parameter:', patient?.location);
    console.log('[PatientProfile] 📝 patient.address from parameter:', patient?.address);
    this.profileFormService.populateProfileForm(this.profileForm, patient, this.authUser);
    this.profileFormService.populateMedicalForm(this.medicalForm, patient);

    // After populating forms, verify what's in this.patient property
    console.log('[PatientProfile] 📝 After populateForms - this.patient.location:', this.patient?.location);
    console.log('[PatientProfile] 📝 After populateForms - this.patient.address:', this.patient?.address);
  }

  switchTab(tab: 'personal' | 'more' | 'security'): void {
    this.activeTab = tab;
    this.submitted = false;
    this.error = '';
    this.success = '';
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    this.submitted = false;
    this.error = '';
    this.success = '';

    if (!this.editMode && this.patient) {
      this.populateForms(this.patient);
    }
  }

  onFormChange(): void {
    this.hasChanges = true;
  }

  saveProfile(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    if (this.profileForm.invalid || !this.patient) {
      this.error = 'Please fix the errors in the form before saving.';
      return;
    }

    const referenceNumber = this.patient?.referenceNumber || this.authUser?.referenceNumber;

    if (!referenceNumber) {
      console.error('[PatientProfile] Reference number not available');
      this.error = 'Unable to save profile: Reference number not loaded. Please refresh the page.';
      return;
    }

    this.savingProfile = true;
    const formData = this.profileForm.getRawValue();

    // Use the new ProfileUpdateService which handles both backends
    this.profileUpdateService.updateProfile(referenceNumber, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[PatientProfile] ✅ Profile saved successfully');
          // Update local state with response data
          if (response.userData) {
            this.authUser = { ...this.authUser, ...response.userData };
          }
          if (response.patientData && Object.keys(response.patientData).length > 0) {
            this.patient = { ...this.patient, ...response.patientData };
          }
          this.populateForms(this.patient);
          this.success = 'Profile updated successfully!';
          this.editMode = false;
          this.submitted = false;
          this.savingProfile = false;
          this.hasChanges = false;

          setTimeout(() => (this.success = ''), 3000);
        },
        error: (err: any) => {
          console.error('[PatientProfile] Error saving profile:', err);
          this.error = err.message || 'Failed to update profile. Please try again.';
          this.savingProfile = false;
        }
      });
  }

  saveMedicalInfo(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    if (!this.patient) {
      this.error = 'Patient data not found';
      return;
    }

    const referenceNumber = this.patient?.referenceNumber || this.authUser?.referenceNumber;

    if (!referenceNumber) {
      this.error = 'Unable to save medical information: Reference number not found.';
      return;
    }

    this.savingProfile = true;
    const medicalData = this.medicalForm.getRawValue();

    // Use the new ProfileUpdateService for medical information updates
    this.profileUpdateService.updateMedicalInfo(referenceNumber, medicalData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedPatient: Patient) => {
          console.log('[PatientProfile] ✅ Medical information saved successfully');
          this.patient = { ...this.patient, ...updatedPatient };
          this.populateForms(this.patient);
          this.success = 'Medical information updated successfully!';
          this.editMode = false;
          this.submitted = false;
          this.savingProfile = false;
          this.hasChanges = false;

          setTimeout(() => (this.success = ''), 3000);
        },
        error: (err: any) => {
          console.error('[PatientProfile] Error updating medical info:', err);
          this.error = err.message || 'Failed to update medical information. Please try again.';
          this.savingProfile = false;
        }
      });
  }

  changePassword(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    // Use ProfileFormService for validation
    const validation = this.profileFormService.validatePasswordChange(this.passwordForm);

    if (!validation.valid) {
      this.error = validation.error || 'Invalid password form';
      return;
    }

    if (!this.authUser || !this.authUser.email) {
      this.error = 'User email not found. Please log in again.';
      return;
    }

    this.savingProfile = true;
    const passwordData = this.passwordForm.getRawValue();

    // Use the new PasswordUpdateService to change password via Auth Service
    this.passwordUpdateService.changePassword(this.authUser.email, {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      confirmPassword: passwordData.confirmPassword
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[PatientProfile] ✅ Password changed successfully');
          this.success = 'Password updated successfully!';
          this.passwordForm.reset();
          this.submitted = false;
          this.savingProfile = false;
          this.editMode = false;
          this.activeTab = 'personal'; // Return to personal tab after successful password change

          setTimeout(() => {
            this.success = '';
          }, 3000);
        },
        error: (err: any) => {
          console.error('[PatientProfile] Error changing password:', err);
          this.error = err.message || 'Failed to change password. Please try again.';
          this.savingProfile = false;
        }
      });
  }

  onProfilePictureSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = this.profileFileService.validateProfilePicture(file);

    if (!validation.valid) {
      this.error = validation.error || 'Invalid file';
      return;
    }

    this.profileFileService.createImagePreview(file).then((preview: string) => {
      this.profilePictureFile = file;
      this.profilePicturePreview = preview;
      this.error = '';
      console.log('[PatientProfile] Profile picture selected:', file.name);
    }).catch((err: any) => {
      this.error = 'Failed to load preview';
      console.error('[PatientProfile] Error creating preview:', err);
    });
  }

  onDocumentsSelected(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validation = this.profileFileService.validateDocuments(files, this.documents.length);

    if (!validation.valid) {
      this.error = validation.error || 'Invalid files';
      return;
    }

    this.error = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.documents.push(file);
      this.documentNames.push(file.name);
    }

    console.log('[PatientProfile] Documents selected:', this.documents.length, 'files');
  }

  removeDocument(index: number): void {
    this.documents.splice(index, 1);
    this.documentNames.splice(index, 1);
    console.log('[PatientProfile] Document removed, remaining:', this.documents.length);
  }

  clearProfilePicture(): void {
    this.profilePictureFile = null;
    this.profilePicturePreview = null;
    console.log('[PatientProfile] Profile picture cleared');
  }

  uploadProfilePicture(): void {
    if (!this.profilePictureFile) {
      this.error = 'Please select a profile picture first';
      return;
    }

    this.uploading = true;
    const formData = new FormData();
    formData.append('file', this.profilePictureFile);

    // TODO: Implement API call to upload profile picture
    console.log('[PatientProfile] Uploading profile picture:', this.profilePictureFile.name);

    setTimeout(() => {
      this.success = 'Profile picture uploaded successfully!';
      this.profilePictureFile = null;
      this.profilePicturePreview = null;
      this.uploading = false;
      setTimeout(() => this.success = '', 3000);
    }, 1500);
  }

  uploadDocuments(): void {
    if (this.documents.length === 0) {
      this.error = 'Please select documents to upload';
      return;
    }

    this.uploading = true;
    const formData = new FormData();

    for (let i = 0; i < this.documents.length; i++) {
      formData.append('files', this.documents[i]);
    }

    // TODO: Implement API call to upload documents
    console.log('[PatientProfile] Uploading', this.documents.length, 'documents');

    setTimeout(() => {
      this.success = `${this.documents.length} document(s) uploaded successfully!`;
      this.documents = [];
      this.documentNames = [];
      this.uploading = false;
      setTimeout(() => this.success = '', 3000);
    }, 1500);
  }

  goBackToDashboard(): void {
    // Navigate back to patient dashboard
    // This will be implemented when routing is available
    console.log('[PatientProfile] Going back to dashboard');
  }

  clearError(): void {
    this.error = '';
  }

  get f() {
    return this.profileForm.controls;
  }
}
