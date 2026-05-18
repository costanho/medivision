import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DoctorService } from '../../services/routes-doctors/doctor.service';

interface DoctorProfile {
  // Personal Information
  id?: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  country: string;
  city: string;
  passportNumber?: string;
  nationalIdNumber?: string;
  mobilePhone?: string;

  // Professional Information
  specialization: string;
  isSpecialist?: boolean;
  licenseNumber: string;
  licenseIssuer?: string;
  yearsOfExperience: number;
  bio: string;
  profileImageUrl: string;
  clinic: string;
  address: string;
  state: string;
  zipCode: string;
  qualifications: string[];
  languages: string[];
  certifications: string[];

  // Specialist Qualifications
  specialty?: string;
  collegeBoard?: string;
  yearObtained?: number;
  fellowshipCertificateUrl?: string;
  specialistRegistrationUrl?: string;

  // Work Location
  primaryPracticeLocation?: string;
  hospitalsAdmittingTo?: string[];

  // Type of Practice
  typeOfPractice?: string; // GP / Specialist / Emergency / Surgeon / Telemedicine Only

  // Professional Indemnity Insurance
  insurerName?: string;
  policyNumber?: string;
  expiryDate?: string;
  malpracticeInsuranceCertificateUrl?: string;

  // Banking Details
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branchCode?: string;
  taxId?: string;

  // Profile Information
  shortBio?: string;
  areasOfInterest?: string[];
  consultationFees?: number;

  // Availability Schedule
  availabilitySchedule?: string;

  // Admin Verification
  status?: string; // Draft / Submitted / Under Review / Approved / Rejected / Suspended / Expired License
}

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './doctor-profile.component.html',
  styleUrls: ['./doctor-profile.component.scss']
})
export class DoctorProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  doctorProfile: DoctorProfile | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  authUser: any = null;
  loading = true;
  editing = false;
  changingPassword = false;
  submitted = false;
  passwordSubmitted = false;
  error = '';
  successMessage = '';
  savingProfile = false;
  hasChanges = false;
  activeTab: 'personal' | 'professional' | 'security' = 'personal';
  currentYear = new Date().getFullYear();

  // Available options loaded from database - NO HARDCODED DATA
  specializations: string[] = [];
  languages: string[] = [];
  certifications: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private doctorService: DoctorService
  ) {
    // Password change form with validators
    this.passwordForm = this.formBuilder.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator()
    });

    this.profileForm = this.formBuilder.group({
      // Personal Information Fields
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9\-\+\(\)\s]*$/)]],
      mobilePhone: ['', [Validators.pattern(/^[0-9\-\+\(\)\s]*$/)]],
      dateOfBirth: [''],
      gender: [''],
      country: [''],
      city: [''],
      passportNumber: [''],
      nationalIdNumber: [''],
      // Professional Information Fields
      specialization: ['', Validators.required],
      isSpecialist: [false],
      licenseNumber: ['', Validators.required],
      yearsOfExperience: ['', [Validators.required, Validators.min(0)]],
      bio: [''],
      profileImageUrl: [''],
      clinic: [''],
      address: [''],
      state: [''],
      zipCode: [''],
      // Specialist Qualifications (if applicable)
      specialty: [''],
      collegeBoard: [''],
      yearObtained: [''],
      fellowshipCertificateUrl: [''],
      specialistRegistrationUrl: [''],
      // Work Location & Privileges
      primaryPracticeLocation: [''],
      hospitalsAdmittingTo: [[]],
      // Type of Practice
      typeOfPractice: [''],
      // Professional Indemnity Insurance
      insurerName: [''],
      policyNumber: [''],
      expiryDate: [''],
      malpracticeInsuranceCertificateUrl: [''],
      // Banking Details
      bankName: [''],
      accountName: [''],
      accountNumber: [''],
      branchCode: [''],
      taxId: [''],
      // Profile Information
      shortBio: [''],
      areasOfInterest: [[]],
      consultationFees: [''],
      // Availability Schedule
      availabilitySchedule: [''],
      // Admin Verification Status
      status: ['Draft'],
      // Lists
      qualifications: [[]],
      languages: [[]],
      certifications: [[]]
    });
  }

  /**
   * Custom validator to check if newPassword and confirmPassword match
   */
  private passwordMatchValidator() {
    return (formGroup: FormGroup) => {
      const newPassword = formGroup.get('newPassword');
      const confirmPassword = formGroup.get('confirmPassword');

      if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
        confirmPassword.setErrors({ passwordMismatch: true });
      } else if (confirmPassword && confirmPassword.hasError('passwordMismatch')) {
        confirmPassword.setErrors(null);
      }

      return null;
    };
  }

  ngOnInit(): void {
    console.log('[DoctorProfile] Component initialized');
    this.loadDoctorProfile();
    this.loadAvailableOptions();
  }

  /**
   * Load available options from database
   * Specializations, languages, and certifications from backend
   * Data sources: doctor table fields
   */
  private loadAvailableOptions(): void {
    console.log('[DoctorProfile] Loading available options from database');

    // Load specializations from backend
    // Data source: doctor table (specialization field)
    this.doctorService.getSpecializations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (specs: string[]) => {
          this.specializations = specs;
          console.log('[DoctorProfile] Specializations loaded:', specs);
        },
        error: (error: any) => {
          console.error('[DoctorProfile] Error loading specializations:', error);
          this.specializations = [];
        }
      });

    // Load languages from backend
    // Data source: doctor table (languages field)
    this.doctorService.getLanguages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (langs: string[]) => {
          this.languages = langs;
          console.log('[DoctorProfile] Languages loaded:', langs);
        },
        error: (error: any) => {
          console.error('[DoctorProfile] Error loading languages:', error);
          this.languages = [];
        }
      });

    // Load certifications from backend
    // Data source: doctor table (certifications field)
    this.doctorService.getCertifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (certs: string[]) => {
          this.certifications = certs;
          console.log('[DoctorProfile] Certifications loaded:', certs);
        },
        error: (error: any) => {
          console.error('[DoctorProfile] Error loading certifications:', error);
          this.certifications = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDoctorProfile(): void {
    this.loading = true;
    this.authUser = this.authService.getCurrentUser();

    console.log('[DoctorProfile] Current user:', this.authUser?.referenceNumber);

    if (!this.authUser?.referenceNumber) {
      this.loading = false;
      this.error = 'User reference not available';
      return;
    }

    // Fetch complete doctor profile from backend by reference number
    // This retrieves data from: user (auth), user_information, and doctor tables
    this.doctorService.getCompleteProfile(this.authUser.referenceNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doctor) => {
          console.log('[DoctorProfile] Complete profile data loaded:', doctor);

          // Map backend doctor data to component profile format
          this.doctorProfile = {
            id: doctor.id?.toString() || '',
            // From Auth User Table
            name: doctor.name || (doctor.firstName && doctor.lastName ? doctor.firstName + ' ' + doctor.lastName : this.authUser?.fullName || ''),
            email: doctor.email || this.authUser?.email || '',
            phone: doctor.phone || doctor.officePhone || '',
            mobilePhone: doctor.phone || '',
            // From User Information Table (Direct DB)
            dateOfBirth: doctor.dateOfBirth ? new Date(doctor.dateOfBirth).toISOString().split('T')[0] : '',
            gender: doctor.gender || '',
            country: doctor.country || '',
            city: doctor.city || doctor.officeCity || '',
            passportNumber: doctor.passportNumber || '',
            nationalIdNumber: doctor.nationalIdNumber || '',
            // Professional Information (From Doctor Table)
            specialization: doctor.specialization || doctor.specializations || '',
            isSpecialist: false,
            licenseNumber: doctor.licenseNumber || '',
            licenseIssuer: doctor.licenseIssuer || '',
            yearsOfExperience: doctor.yearsOfExperience || 0,
            bio: '',
            profileImageUrl: '',
            clinic: '',
            address: doctor.officeAddress || '',
            state: doctor.officeState || '',
            zipCode: doctor.officeZipCode || '',
            qualifications: doctor.education ? [doctor.education] : [],
            languages: doctor.languages ? doctor.languages.split(',').map(l => l.trim()) : [],
            certifications: doctor.certifications ? doctor.certifications.split(',').map(c => c.trim()) : [],
            // Specialist Qualifications
            specialty: doctor.specialization || '',
            collegeBoard: '',
            yearObtained: undefined,
            fellowshipCertificateUrl: '',
            specialistRegistrationUrl: '',
            // Work Location
            primaryPracticeLocation: doctor.officeAddress || '',
            hospitalsAdmittingTo: doctor.affiliations ? [doctor.affiliations] : [],
            // Type of Practice
            typeOfPractice: '',
            // Professional Indemnity Insurance
            insurerName: '',
            policyNumber: '',
            expiryDate: '',
            malpracticeInsuranceCertificateUrl: '',
            // Banking Details
            bankName: '',
            accountName: '',
            accountNumber: '',
            branchCode: '',
            taxId: '',
            // Profile Information
            shortBio: '',
            areasOfInterest: [],
            consultationFees: undefined,
            // Availability Schedule
            availabilitySchedule: doctor.workingHours || '',
            // Admin Verification
            status: 'Draft'
          };

          this.populateForm(this.doctorProfile);
          this.loading = false;
          this.error = '';
          console.log('[DoctorProfile] Profile loaded successfully from all sources');
        },
        error: (error) => {
          console.error('[DoctorProfile] Error loading doctor profile:', error);
          this.error = 'Failed to load profile. Using empty form.';
          this.loading = false;

          // Initialize with empty profile as fallback
          this.doctorProfile = {
            id: '',
            name: this.authUser?.fullName || '',
            email: this.authUser?.email || '',
            phone: '',
            mobilePhone: '',
            dateOfBirth: '',
            gender: '',
            country: '',
            city: '',
            passportNumber: '',
            nationalIdNumber: '',
            specialization: '',
            isSpecialist: false,
            licenseNumber: '',
            licenseIssuer: '',
            yearsOfExperience: 0,
            bio: '',
            profileImageUrl: '',
            clinic: '',
            address: '',
            state: '',
            zipCode: '',
            qualifications: [],
            languages: [],
            certifications: [],
            specialty: '',
            collegeBoard: '',
            yearObtained: undefined,
            fellowshipCertificateUrl: '',
            specialistRegistrationUrl: '',
            primaryPracticeLocation: '',
            hospitalsAdmittingTo: [],
            typeOfPractice: '',
            insurerName: '',
            policyNumber: '',
            expiryDate: '',
            malpracticeInsuranceCertificateUrl: '',
            bankName: '',
            accountName: '',
            accountNumber: '',
            branchCode: '',
            taxId: '',
            shortBio: '',
            areasOfInterest: [],
            consultationFees: undefined,
            availabilitySchedule: '',
            status: 'Draft'
          };
          this.populateForm(this.doctorProfile);
        }
      });
  }

  private populateForm(profile: DoctorProfile): void {
    this.profileForm.patchValue({
      // Personal Information
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      mobilePhone: profile.mobilePhone || '',
      dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || '',
      country: profile.country,
      city: profile.city,
      passportNumber: profile.passportNumber || '',
      nationalIdNumber: profile.nationalIdNumber || '',
      // Professional Information
      specialization: profile.specialization,
      isSpecialist: profile.isSpecialist || false,
      licenseNumber: profile.licenseNumber,
      yearsOfExperience: profile.yearsOfExperience,
      bio: profile.bio,
      profileImageUrl: profile.profileImageUrl,
      clinic: profile.clinic,
      address: profile.address,
      state: profile.state,
      zipCode: profile.zipCode,
      // Specialist Qualifications
      specialty: profile.specialty || '',
      collegeBoard: profile.collegeBoard || '',
      yearObtained: profile.yearObtained || '',
      fellowshipCertificateUrl: profile.fellowshipCertificateUrl || '',
      specialistRegistrationUrl: profile.specialistRegistrationUrl || '',
      // Work Location
      primaryPracticeLocation: profile.primaryPracticeLocation || '',
      hospitalsAdmittingTo: profile.hospitalsAdmittingTo || [],
      // Type of Practice
      typeOfPractice: profile.typeOfPractice || '',
      // Professional Indemnity Insurance
      insurerName: profile.insurerName || '',
      policyNumber: profile.policyNumber || '',
      expiryDate: profile.expiryDate || '',
      malpracticeInsuranceCertificateUrl: profile.malpracticeInsuranceCertificateUrl || '',
      // Banking Details
      bankName: profile.bankName || '',
      accountName: profile.accountName || '',
      accountNumber: profile.accountNumber || '',
      branchCode: profile.branchCode || '',
      taxId: profile.taxId || '',
      // Profile Information
      shortBio: profile.shortBio || '',
      areasOfInterest: profile.areasOfInterest || [],
      consultationFees: profile.consultationFees || '',
      // Availability Schedule
      availabilitySchedule: profile.availabilitySchedule || '',
      // Admin Verification Status
      status: profile.status || 'Draft',
      // Lists
      qualifications: profile.qualifications,
      languages: profile.languages,
      certifications: profile.certifications
    });
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    this.submitted = false;
    this.error = '';
    this.successMessage = '';
    if (!this.editing && this.doctorProfile) {
      this.populateForm(this.doctorProfile);
    }
  }

  onFormChange(): void {
    this.hasChanges = true;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.successMessage = '';

    if (this.profileForm.invalid || !this.doctorProfile || !this.authUser?.referenceNumber) {
      this.error = 'Please fix the errors in the form before saving.';
      return;
    }

    this.savingProfile = true;
    console.log('[DoctorProfile] Saving profile with data:', this.profileForm.value);

    // Call backend to update profile
    // Data sources: doctor table fields
    this.doctorService.updateCompleteProfile(this.profileForm.value, this.authUser.referenceNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProfile: any) => {
          console.log('[DoctorProfile] Profile updated successfully:', updatedProfile);
          this.doctorProfile = {
            ...this.doctorProfile!,
            ...updatedProfile
          };
          this.successMessage = 'Profile updated successfully!';
          this.editing = false;
          this.submitted = false;
          this.savingProfile = false;
          this.hasChanges = false;

          setTimeout(() => {
            this.successMessage = '';
          }, 3000);

          console.log('[DoctorProfile] Profile saved');
        },
        error: (error: any) => {
          console.error('[DoctorProfile] Error updating profile:', error);
          this.error = error.error?.message || 'Failed to update profile. Please try again.';
          this.savingProfile = false;
        }
      });
  }

  /**
   * Handle password change form submission
   * Calls backend to validate current password and update to new password
   * Data sources: auth_user table (password verification and update)
   */
  onChangePassword(): void {
    this.passwordSubmitted = true;
    this.error = '';
    this.successMessage = '';

    if (this.passwordForm.invalid || !this.authUser?.referenceNumber) {
      this.error = 'Please fix the errors in the password form before saving.';
      return;
    }

    this.savingProfile = true;
    const currentPassword = this.passwordForm.value.currentPassword;
    const newPassword = this.passwordForm.value.newPassword;

    console.log('[DoctorProfile] Attempting to change password for reference:', this.authUser.referenceNumber);

    // Call backend to change password
    // Data sources: auth_user table (password validation and update)
    this.doctorService.changePassword(this.authUser.referenceNumber, currentPassword, newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[DoctorProfile] Password changed successfully:', response);
          this.successMessage = 'Password changed successfully!';
          this.cancelPasswordChange();
          this.savingProfile = false;

          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error: any) => {
          console.error('[DoctorProfile] Error changing password:', error);
          this.error = error.error?.error || error.error?.message || 'Failed to change password. Please check your current password.';
          this.savingProfile = false;
        }
      });
  }

  /**
   * Cancel password change and reset the form
   */
  cancelPasswordChange(): void {
    this.changingPassword = false;
    this.passwordSubmitted = false;
    this.passwordForm.reset();
    this.error = '';
    console.log('[DoctorProfile] Password change cancelled');
  }

  /**
   * Toggle password change form visibility
   */
  togglePasswordChange(): void {
    this.changingPassword = !this.changingPassword;
    this.passwordSubmitted = false;
    this.passwordForm.reset();
    this.error = '';
    this.successMessage = '';
    console.log('[DoctorProfile] Password change form toggled:', this.changingPassword);
  }

  toggleQualification(qualification: string): void {
    const qualifications = this.profileForm.get('qualifications')?.value || [];
    const index = qualifications.indexOf(qualification);
    if (index > -1) {
      qualifications.splice(index, 1);
    } else {
      qualifications.push(qualification);
    }
    this.profileForm.patchValue({ qualifications });
    this.onFormChange();
  }

  toggleLanguage(language: string): void {
    const languages = this.profileForm.get('languages')?.value || [];
    const index = languages.indexOf(language);
    if (index > -1) {
      languages.splice(index, 1);
    } else {
      languages.push(language);
    }
    this.profileForm.patchValue({ languages });
    this.onFormChange();
  }

  toggleCertification(certification: string): void {
    const certifications = this.profileForm.get('certifications')?.value || [];
    const index = certifications.indexOf(certification);
    if (index > -1) {
      certifications.splice(index, 1);
    } else {
      certifications.push(certification);
    }
    this.profileForm.patchValue({ certifications });
    this.onFormChange();
  }

  toggleAreaOfInterest(area: string): void {
    const areasOfInterest = this.profileForm.get('areasOfInterest')?.value || [];
    const index = areasOfInterest.indexOf(area);
    if (index > -1) {
      areasOfInterest.splice(index, 1);
    } else {
      areasOfInterest.push(area);
    }
    this.profileForm.patchValue({ areasOfInterest });
    this.onFormChange();
  }

  goBackToDashboard(): void {
    this.router.navigate(['/doctor/nexus-direct']);
  }

  clearError(): void {
    this.error = '';
  }

  onProfileImageSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (files && files.length > 0) {
      const file = files[0];

      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        this.error = 'Please select a valid image file';
        return;
      }

      // Create a FileReader to convert to base64
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result as string;
        if (result) {
          // Update form control with base64 data URL
          this.profileForm.patchValue({
            profileImageUrl: result
          });
          this.onFormChange();
          console.log('[DoctorProfile] Profile image selected');
        }
      };
      reader.readAsDataURL(file);
    }
  }

  get f() {
    return this.profileForm.controls;
  }

  get pf() {
    return this.passwordForm.controls;
  }
}
