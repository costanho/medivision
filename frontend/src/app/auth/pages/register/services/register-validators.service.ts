import { Injectable } from '@angular/core';
import { AbstractControl, FormGroup, ValidatorFn } from '@angular/forms';
import { VALIDATION_PATTERNS } from '../constants/validation.constants';

@Injectable({ providedIn: 'root' })
export class RegisterValidatorsService {
  /**
   * Email validator using regex pattern
   */
  emailValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) {
        return null;
      }
      const isValid = VALIDATION_PATTERNS.EMAIL.test(control.value);
      return isValid ? null : { invalidEmail: true };
    };
  }

  /**
   * Password match validator for form group
   */
  passwordMatchValidator(): ValidatorFn {
    return (formGroup: AbstractControl) => {
      const password = formGroup.get('password')?.value;
      const repeatPassword = formGroup.get('repeatPassword')?.value;

      if (!password || !repeatPassword) {
        return null;
      }

      return password === repeatPassword ? null : { passwordMismatch: true };
    };
  }

  /**
   * Validate document type field based on selected type
   */
  validateDocumentFields(form: FormGroup): void {
    const documentType = form.get('documentType')?.value;
    const nationalIdField = form.get('nationalIdNumber');
    const passportField = form.get('passportNumber');

    if (documentType === 'nationalId' && !nationalIdField?.value) {
      nationalIdField?.setErrors({ required: true });
    }
    if (documentType === 'passport' && !passportField?.value) {
      passportField?.setErrors({ required: true });
    }
  }
}
