import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Patient } from '../../services/patient.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileFormService {
  constructor(private formBuilder: FormBuilder) {}

  /**
   * Create and initialize profile form (personal information)
   * Contains fields for email, name, contact, and identification
   */
  createProfileForm(): FormGroup {
    console.log('[ProfileFormService] Creating profile form');

    return this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      mobilePhone: [''],
      dateOfBirth: [''],
      gender: [''],
      address: [''],
      location: [''],
      city: [''],
      state: [''],
      country: [''],
      zipCode: [''],
      nationalIdNumber: [''],
      passportNumber: [''],
      role: [''],
      referenceNumber: [''],
      createdAt: ['']
    });
  }

  /**
   * Create and initialize medical form
   * Contains fields for health, emergency contacts, and insurance
   */
  createMedicalForm(): FormGroup {
    console.log('[ProfileFormService] Creating medical form');

    return this.formBuilder.group({
      bloodType: [''],
      height: [''],
      weight: [''],
      medicalConditions: [''],
      allergies: [''],
      currentMedications: [''],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      emergencyContactRelation: [''],
      insuranceProvider: [''],
      insurancePolicy: [''],
      insuranceGroupId: [''],
      nationalIdNumber: [''],
      passportNumber: [''],
      notes: ['']
    });
  }

  /**
   * Create and initialize password form
   * Contains fields for password change
   */
  createPasswordForm(): FormGroup {
    console.log('[ProfileFormService] Creating password form');

    return this.formBuilder.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    });
  }

  /**
   * Populate profile form with user and patient data
   * Maps user data from userData object and patient data from patient object
   */
  populateProfileForm(
    profileForm: FormGroup,
    patient: Patient | any,
    authUser: any
  ): void {
    console.log('[ProfileFormService] 🔍 populateProfileForm called with:');
    console.log('[ProfileFormService] authUser parameter:', JSON.stringify(authUser, null, 2));
    console.log('[ProfileFormService] patient parameter:', JSON.stringify(patient, null, 2));
    console.log('[ProfileFormService] authUser?.firstName:', authUser?.firstName);
    console.log('[ProfileFormService] authUser?.lastName:', authUser?.lastName);
    console.log('[ProfileFormService] authUser?.fullName:', authUser?.fullName);
    console.log('[ProfileFormService] authUser?.email:', authUser?.email);
    console.log('[ProfileFormService] authUser?.phone:', authUser?.phone);

    // Helper function to extract firstName and lastName from authUser
    // authUser might have:
    // 1. firstName + lastName (from /api/auth/me)
    // 2. fullName (from login response)
    const getFirstName = (): string => {
      if (authUser?.firstName) return authUser.firstName;
      if (authUser?.fullName) {
        const parts = authUser.fullName.split(' ');
        return parts[0] || '';
      }
      return patient?.firstName || '';
    };

    const getLastName = (): string => {
      if (authUser?.lastName) return authUser.lastName;
      if (authUser?.fullName) {
        const parts = authUser.fullName.split(' ');
        return parts.slice(1).join(' ') || '';
      }
      return patient?.lastName || '';
    };

    // Populate with user data (from userData in ProfileData)
    // userData contains: email, firstName, lastName, phone, password, referenceNumber, role
    const formValues = {
      firstName: getFirstName(),
      lastName: getLastName(),
      email: authUser?.email || patient?.email || '',
      mobilePhone: authUser?.phone || authUser?.mobilePhone || patient?.phone || patient?.mobilePhone || '',
      dateOfBirth: patient?.dateOfBirth || '',
      gender: patient?.gender || '',
      address: patient?.address || '',
      location: patient?.location || '',
      city: patient?.city || '',
      state: patient?.state || '',
      country: patient?.country || '',
      zipCode: patient?.zipCode || '',
      nationalIdNumber: patient?.nationalIdNumber || '',
      passportNumber: patient?.passportNumber || '',
      role: authUser?.role || patient?.role || '',
      referenceNumber: authUser?.referenceNumber || patient?.referenceNumber || '',
      createdAt: patient?.createdAt || authUser?.createdAt || ''
    };

    console.log('[ProfileFormService] 📝 Form values to be patched:', JSON.stringify(formValues, null, 2));

    profileForm.patchValue(formValues);

    console.log('[ProfileFormService] ✅ Profile form populated');
    console.log('[ProfileFormService] Form control values after patching:');
    console.log('[ProfileFormService] profileForm.get("firstName").value:', profileForm.get('firstName')?.value);
    console.log('[ProfileFormService] profileForm.get("lastName").value:', profileForm.get('lastName')?.value);
    console.log('[ProfileFormService] profileForm.get("email").value:', profileForm.get('email')?.value);
    console.log('[ProfileFormService] profileForm.get("mobilePhone").value:', profileForm.get('mobilePhone')?.value);
  }

  /**
   * Populate medical form with patient data
   * Maps patient medical properties to form controls
   */
  populateMedicalForm(
    medicalForm: FormGroup,
    patient: Patient | any
  ): void {
    console.log('[ProfileFormService] Populating medical form with patient data');

    // Initialize all fields as empty for user to fill in
    medicalForm.patchValue({
      bloodType: '',
      height: '',
      weight: '',
      medicalConditions: '',
      allergies: '',
      currentMedications: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      insuranceProvider: '',
      insurancePolicy: '',
      insuranceGroupId: '',
      nationalIdNumber: '',
      passportNumber: '',
      notes: ''
    });

    console.log('[ProfileFormService] Medical form initialized with empty fields');
  }

  /**
   * Validate password change form
   * Ensures passwords match and meet minimum requirements
   */
  validatePasswordChange(form: FormGroup): { valid: boolean; error?: string } {
    console.log('[ProfileFormService] Validating password change form');

    if (form.invalid) {
      return { valid: false, error: 'Please fill in all password fields' };
    }

    const { newPassword, confirmPassword } = form.value;

    if (newPassword !== confirmPassword) {
      return { valid: false, error: 'New passwords do not match' };
    }

    if (newPassword.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' };
    }

    console.log('[ProfileFormService] Password validation passed');
    return { valid: true };
  }

  /**
   * Get form controls helper
   * Provides easy access to form controls for template validation
   */
  getFormControls(form: FormGroup): { [key: string]: any } {
    return form.controls;
  }
}
