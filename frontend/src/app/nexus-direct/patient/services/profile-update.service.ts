import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, map, tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { PatientService, Patient } from '../../services/patient.service';

export interface ProfileUpdatePayload {
  // Auth DB fields (user data)
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  referenceNumber?: string;

  // Direct DB fields (patient/user information data)
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  city?: string;
  passportNumber?: string;
  nationalIdNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  relationshipToEmergencyContact?: string;
  address?: string;
  location?: string;
  state?: string;
  zipCode?: string;
  bloodType?: string;
  height?: number;
  weight?: number;
  medicalConditions?: string;
  allergies?: string;
  currentMedications?: string;
  emergencyContactRelation?: string;
  insuranceProvider?: string;
  insurancePolicy?: string;
  insuranceGroupId?: string;
  notes?: string;
}

export interface ProfileUpdateResponse {
  userData?: any;
  patientData?: Patient;
  success: boolean;
  message: string;
}

/**
 * Service for handling profile updates across two backend databases
 * Splits updates between:
 * - Auth Service (port 8082): firstName, lastName, email, phone, role, referenceNumber
 * - Direct Service (port 8081): patient/user information demographics, location, medical data
 *
 * Responsible for:
 * - Splitting form data into appropriate backend destinations
 * - Making parallel or sequential requests as needed
 * - Handling errors from both backends
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileUpdateService {

  // Fields that belong to Auth Service database
  private readonly AUTH_DB_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'role', 'referenceNumber'];

  constructor(private patientService: PatientService) {}

  /**
   * Update user profile information
   * Splits form data and updates appropriate backends:
   * - Auth Service for user account data (firstName, lastName, phone, email)
   * - Direct Service for patient information (location, medical, emergency contact, etc.)
   *
   * @param referenceNumber - User's reference number (links data across databases)
   * @param profileData - Complete profile form data to update
   * @returns Observable<ProfileUpdateResponse> with updated data from both backends
   */
  updateProfile(referenceNumber: string, profileData: ProfileUpdatePayload): Observable<ProfileUpdateResponse> {
    console.log('[ProfileUpdateService] Starting profile update for reference:', referenceNumber);
    console.log('[ProfileUpdateService] Profile data to update:', JSON.stringify(profileData, null, 2));

    if (!referenceNumber) {
      console.error('[ProfileUpdateService] Reference number not provided');
      return throwError(() => new Error('Reference number is required for profile update'));
    }

    // Split form data into Auth DB and Direct DB fields
    const { authData, patientData } = this.splitProfileData(profileData);

    console.log('[ProfileUpdateService] Auth DB fields:', JSON.stringify(authData, null, 2));
    console.log('[ProfileUpdateService] Patient DB fields:', JSON.stringify(patientData, null, 2));

    // Update both databases in parallel
    return forkJoin({
      authUpdate: this.updateAuthDatabaseIfNeeded(referenceNumber, authData),
      patientUpdate: this.updatePatientDatabaseIfNeeded(referenceNumber, patientData)
    }).pipe(
      map(result => {
        console.log('[ProfileUpdateService] ✅ Profile updated successfully in both databases');
        return {
          userData: result.authUpdate || {},
          patientData: result.patientUpdate || {},
          success: true,
          message: 'Profile updated successfully'
        };
      }),
      catchError((error: any) => {
        console.error('[ProfileUpdateService] ❌ Error updating profile:', error);
        console.error('[ProfileUpdateService] Error details:', error.message);
        return throwError(() => new Error('Failed to update profile: ' + error.message));
      })
    );
  }

  /**
   * Update only medical information
   * Routes medical fields to Direct Service database
   *
   * @param referenceNumber - User's reference number
   * @param medicalData - Medical information to update
   * @returns Observable<Patient> with updated patient data
   */
  updateMedicalInfo(referenceNumber: string, medicalData: any): Observable<Patient> {
    console.log('[ProfileUpdateService] Updating medical information for reference:', referenceNumber);
    console.log('[ProfileUpdateService] Medical data:', JSON.stringify(medicalData, null, 2));

    if (!referenceNumber) {
      return throwError(() => new Error('Reference number is required'));
    }

    // Medical fields go to Patient database
    const medicalFields = {
      bloodType: medicalData.bloodType,
      height: medicalData.height,
      weight: medicalData.weight,
      medicalConditions: medicalData.medicalConditions,
      allergies: medicalData.allergies,
      currentMedications: medicalData.currentMedications,
      emergencyContactName: medicalData.emergencyContactName,
      emergencyContactPhone: medicalData.emergencyContactPhone,
      emergencyContactRelation: medicalData.emergencyContactRelation || medicalData.relationshipToEmergencyContact,
      insuranceProvider: medicalData.insuranceProvider,
      insurancePolicy: medicalData.insurancePolicy,
      insuranceGroupId: medicalData.insuranceGroupId,
      notes: medicalData.notes
    };

    return this.patientService.updatePatientData(referenceNumber, medicalFields).pipe(
      tap((updatedPatient: Patient) => {
        console.log('[ProfileUpdateService] ✅ Medical information updated successfully');
      }),
      catchError((error: any) => {
        console.error('[ProfileUpdateService] ❌ Error updating medical information:', error);
        return throwError(() => new Error('Failed to update medical information'));
      })
    );
  }

  /**
   * Private helper: Split profile data into Auth and Patient database fields
   * @param profileData - Complete form data
   * @returns Object with authData and patientData separated
   */
  private splitProfileData(profileData: ProfileUpdatePayload): {
    authData: any;
    patientData: any;
  } {
    const authData: any = {};
    const patientData: any = {};

    Object.keys(profileData).forEach(key => {
      const value = (profileData as any)[key];

      if (this.AUTH_DB_FIELDS.includes(key)) {
        // These fields go to Auth Service
        authData[key] = value;
      } else {
        // Everything else goes to Direct Service (Patient DB)
        patientData[key] = value;
      }
    });

    return { authData, patientData };
  }

  /**
   * Private helper: Update Auth Service database if there's auth data to update
   * @param referenceNumber - User's reference number
   * @param authData - Auth fields to update (firstName, lastName, email, phone, etc.)
   * @returns Observable with response or empty object if no data to update
   */
  private updateAuthDatabaseIfNeeded(referenceNumber: string, authData: any): Observable<any> {
    // Check if there's actually data to update (exclude empty objects)
    if (!authData || Object.keys(authData).length === 0 || Object.values(authData).every(v => v === null || v === undefined || v === '')) {
      console.log('[ProfileUpdateService] No auth data to update, skipping Auth Service call');
      return of(null);
    }

    console.log('[ProfileUpdateService] Updating Auth Service with:', authData);
    return this.patientService.updateUserData(referenceNumber, authData).pipe(
      tap((response: any) => {
        console.log('[ProfileUpdateService] ✅ Auth Service updated successfully');
      }),
      catchError((error: any) => {
        console.error('[ProfileUpdateService] ⚠️ Warning: Auth Service update failed:', error);
        // Don't fail completely, return empty object so patient update can proceed
        return of(null);
      })
    );
  }

  /**
   * Private helper: Update Direct Service database if there's patient data to update
   * @param referenceNumber - User's reference number
   * @param patientData - Patient fields to update (location, medical, demographics, etc.)
   * @returns Observable<Patient> with response or empty patient if no data to update
   */
  private updatePatientDatabaseIfNeeded(referenceNumber: string, patientData: any): Observable<Patient> {
    // Check if there's actually data to update (exclude empty objects)
    if (!patientData || Object.keys(patientData).length === 0 || Object.values(patientData).every(v => v === null || v === undefined || v === '')) {
      console.log('[ProfileUpdateService] No patient data to update, skipping Direct Service call');
      return of({} as Patient);
    }

    console.log('[ProfileUpdateService] Updating Direct Service with:', patientData);
    return this.patientService.updatePatientData(referenceNumber, patientData).pipe(
      tap((response: Patient) => {
        console.log('[ProfileUpdateService] ✅ Direct Service updated successfully');
      }),
      catchError((error: any) => {
        console.error('[ProfileUpdateService] ⚠️ Warning: Direct Service update failed:', error);
        // Don't fail completely, return empty patient so auth update result is still returned
        return of({} as Patient);
      })
    );
  }
}
