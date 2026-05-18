//import { RegistrationFormData } from './../../services/registration-models';
/**
 * Registration Handler Service
 *
 * Orchestrates the complete registration process across multiple services and databases.
 *
 * Flow:
 * 1. User submits registration form
 * 2. Handler validates form data
 * 3. Handler splits data into auth_user and user_information records
 * 4. Handler calls AuthUserService to create auth_user record
 * 5. Handler calls UserInformationService to create user_information record
 * 6. Handler returns combined response to component
 *
 * This service acts as the "conductor" that ensures both database operations
 * succeed together and handles synchronization between tables.
 */

import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import {
  RegistrationFormData,
  AuthUserData,
  UserInformation,
  RegistrationRequest,
  RegistrationResponse
} from './registration-models';
import { AuthUserService } from './auth-user.service';
import { UserInformationService } from './user-information.service';
import { HttpClient } from '@angular/common/http';
import { SystemNumberService } from './system-number.service';

export interface CompleteRegistrationResponse {
  success: boolean;
  message: string;
  authUser?: AuthUserData;
  userInformation?: UserInformation;
  referenceNumber?: string;
  email?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationHandlerService {
  // ─────────────────────────────────────────────────────────────────────
  // Service: RegistrationHandlerService
  // Purpose: Orchestrate multi-step registration process
  // Scope: Coordinate between auth_user and user_information tables
  // ─────────────────────────────────────────────────────────────────────

  constructor(
    private authUserService: AuthUserService,
    private userInformationService: UserInformationService,
    private refnumberService: SystemNumberService
  ) {
    console.log('[RegistrationHandlerService] ✅ Service initialized');
  }

  // ═════════════════════════════════════════════════════════════════════
  // MAIN REGISTRATION FLOW
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Handle complete user registration
   *
   * Process:
   * 1. Validate input data
   * 2. Extract auth_user data (credentials, identity, role)
   * 3. Extract user_information data (profile, documents)
   * 4. Create auth_user record first
   * 5. Create user_information record second (linked via referenceNumber)
   * 6. Return combined success response
   *
   * @param formData - Complete form data from registration form
   * @returns Observable with complete registration response
   *
   * Example:
   * const formData = {
   *   referenceNumber: "AUTH-12345-6789",
   *   firstName: "John",
   *   surname: "Doe",
   *   email: "john@example.com",
   *   password: "SecurePass123",
   *   role: "PATIENT",
   *   phoneCountryCode: "+263",
   *   phoneNumber: "712345678",
   *   dateOfBirth: "1990-05-15",
   *   gender: "Male",
   *   country: "Zimbabwe",
   *   city: "Harare",
   *   documentType: "nationalId",
   *   nationalIdNumber: "ZW123456789"
   * };
   *
   * this.registrationHandler.completeRegistration(formData).subscribe(
   *   response => {
   *     if (response.success) {
   *       console.log("Registration complete:", response.referenceNumber);
   *     } else {
   *       console.error("Registration failed:", response.error);
   *     }
   *   }
   * );
   */
  public completeRegistration(formData: RegistrationFormData): Observable<CompleteRegistrationResponse> {
    console.log('[RegistrationHandlerService] 🚀 Starting complete registration process...');
    console.log('[RegistrationHandlerService] 📋 Registration details:', {
      referenceNumber: formData.referenceNumber,
      email: formData.email,
      firstName: formData.firstName,
      role: formData.role
    });

    // Step 1: Validate input data
    const validationError = this.validateFormData(formData);
    if (validationError) {
      console.error('[RegistrationHandlerService] ❌ Validation failed:', validationError);
      return of({
        success: false,
        message: 'Validation failed',
        error: validationError
      });
    }

    console.log('[RegistrationHandlerService] ✅ Form data validated successfully');

    // Step 2: Extract and prepare data for auth_user table
    const authUserData = this.extractAuthUserData(formData);
    console.log('[RegistrationHandlerService] 📤 Extracted auth user data:', {
      referenceNumber: authUserData.referenceNumber,
      email: authUserData.email,
      role: authUserData.role
    });

    // Step 3: Extract and prepare data for user_information table
    const userInfoData = this.extractUserInformationData(formData);
    console.log('[RegistrationHandlerService] 📤 Extracted user information data:', {
      referenceNumber: userInfoData.referenceNumber,
      country: userInfoData.country,
      city: userInfoData.city
    });

    // Step 4: Create auth_user record first (must exist before user_information)
    return this.authUserService.registerUser(authUserData).pipe(
      switchMap(authResponse => {
        if (!authResponse.success) {
          console.error('[RegistrationHandlerService] ❌ Auth user creation failed');
          throw new Error('Failed to create auth user');
        }

        console.log('[RegistrationHandlerService] ✅ Auth user created successfully');

        // Step 5: Create user_information record (linked via referenceNumber)
        return this.userInformationService.createUserInfo(userInfoData).pipe(
          map(createdUserInfo => {
            // Step 6: Return combined success response
            const response: CompleteRegistrationResponse = {
              success: true,
              message: 'Registration completed successfully',
              referenceNumber: authResponse.data?.referenceNumber,
              email: authResponse.data?.email,
              authUser: {
                referenceNumber: authResponse.data?.referenceNumber || '',
                email: authResponse.data?.email || '',
                firstName: formData.firstName,
                lastName: formData.surname,
                role: formData.role as any,
                mobilePhone: this.combinedPhone(formData),
                id: authResponse.data?.id
              },
              userInformation: createdUserInfo
            };

            console.log('[RegistrationHandlerService] ✅ Complete registration successful:', {
              referenceNumber: response.referenceNumber,
              email: response.email
            });

            return response;
          }),
          catchError(error => {
            console.error('[RegistrationHandlerService] ❌ User information creation failed');
            console.error('[RegistrationHandlerService] ⚠️  Auth user was created but profile creation failed');
            console.error('[RegistrationHandlerService] ⚠️  Backend should handle cleanup or manual intervention');

            throw new Error(`Profile creation failed: ${error.message}`);
          })
        );
      }),
      catchError(error => {
        console.error('[RegistrationHandlerService] ❌ Registration failed:', error.message);

        return of({
          success: false,
          message: 'Registration failed',
          error: error.message
        });
      })
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // DATA EXTRACTION METHODS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Extract auth_user fields from complete form data
   *
   * Transforms registration form data into auth_user table structure
   *
   * @param formData - Complete registration form data
   * @returns Structured auth user data for API
   */
  private extractAuthUserData(formData: RegistrationFormData): RegistrationRequest {
    console.log('[RegistrationHandlerService] 🔍 Extracting auth user data...');

    const authData: RegistrationRequest = {
      referenceNumber: formData.referenceNumber,
      firstName: formData.firstName,
      surname: formData.surname,
      email: formData.email,
      
      password: formData.password,
      role: formData.role,
      mobilePhone: this.combinedPhone(formData),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      country: formData.country,
      city: formData.city,
      nationalIdNumber: formData.nationalIdNumber,
      passportNumber: formData.passportNumber
    };

    console.log('[RegistrationHandlerService] ✅ Auth user data extracted');
    return authData;
  }

  /**
   * Extract user_information fields from complete form data
   *
   * Transforms registration form data into user_information table structure
   *
   * @param formData - Complete registration form data
   * @returns Structured user information data for API
   */
  private extractUserInformationData(formData: RegistrationFormData): UserInformation {
    console.log('[RegistrationHandlerService] 🔍 Extracting user information data...');

    const userInfo: UserInformation = {
      referenceNumber: formData.referenceNumber,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender as 'Male' | 'Female' | 'Other' | undefined,
      country: formData.country,
      city: formData.city,
      streetAddress: formData.streetAddress,
      state: formData.state,
      zipCode: formData.zipCode,
      nationalIdNumber: formData.nationalIdNumber,
      passportNumber: formData.passportNumber,
      profilePictureUrl: formData.profilePictureUrl
      // Note: supportingDocuments handling would be done separately after file uploads
    };

    console.log('[RegistrationHandlerService] ✅ User information data extracted');
    return userInfo;
  }

  // ═════════════════════════════════════════════════════════════════════
  // VALIDATION METHODS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Validate complete registration form data
   *
   * Checks that all required fields are present and valid.
   * Prevents invalid data from being sent to backend.
   *
   * @param formData - Form data to validate
   * @returns Error message if invalid, null if valid
   */
  private validateFormData(formData: RegistrationFormData): string | null {
    console.log('[RegistrationHandlerService] 🔍 Validating form data...');

    // Check required fields
    if (!formData.referenceNumber || formData.referenceNumber.trim() === '') {
      return 'Reference number is required';
    }

    if (!formData.firstName || formData.firstName.trim().length < 2) {
      return 'First name must be at least 2 characters';
    }

    if (!formData.surname || formData.surname.trim().length < 2) {
      return 'Surname must be at least 2 characters';
    }

    if (!formData.email || !this.isValidEmail(formData.email)) {
      return 'Valid email is required';
    }

    if (!formData.password || formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }

    if (!formData.role || !['PATIENT', 'DOCTOR', 'ADMIN'].includes(formData.role)) {
      return 'Valid role is required';
    }

    if (!formData.phoneCountryCode || !formData.phoneNumber) {
      return 'Complete phone number is required';
    }

    if (!formData.phoneNumber.match(/^[0-9]{7,14}$/)) {
      return 'Phone number must be 7-14 digits';
    }

    // Check document requirements
    if (formData.documentType === 'nationalId' && !formData.nationalIdNumber) {
      return 'National ID number is required';
    }

    if (formData.documentType === 'passport' && !formData.passportNumber) {
      return 'Passport number is required';
    }

    console.log('[RegistrationHandlerService] ✅ Form data is valid');
    return null;
  }

  /**
   * Validate email format
   *
   * Simple validation using regex pattern
   *
   * @param email - Email to validate
   * @returns True if valid, false otherwise
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ═════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Combine country code and phone number
   *
   * Takes country code (e.g., "+263") and phone number (e.g., "712345678")
   * and combines them into single phone number (e.g., "+263712345678")
   *
   * @param formData - Form data with separate country code and number
   * @returns Combined phone number
   */
  private combinedPhone(formData: RegistrationFormData): string {
    const combined = `${formData.phoneCountryCode}${formData.phoneNumber}`;
    console.log('[RegistrationHandlerService] 📱 Combined phone number:', combined);
    return combined;
  }

  /**
   * Generate reference number
   *
   * Creates unique reference number in format: AUTH-{timestamp}-{random}
   *
   * @returns Generated reference number
   */
  /*public generateReferenceNumber(): string {
    const timestamp = new Date().getTime().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    //const referenceNumber = `AUTH-${timestamp}-${random}`;
    const referenceNumber = refnumberService.generateSystemReferenceNumber(formData: RegistrationFormData);
    console.log('[RegistrationHandlerService] 🔑 Generated reference number:', referenceNumber);
    return referenceNumber;
  }*/
  
 /*public generateReferenceNumber(): string {
    return generateSystemReferenceNumber(RegistrationFormData)
  }*/
  /**
   * Validate reference number format
   *
   * Checks if reference number matches expected format
   *
   * @param referenceNumber - Reference number to validate
   * @returns True if valid format, false otherwise
   */
  public isValidReferenceNumber(referenceNumber: string): boolean {
    const refRegex = /^AUTH-\d{8}-\d{4}$/;
    const isValid = refRegex.test(referenceNumber);
    console.log('[RegistrationHandlerService] 🔍 Reference number validation:', {
      referenceNumber,
      isValid
    });
    return isValid;
  }

  /**
   * Pre-validate form data before submission
   *
   * Quick validation method components can call before submitting
   *
   * @param formData - Form data to pre-validate
   * @returns Array of error messages (empty if no errors)
   */
  public preValidateForm(formData: RegistrationFormData): string[] {
    console.log('[RegistrationHandlerService] 🔍 Pre-validating form...');
    const errors: string[] = [];

    if (!formData.firstName || formData.firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters');
    }

    if (!formData.surname || formData.surname.trim().length < 2) {
      errors.push('Surname must be at least 2 characters');
    }

    if (!formData.email || !this.isValidEmail(formData.email)) {
      errors.push('Valid email is required');
    }

    if (!formData.password || formData.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (!formData.phoneNumber || !formData.phoneNumber.match(/^[0-9]{7,14}$/)) {
      errors.push('Phone number must be 7-14 digits');
    }

    console.log('[RegistrationHandlerService] ✅ Pre-validation complete:', {
      hasErrors: errors.length > 0,
      errorCount: errors.length
    });

    return errors;
  }
}
