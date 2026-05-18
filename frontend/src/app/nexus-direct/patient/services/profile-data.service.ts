import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, catchError, map, tap } from 'rxjs/operators';
import { PatientService, Patient } from '../../services/patient.service';

export interface ProfileData {
  userData: any;
  patientData: Patient;
}

export interface UpdateProfileRequest {
  userData?: any;
  patientData?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileDataService {
  constructor(private patientService: PatientService) {}

  /**
   * Load complete profile data by reference number
   * Fetches user data from auth DB and patient data from direct DB
   * Uses reference number as the linking identifier
   */
  loadProfileByReferenceNumber(referenceNumber: string): Observable<ProfileData> {
    console.log('[ProfileDataService] Loading profile by reference number:', referenceNumber);

    return forkJoin({
      userData: this.patientService.getUserByReferenceNumber(referenceNumber).pipe(
        catchError((err) => {
          console.warn('[ProfileDataService] Could not fetch user data:', err);
          return of(null);
        })
      ),
      patientData: this.patientService.getPatientByReferenceNumber(referenceNumber).pipe(
        catchError((err) => {
          console.warn('[ProfileDataService] Could not fetch patient data:', err);
          return of({} as Patient);
        })
      )
    }).pipe(
      map(result => {
        console.log('[ProfileDataService] Profile data loaded successfully');
        return {
          userData: result.userData || {},
          patientData: result.patientData || ({} as Patient)
        };
      })
    );
  }

  /**
   * Load complete profile data by email
   * Fetches patient data from Direct Service
   * User data is already loaded in AuthService
   * Also fetches user information (demographics, location) if reference number is available
   */
  loadProfileByEmail(email: string, referenceNumber?: string): Observable<ProfileData> {
    console.log('[ProfileDataService] Loading profile by email:', email);
    console.log('[ProfileDataService] Reference number provided:', referenceNumber || 'none');

    return this.patientService.loadAndCachePatientByEmail(email).pipe(
      tap((patientData: Patient) => {
        console.log('[ProfileDataService] ✅ RAW patientData response:', JSON.stringify(patientData, null, 2));
        console.log('[ProfileDataService] patientData type:', typeof patientData);
        console.log('[ProfileDataService] patientData keys:', patientData ? Object.keys(patientData) : 'null');
      }),
      switchMap((patientData: Patient) => {
        // If we have a reference number, fetch user information (demographics, location, etc.)
        console.log('[ProfileDataService] switchMap - referenceNumber value:', referenceNumber);
        console.log('[ProfileDataService] switchMap - referenceNumber is truthy?', !!referenceNumber);
        if (referenceNumber) {
          console.log('[ProfileDataService] ✅ FETCHING user information by reference number:', referenceNumber);
          return this.patientService.getUserInformationByReferenceNumber(referenceNumber).pipe(
            tap((userInfo: any) => {
              console.log('[ProfileDataService] ✅ User information fetched:', JSON.stringify(userInfo, null, 2));
            }),
            map((userInfo: any) => {
              // Merge user information into patient data (demographics, location fields)
              console.log('[ProfileDataService] 🔀 Map function - userInfo received:', userInfo);
              console.log('[ProfileDataService] 🔀 userInfo type:', typeof userInfo);
              console.log('[ProfileDataService] 🔀 userInfo is object?', userInfo && typeof userInfo === 'object');

              if (userInfo && typeof userInfo === 'object' && Object.keys(userInfo).length > 0) {
                console.log('[ProfileDataService] 🔀 Merging data...');
                console.log('[ProfileDataService] Patient data before merge:', JSON.stringify(patientData, null, 2));
                console.log('[ProfileDataService] User info to merge:', JSON.stringify(userInfo, null, 2));

                const mergedPatientData = {
                  ...patientData,
                  ...userInfo // Merge user information fields like city, country, gender, dateOfBirth, etc.
                };

                console.log('[ProfileDataService] ✅ Data merged successfully with user information');
                console.log('[ProfileDataService] Merged result:', JSON.stringify(mergedPatientData, null, 2));
                return mergedPatientData;
              } else {
                console.log('[ProfileDataService] ⚠️ User information is empty or invalid, using patient data only');
                console.log('[ProfileDataService] userInfo value:', userInfo);
                console.log('[ProfileDataService] userInfo keys:', userInfo ? Object.keys(userInfo) : 'null/undefined');
                return patientData;
              }
            }),
            catchError((err: any) => {
              console.warn('[ProfileDataService] ⚠️ Could not fetch user information, continuing with patient data only');
              return of(patientData); // Continue with just patient data if user info fetch fails
            })
          );
        } else {
          console.log('[ProfileDataService] No reference number provided, skipping user information fetch');
          return of(patientData);
        }
      }),
      map((mergedPatientData: Patient) => {
        const profileData: ProfileData = {
          userData: {}, // User data is already in AuthService, not fetched here
          patientData: mergedPatientData
        };
        console.log('[ProfileDataService] ✅ Profile data loaded successfully by email');
        console.log('[ProfileDataService] Final merged patientData:', JSON.stringify(mergedPatientData, null, 2));
        console.log('[ProfileDataService] 🔍 About to return - mergedPatientData.location:', mergedPatientData?.location);
        console.log('[ProfileDataService] 🔍 About to return - mergedPatientData.address:', mergedPatientData?.address);
        console.log('[ProfileDataService] 🔍 Returning profileData with patientData that has location:', profileData.patientData?.location);
        return profileData;
      }),
      catchError((err: any) => {
        console.warn('[ProfileDataService] ❌ Could not fetch patient data by email:', err);
        console.error('[ProfileDataService] Error details:', JSON.stringify(err, null, 2));
        return of({
          userData: {},
          patientData: {} as Patient
        });
      })
    );
  }

  /**
   * Update profile data to respective databases
   * Splits form data and updates auth DB for user fields, direct DB for patient fields
   */
  updateProfile(
    referenceNumber: string,
    formData: any
  ): Observable<ProfileData> {
    console.log('[ProfileDataService] Updating profile for reference:', referenceNumber);

    // Define which fields belong to auth DB vs direct DB
    const authDBFields = ['email', 'password', 'role', 'referenceNumber'];

    // Split form data
    const userData: any = {};
    const patientData: any = {};

    Object.keys(formData).forEach(key => {
      if (authDBFields.includes(key)) {
        userData[key] = formData[key];
      } else {
        patientData[key] = formData[key];
      }
    });

    console.log('[ProfileDataService] Split data - Auth DB fields:', userData);
    console.log('[ProfileDataService] Split data - Direct DB fields:', patientData);

    // Update both databases in parallel
    return forkJoin({
      userData: this.updateUserData(referenceNumber, userData),
      patientData: this.updatePatientData(referenceNumber, patientData)
    }).pipe(
      map(result => {
        console.log('[ProfileDataService] Profile updated successfully in both databases');
        return {
          userData: result.userData || {},
          patientData: result.patientData || ({} as Patient)
        };
      })
    );
  }

  /**
   * Update only patient medical information
   * Saves all medical fields to direct database
   */
  updateMedicalInfo(
    referenceNumber: string,
    medicalData: any
  ): Observable<Patient> {
    console.log('[ProfileDataService] Updating medical info for reference:', referenceNumber);
    console.log('[ProfileDataService] Medical data:', medicalData);

    return this.updatePatientData(referenceNumber, medicalData).pipe(
      map(patient => {
        console.log('[ProfileDataService] Medical info updated successfully');
        return patient;
      })
    );
  }

  /**
   * Private helper: Update user data in auth database
   */
  private updateUserData(referenceNumber: string, userData: any): Observable<any> {
    if (!userData || Object.keys(userData).length === 0) {
      console.log('[ProfileDataService] No user data to update');
      return of({});
    }

    return this.patientService.updateUserData(referenceNumber, userData).pipe(
      catchError((err) => {
        console.error('[ProfileDataService] Error updating user data:', err);
        throw err;
      })
    );
  }

  /**
   * Private helper: Update patient data in direct database
   */
  private updatePatientData(referenceNumber: string, patientData: any): Observable<Patient> {
    if (!patientData || Object.keys(patientData).length === 0) {
      console.log('[ProfileDataService] No patient data to update');
      return of({} as Patient);
    }

    return this.patientService.updatePatientData(referenceNumber, patientData).pipe(
      catchError((err) => {
        console.error('[ProfileDataService] Error updating patient data:', err);
        throw err;
      })
    );
  }
}
