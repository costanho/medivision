import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CountryCodesService } from '../../../../core/services/country-codes.service';
import { RegisterValidatorsService } from './register-validators.service';
import { VALIDATION_PATTERNS, VALIDATION_RULES } from '../constants/validation.constants';

@Injectable({ providedIn: 'root' })
export class RegisterFormBuilderService {
  constructor(
    private fb: FormBuilder,
    private validators: RegisterValidatorsService,
    private countryCodesService: CountryCodesService
  ) {}

  /**
   * Build and return the complete registration form group
   */
  buildRegisterForm(): FormGroup {
    return this.fb.group(
      {
        firstName: [
          '',
          [Validators.required, Validators.minLength(VALIDATION_RULES.firstName.minLength)],
        ],
        surname: [
          '',
          [Validators.required, Validators.minLength(VALIDATION_RULES.surname.minLength)],
        ],
        email: ['', [Validators.required, this.validators.emailValidator()]],
        dateOfBirth: ['', Validators.required],
        gender: ['', Validators.required],
        phoneCountryCode: [this.countryCodesService.getDefaultCode()],
        phoneNumber: ['', [Validators.required, Validators.pattern(VALIDATION_PATTERNS.PHONE)]],
        documentType: ['nationalId', Validators.required],
        nationalIdNumber: [''],
        passportNumber: [''],
        country: [this.countryCodesService.getDefaultCountry()],
        city: [''],
        password: [
          '',
          [Validators.required, Validators.minLength(VALIDATION_RULES.password.minLength)],
        ],
        repeatPassword: [
          '',
          [Validators.required, Validators.minLength(VALIDATION_RULES.repeatPassword.minLength)],
        ],
        role: ['PATIENT', Validators.required],
      },
      { validators: this.validators.passwordMatchValidator() }
    );
  }
}
