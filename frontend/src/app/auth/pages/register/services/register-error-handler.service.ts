import { Injectable } from '@angular/core';
import { VALIDATION_MESSAGES } from '../constants/validation.constants';

@Injectable({ providedIn: 'root' })
export class RegisterErrorHandlerService {
  /**
   * Get validation error message for a control
   */
  getErrorMessage(controlName: string, errors: any): string {
    if (!errors) {
      return '';
    }

    const messages =
      VALIDATION_MESSAGES[controlName as keyof typeof VALIDATION_MESSAGES];

    if (!messages) {
      return 'Invalid input';
    }

    // Return the first error message found
    for (const [errorKey] of Object.entries(errors || {})) {
      return messages[errorKey as keyof typeof messages] || 'Invalid input';
    }

    return '';
  }

  /**
   * Extract API error message from error response
   */
  extractApiError(error: any): string {
    if (!error) {
      return 'An unexpected error occurred. Please try again.';
    }

    return (
      error?.error?.message ||
      error?.error?.error ||
      error?.message ||
      'Registration failed. Please try again.'
    );
  }

  /**
   * Get password mismatch error message
   */
  getPasswordMismatchMessage(formErrors: any, repeatPasswordTouched: boolean): string {
    if (formErrors?.['passwordMismatch'] && repeatPasswordTouched) {
      return VALIDATION_MESSAGES.repeatPassword.passwordMismatch;
    }
    return '';
  }
}
