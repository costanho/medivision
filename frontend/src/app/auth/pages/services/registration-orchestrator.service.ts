import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { RegistrationFormData } from './registration-models';
import { AuthDatabaseService, AuthDatabaseUserRecord, AuthDatabaseResponse } from './auth-database.service';
import { DirectDatabaseService, DirectDatabaseUserInformation, DirectDatabaseResponse } from './direct-database.service';
import { PatientRegistrationService } from './patient-registration.service';
import { DoctorRegistrationService } from './doctor-registration.service';
import { SystemNumberService } from './system-number.service';

/**
 * REGISTRATION ORCHESTRATOR SERVICE
 *
 * Coordinates multi-database registration across multiple services.
 * Manages the sequential flow of inserts into different databases.
 *
 * REGISTRATION FLOW:
 * ════════════════════════════════════════════════════════════════
 *
 * Step 1: Create AUTH USER (auth database)
 *   └─ Insert into auth_user table
 *   └─ Fields: reference, email, first_name, last_name, role, phone
 *   └─ Returns: auth user ID
 *
 * Step 2: Create USER INFORMATION (direct database)
 *   └─ Insert into user_information table
 *   └─ Fields: reference, gender, country, dob, id_number, passport
 *   └─ Links via: reference_number
 *
 * Step 3: Create ROLE-SPECIFIC RECORD (direct database)
 *   └─ If PATIENT: Insert into patient table
 *   │   └─ Fields: reference_number
 *   │
 *   └─ If DOCTOR: Insert into doctor table
 *       └─ Fields: reference_number
 *       └─ If ADMIN: Skip (no admin table record needed)
 *
 * Database Distribution:
 * ════════════════════════════════════════════════════════════════
 *
 * AUTH DATABASE (port 8082):
 *   └─ auth_user table
 *       └─ reference_number ✓
 *       └─ email ✓
 *       └─ first_name ✓
 *       └─ last_name ✓
 *       └─ role ✓
 *       └─ phone_number ✓
 *
 * DIRECT DATABASE (port 8081):
 *   ├─ user_information table
 *   │   └─ reference_number ✓
 *   │   └─ gender ✓
 *   │   └─ country ✓
 *   │   └─ date_of_birth ✓
 *   │   └─ national_id_number ✓
 *   │   └─ passport_number ✓
 *   │
 *   ├─ patient table
 *   │   └─ reference_number ✓
 *   │   (only if role = PATIENT)
 *   │
 *   └─ doctor table
 *       └─ reference_number ✓
 *       (only if role = DOCTOR)
 */

export interface OrchestrationResponse {
  success: boolean;
  message: string;
  referenceNumber?: string;
  email?: string;
  steps?: {
    authUserCreated: boolean;
    userInfoCreated: boolean;
    roleRecordCreated: boolean;
  };
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationOrchestratorService {
  constructor(
    private authDatabase: AuthDatabaseService,
    private directDatabase: DirectDatabaseService,
    private patientRegistration: PatientRegistrationService,
    private doctorRegistration: DoctorRegistrationService,
    private systemNumberService: SystemNumberService
  ) {
    console.log('[RegistrationOrchestratorService] ✅ Service initialized');
  }

  /**
   * Orchestrate complete multi-database registration
   *
   * Handles sequential creation of records across multiple databases.
   * Each step depends on previous step success.
   *
   * IMPORTANT:
   * - Generates reference number from SystemNumberService
   * - Password is ONLY inserted into auth_user table
   * - Password is NOT sent to any other database
   *
   * @param formData - Complete registration form data (will be enriched with reference number)
   * @returns Observable with orchestration response
   */
  orchestrateRegistration(formData: RegistrationFormData): Observable<OrchestrationResponse> {
    console.log('[RegistrationOrchestratorService] 🎭 Starting registration orchestration...');

    // Step 0: Generate reference number from SystemNumberService
    console.log('[RegistrationOrchestratorService] 🔢 Generating reference number...');
    const enrichedFormData = this.systemNumberService.generateRegistrationData(formData);
    const referenceNumber = enrichedFormData.systemReferenceNumber;

    console.log('[RegistrationOrchestratorService] ✅ Reference number generated:', referenceNumber);
    console.log('[RegistrationOrchestratorService] Email:', enrichedFormData.email);
    console.log('[RegistrationOrchestratorService] Role:', enrichedFormData.role);

    // Step 1: Create auth user
    return this.createAuthUser(enrichedFormData).pipe(
      switchMap(authResponse => {
        if (!authResponse.success) {
          console.error('[RegistrationOrchestratorService] ❌ Auth user creation failed');
          return of({
            success: false,
            message: 'Failed to create authentication user',
            referenceNumber: referenceNumber,
            error: authResponse.error,
            steps: {
              authUserCreated: false,
              userInfoCreated: false,
              roleRecordCreated: false
            }
          });
        }

        console.log('[RegistrationOrchestratorService] ✅ Step 1 Complete: Auth user created');

        // Step 2: Create user information (NO PASSWORD SENT HERE)
        return this.createUserInformation(enrichedFormData).pipe(
          switchMap(userInfoResponse => {
            const userInfoSuccess = userInfoResponse.success;

            if (!userInfoSuccess) {
              console.warn('[RegistrationOrchestratorService] ⚠️  User information creation failed');
              console.warn('[RegistrationOrchestratorService] Continuing with role record...');
            } else {
              console.log('[RegistrationOrchestratorService] ✅ Step 2 Complete: User information created');
            }

            // Step 3: Create role-specific record (if applicable, NO PASSWORD SENT HERE)
            return this.createRoleRecord(enrichedFormData).pipe(
              switchMap(roleResponse => {
                const roleSuccess = roleResponse.success || roleResponse.message === 'SKIP';

                if (!roleSuccess) {
                  console.warn('[RegistrationOrchestratorService] ⚠️  Role record creation failed');
                }

                // Build final response
                const finalResponse: OrchestrationResponse = {
                  success: authResponse.success && userInfoSuccess,
                  message: this.buildCompletionMessage(authResponse.success, userInfoSuccess, roleSuccess, enrichedFormData.role),
                  referenceNumber: referenceNumber,
                  email: enrichedFormData.email,
                  steps: {
                    authUserCreated: authResponse.success,
                    userInfoCreated: userInfoSuccess,
                    roleRecordCreated: roleSuccess
                  }
                };

                console.log('[RegistrationOrchestratorService] 🎉 Registration orchestration complete');
                console.log('[RegistrationOrchestratorService] Summary:', {
                  success: finalResponse.success,
                  authUserCreated: finalResponse.steps?.authUserCreated,
                  userInfoCreated: finalResponse.steps?.userInfoCreated,
                  roleRecordCreated: finalResponse.steps?.roleRecordCreated,
                  message: finalResponse.message
                });

                return of(finalResponse);
              }),
              catchError(error => {
                console.error('[RegistrationOrchestratorService] ❌ Role record creation error:', error);
                return of({
                  success: authResponse.success && userInfoSuccess,
                  message: 'Role record creation failed, but user registration succeeded',
                  referenceNumber: formData.referenceNumber,
                  email: formData.email,
                  steps: {
                    authUserCreated: authResponse.success,
                    userInfoCreated: userInfoSuccess,
                    roleRecordCreated: false
                  }
                });
              })
            );
          }),
          catchError(error => {
            console.error('[RegistrationOrchestratorService] ❌ User information creation error:', error);
            return of({
              success: authResponse.success,
              message: 'User information creation failed, but authentication user created',
              referenceNumber: formData.referenceNumber,
              email: formData.email,
              steps: {
                authUserCreated: authResponse.success,
                userInfoCreated: false,
                roleRecordCreated: false
              }
            });
          })
        );
      }),
      catchError(error => {
        console.error('[RegistrationOrchestratorService] ❌ Auth user creation error:', error);
        return of({
          success: false,
          message: 'Registration failed. Could not create authentication user.',
          error: error?.error?.message || error?.message || 'Unknown error',
          steps: {
            authUserCreated: false,
            userInfoCreated: false,
            roleRecordCreated: false
          }
        });
      })
    );
  }

  /**
   * Step 1: Create auth user in auth database
   *
   * IMPORTANT: Password IS included in auth database (ONLY place it goes)
   * Reference number is generated and used to link all tables
   *
   * Backend returns: {accessToken, refreshToken}
   * Frontend expects: {success, message, data, error}
   * This method transforms the response.
   */
  private createAuthUser(formData: any): Observable<AuthDatabaseResponse> {
    console.log('[RegistrationOrchestratorService] 📝 Step 1: Creating auth user...');
    console.log('[RegistrationOrchestratorService] ✅ Password will be inserted into auth_user table ONLY');

    const authData: AuthDatabaseUserRecord = {
      referenceNumber: formData.systemReferenceNumber,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.surname,
      role: formData.role as any,
      mobilePhone: `${formData.phoneCountryCode}${formData.phoneNumber}`,
      password: formData.password  // ✅ PASSWORD INCLUDED HERE ONLY
    };

    return this.authDatabase.insertAuthUser(authData).pipe(
      tap((response: any) => {
        // Transform backend response to our expected format
        if (response && response.accessToken) {
          response.success = true;
          response.message = 'Auth user created successfully';
          response.data = {
            referenceNumber: formData.systemReferenceNumber,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.surname,
            role: formData.role,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken
          };
        } else {
          response.success = false;
          response.message = 'Failed to create auth user';
          response.error = 'No access token received';
        }
      })
    );
  }

  /**
   * Step 2: Create user information in direct database
   *
   * IMPORTANT: Password is NOT sent to direct database!
   * Only reference number and profile information are sent.
   */
  private createUserInformation(formData: any): Observable<DirectDatabaseResponse> {
    console.log('[RegistrationOrchestratorService] 📝 Step 2: Creating user information...');
    console.log('[RegistrationOrchestratorService] ⚠️  NOTE: Password is NOT sent to direct database');

    const userInfo: DirectDatabaseUserInformation = {
      referenceNumber: formData.systemReferenceNumber,
      gender: formData.gender,
      country: formData.country,
      dateOfBirth: formData.dateOfBirth,
      documentType: formData.documentType,
      nationalIdNumber: formData.nationalIdNumber,
      passportNumber: formData.passportNumber,
      city: formData.city
      // ⚠️  PASSWORD NOT INCLUDED - intentionally excluded
    };

    return this.directDatabase.insertUserInformation(userInfo);
  }

  /**
   * Step 3: Create role-specific record (patient, doctor, or skip)
   *
   * IMPORTANT: Password is NOT sent to direct database!
   * Only reference number is sent to create role-specific records.
   */
  private createRoleRecord(
    formData: any
  ): Observable<{ success: boolean; message: string; error?: string }> {
    console.log('[RegistrationOrchestratorService] 📝 Step 3: Creating role-specific record...');
    console.log('[RegistrationOrchestratorService] Role:', formData.role);
    console.log('[RegistrationOrchestratorService] ⚠️  NOTE: Password is NOT sent to direct database');

    const referenceNumber = formData.systemReferenceNumber;

    switch (formData.role) {
      case 'PATIENT':
        console.log('[RegistrationOrchestratorService] Creating patient record...');
        return this.patientRegistration.createPatientRecord(formData).pipe(
          tap(response => {
            if (response.success) {
              console.log('[RegistrationOrchestratorService] ✅ Step 3 Complete: Patient record created');
            }
          })
        );

      case 'DOCTOR':
        console.log('[RegistrationOrchestratorService] Creating doctor record...');
        return this.doctorRegistration.createDoctorRecord(formData).pipe(
          tap(response => {
            if (response.success) {
              console.log('[RegistrationOrchestratorService] ✅ Step 3 Complete: Doctor record created');
            }
          })
        );

      case 'ADMIN':
        console.log('[RegistrationOrchestratorService] ⏭️  Skipping admin record (not required)');
        return of({
          success: true,
          message: 'SKIP'
        });

      default:
        console.warn('[RegistrationOrchestratorService] ⚠️  Unknown role:', formData.role);
        return of({
          success: false,
          message: 'Unknown role',
          error: `Unknown role: ${formData.role}`
        });
    }
  }

  /**
   * Build meaningful completion message based on step results
   */
  private buildCompletionMessage(
    authCreated: boolean,
    userInfoCreated: boolean,
    roleCreated: boolean,
    role: string
  ): string {
    if (authCreated && userInfoCreated && roleCreated) {
      return `✅ Registration complete! ${role} account created successfully.`;
    }

    if (authCreated && userInfoCreated && !roleCreated) {
      return `⚠️  User registered but ${role.toLowerCase()} record creation failed. You can update this later.`;
    }

    if (authCreated && !userInfoCreated) {
      return `⚠️  Authentication account created but profile incomplete. You can complete your profile later.`;
    }

    return '❌ Registration failed. Please try again.';
  }
}
