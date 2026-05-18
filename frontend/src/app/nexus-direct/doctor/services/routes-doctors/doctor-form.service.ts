import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/**
 * Service for creating and managing doctor profile forms
 * Handles form structure, validation, and population
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorFormService {

  constructor(private fb: FormBuilder) {}

  /**
   * Create doctor personal information form
   * Fields: firstName, lastName, email, phone, dateOfBirth, gender, nationality, passportNumber, nationalIdNumber
   */
  createPersonalForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9\-\+\s\(\)]+$/)]],
      dateOfBirth: [''],
      gender: [''],
      country: [''],
      city: [''],
      location: [''],
      nationalIdNumber: [''],
      passportNumber: ['']
    });
  }

  /**
   * Create doctor professional information form
   * Fields: specialization, yearsOfExperience, licenseNumber, licenseIssuer, languages, certifications, education
   */
  createProfessionalForm(): FormGroup {
    return this.fb.group({
      specialization: ['', Validators.required],
      specializations: [''],
      yearsOfExperience: ['', [Validators.required, Validators.min(0)]],
      licenseNumber: ['', Validators.required],
      licenseIssuer: [''],
      languages: [''],
      certifications: [''],
      education: [''],
      affiliations: [''],
      appointmentDuration: [''],
      notes: ['']
    });
  }

  /**
   * Create doctor office information form
   * Fields: officeAddress, officeCity, officeState, officeZipCode, officePhone, officeFax
   */
  createOfficeForm(): FormGroup {
    return this.fb.group({
      officeAddress: [''],
      officeCity: [''],
      officeState: [''],
      officeZipCode: [''],
      officePhone: ['', Validators.pattern(/^[0-9\-\+\s\(\)]*$/)],
      officeFax: ['']
    });
  }

  /**
   * Create doctor emergency contact form
   */
  createEmergencyContactForm(): FormGroup {
    return this.fb.group({
      emergencyContact: [''],
      emergencyContactPhone: ['', Validators.pattern(/^[0-9\-\+\s\(\)]*$/)]
    });
  }

  /**
   * Create doctor work schedule form
   * Fields: workingDays, workingHours, totalPatients, rating
   */
  createWorkScheduleForm(): FormGroup {
    return this.fb.group({
      workingDays: [''],
      workingHours: [''],
      totalPatients: ['', Validators.min(0)],
      rating: ['', [Validators.min(0), Validators.max(5)]]
    });
  }

  /**
   * Create password change form
   */
  createPasswordForm(): FormGroup {
    return this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  /**
   * Populate personal form with doctor data
   */
  populatePersonalForm(form: FormGroup, doctor: any): void {
    if (!doctor) return;

    form.patchValue({
      firstName: doctor.firstName || '',
      lastName: doctor.lastName || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      dateOfBirth: doctor.dateOfBirth || '',
      gender: doctor.gender || '',
      country: doctor.country || '',
      city: doctor.city || '',
      location: doctor.location || '',
      nationalIdNumber: doctor.nationalIdNumber || '',
      passportNumber: doctor.passportNumber || ''
    });

    // Make email readonly
    form.get('email')?.disable();
  }

  /**
   * Populate professional form with doctor data
   */
  populateProfessionalForm(form: FormGroup, doctor: any): void {
    if (!doctor) return;

    form.patchValue({
      specialization: doctor.specialization || '',
      specializations: doctor.specializations || '',
      yearsOfExperience: doctor.yearsOfExperience || '',
      licenseNumber: doctor.licenseNumber || '',
      licenseIssuer: doctor.licenseIssuer || '',
      languages: doctor.languages || '',
      certifications: doctor.certifications || '',
      education: doctor.education || '',
      affiliations: doctor.affiliations || '',
      appointmentDuration: doctor.appointmentDuration || '',
      notes: doctor.notes || ''
    });
  }

  /**
   * Populate office form with doctor data
   */
  populateOfficeForm(form: FormGroup, doctor: any): void {
    if (!doctor) return;

    form.patchValue({
      officeAddress: doctor.officeAddress || '',
      officeCity: doctor.officeCity || '',
      officeState: doctor.officeState || '',
      officeZipCode: doctor.officeZipCode || '',
      officePhone: doctor.officePhone || '',
      officeFax: doctor.officeFax || ''
    });
  }

  /**
   * Populate emergency contact form with doctor data
   */
  populateEmergencyContactForm(form: FormGroup, doctor: any): void {
    if (!doctor) return;

    form.patchValue({
      emergencyContact: doctor.emergencyContact || '',
      emergencyContactPhone: doctor.emergencyContactPhone || ''
    });
  }

  /**
   * Populate work schedule form with doctor data
   */
  populateWorkScheduleForm(form: FormGroup, doctor: any): void {
    if (!doctor) return;

    form.patchValue({
      workingDays: doctor.workingDays || '',
      workingHours: doctor.workingHours || '',
      totalPatients: doctor.totalPatients || '',
      rating: doctor.rating || ''
    });
  }

  /**
   * Validate password change
   */
  validatePasswordChange(form: FormGroup): { valid: boolean; error?: string } {
    if (!form.valid) {
      return { valid: false, error: 'Please fill in all required fields' };
    }

    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    if (newPassword !== confirmPassword) {
      return { valid: false, error: 'Passwords do not match' };
    }

    if (newPassword.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }

    return { valid: true };
  }

  /**
   * Custom validator for password confirmation
   */
  private passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }
}
