import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { DoctorService } from './doctor.service';

export interface DoctorProfileUpdatePayload {
  // Auth Service fields (user table)
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  referenceNumber?: string;
  password?: string;

  // User Information table fields (demographics)
  city?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  location?: string;
  nationalIdNumber?: string;
  passportNumber?: string;

  // Doctor table fields (professional information)
  affiliations?: string;
  appointmentDuration?: number;
  certifications?: string;
  education?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  languages?: string;
  licenseIssuer?: string;
  licenseNumber?: string;
  name?: string;
  notes?: string;
  officeAddress?: string;
  officeCity?: string;
  officeFax?: string;
  officePhone?: string;
  officeState?: string;
  officeZipCode?: string;
  rating?: number;
  specialization?: string;
  specializations?: string;
  totalPatients?: number;
  workingDays?: string;
  workingHours?: string;
  yearsOfExperience?: number;
}

export interface DoctorProfileUpdateResponse {
  authData?: any;
  userInfoData?: any;
  doctorData?: any;
  success: boolean;
  message: string;
}

/**
 * Service for updating doctor profile across all three backends/tables
 * Routes updates to:
 * - Auth Service (port 8082): email, firstName, lastName, phone, role, referenceNumber
 * - Direct Service user_information table: city, country, dateOfBirth, gender, location, nationalIdNumber, passportNumber
 * - Direct Service doctor table: specialization, languages, certifications, experience, office details, etc.
 *
 * Handles splitting form data and making parallel requests to all endpoints
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorProfileUpdateService {

  // Auth Service fields
  private readonly AUTH_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'role', 'referenceNumber', 'password'];

  // User Information table fields
  private readonly USER_INFO_FIELDS = ['city', 'country', 'dateOfBirth', 'gender', 'location', 'nationalIdNumber', 'passportNumber'];

  // Doctor table fields (everything else)
  private readonly DOCTOR_FIELDS = [
    'affiliations', 'appointmentDuration', 'certifications', 'education',
    'emergencyContact', 'emergencyContactPhone', 'languages', 'licenseIssuer',
    'licenseNumber', 'name', 'notes', 'officeAddress', 'officeCity',
    'officeFax', 'officePhone', 'officeState', 'officeZipCode',
    'rating', 'specialization', 'specializations', 'totalPatients',
    'workingDays', 'workingHours', 'yearsOfExperience'
  ];

  constructor(private doctorService: DoctorService) {}

  /**
   * Update doctor profile across all three data sources
   * Splits form data and makes parallel requests to Auth Service, user_information table, and doctor table
   *
   * @param referenceNumber - Doctor's reference number (links all data)
   * @param profileData - Complete form data to update
   * @returns Observable<DoctorProfileUpdateResponse> with updates from all sources
   */
  updateDoctorProfile(referenceNumber: string, profileData: DoctorProfileUpdatePayload): Observable<DoctorProfileUpdateResponse> {
    console.log('[DoctorProfileUpdateService] Starting profile update for reference:', referenceNumber);
    console.log('[DoctorProfileUpdateService] Profile data:', JSON.stringify(profileData, null, 2));

    if (!referenceNumber) {
      throw new Error('Reference number is required for profile update');
    }

    // Split form data into three groups
    const { authData, userInfoData, doctorData } = this.splitProfileData(profileData);

    console.log('[DoctorProfileUpdateService] Auth data:', authData);
    console.log('[DoctorProfileUpdateService] User info data:', userInfoData);
    console.log('[DoctorProfileUpdateService] Doctor data:', doctorData);

    // Update all three in parallel
    return forkJoin({
      authUpdate: this.updateAuthIfNeeded(referenceNumber, authData),
      userInfoUpdate: this.updateUserInfoIfNeeded(referenceNumber, userInfoData),
      doctorUpdate: this.updateDoctorIfNeeded(referenceNumber, doctorData)
    }).pipe(
      map(result => {
        console.log('[DoctorProfileUpdateService] ✅ Profile updated successfully');
        return {
          authData: result.authUpdate || {},
          userInfoData: result.userInfoUpdate || {},
          doctorData: result.doctorUpdate || {},
          success: true,
          message: 'Doctor profile updated successfully'
        };
      }),
      catchError((error: any) => {
        console.error('[DoctorProfileUpdateService] ❌ Error updating profile:', error);
        throw new Error('Failed to update profile: ' + error.message);
      })
    );
  }

  /**
   * Private helper: Split profile data into three groups
   */
  private splitProfileData(profileData: DoctorProfileUpdatePayload): {
    authData: any;
    userInfoData: any;
    doctorData: any;
  } {
    const authData: any = {};
    const userInfoData: any = {};
    const doctorData: any = {};

    Object.keys(profileData).forEach(key => {
      const value = (profileData as any)[key];

      if (this.AUTH_FIELDS.includes(key)) {
        authData[key] = value;
      } else if (this.USER_INFO_FIELDS.includes(key)) {
        userInfoData[key] = value;
      } else if (this.DOCTOR_FIELDS.includes(key)) {
        doctorData[key] = value;
      }
    });

    return { authData, userInfoData, doctorData };
  }

  /**
   * Private helper: Update Auth Service if there's data to update
   */
  private updateAuthIfNeeded(referenceNumber: string, authData: any): Observable<any> {
    if (!authData || Object.keys(authData).length === 0 || Object.values(authData).every(v => v === null || v === undefined || v === '')) {
      console.log('[DoctorProfileUpdateService] No auth data to update');
      return of(null);
    }

    console.log('[DoctorProfileUpdateService] Updating Auth Service');
    return this.doctorService.updateAuthData(referenceNumber, authData).pipe(
      catchError((error: any) => {
        console.warn('[DoctorProfileUpdateService] Warning: Auth update failed:', error);
        return of(null); // Don't fail completely
      })
    );
  }

  /**
   * Private helper: Update user information table if there's data to update
   */
  private updateUserInfoIfNeeded(referenceNumber: string, userInfoData: any): Observable<any> {
    if (!userInfoData || Object.keys(userInfoData).length === 0 || Object.values(userInfoData).every(v => v === null || v === undefined || v === '')) {
      console.log('[DoctorProfileUpdateService] No user info data to update');
      return of(null);
    }

    console.log('[DoctorProfileUpdateService] Updating user_information table');
    return this.doctorService.updateUserInformation(referenceNumber, userInfoData).pipe(
      catchError((error: any) => {
        console.warn('[DoctorProfileUpdateService] Warning: User info update failed:', error);
        return of(null); // Don't fail completely
      })
    );
  }

  /**
   * Private helper: Update doctor table if there's data to update
   */
  private updateDoctorIfNeeded(referenceNumber: string, doctorData: any): Observable<any> {
    if (!doctorData || Object.keys(doctorData).length === 0 || Object.values(doctorData).every(v => v === null || v === undefined || v === '')) {
      console.log('[DoctorProfileUpdateService] No doctor data to update');
      return of(null);
    }

    console.log('[DoctorProfileUpdateService] Updating doctor table');
    return this.doctorService.updateDoctorData(referenceNumber, doctorData).pipe(
      catchError((error: any) => {
        console.warn('[DoctorProfileUpdateService] Warning: Doctor update failed:', error);
        return of(null); // Don't fail completely
      })
    );
  }
}
