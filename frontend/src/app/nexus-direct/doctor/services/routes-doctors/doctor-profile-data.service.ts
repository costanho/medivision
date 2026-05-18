import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, map, tap, catchError } from 'rxjs/operators';
import { DoctorService, Doctor } from './doctor.service';

export interface DoctorProfileData {
  authData?: any; // From Auth Service (email, firstName, lastName, phone, role, referenceNumber)
  userInfoData?: any; // From user_information table (demographics: city, country, dateOfBirth, etc.)
  doctorData?: Doctor; // From doctor table (specialization, languages, certifications, etc.)
}

/**
 * Service for orchestrating doctor profile data loading from multiple sources
 * Coordinates retrieval from:
 * - Auth Service: User credentials and basic info
 * - Direct Service: User information (demographics) and Doctor information (professional details)
 *
 * All data is linked via reference number from the logged-in user
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorProfileDataService {

  constructor(private doctorService: DoctorService) {}

  /**
   * Load complete doctor profile by reference number
   * Fetches data from all three sources:
   * 1. Doctor table (specialization, languages, certifications, etc.)
   * 2. User information table (demographics: city, country, dateOfBirth, etc.)
   * 3. Auth data is already cached in AuthService
   *
   * @param referenceNumber - The logged-in doctor's reference number
   * @returns Observable<DoctorProfileData> with merged data from all sources
   */
  loadDoctorProfileByReferenceNumber(referenceNumber: string): Observable<DoctorProfileData> {
    console.log('[DoctorProfileDataService] Loading doctor profile for reference:', referenceNumber);

    // Fetch doctor data and user information in parallel
    return forkJoin({
      doctorData: this.doctorService.getDoctorByReferenceNumber(referenceNumber).pipe(
        catchError((err) => {
          console.warn('[DoctorProfileDataService] Could not fetch doctor data:', err);
          return of({} as Doctor);
        })
      ),
      userInfoData: this.doctorService.getUserInformationByReferenceNumber(referenceNumber).pipe(
        catchError((err) => {
          console.warn('[DoctorProfileDataService] Could not fetch user information:', err);
          return of({});
        })
      )
    }).pipe(
      map(result => {
        console.log('[DoctorProfileDataService] ✅ Profile data loaded successfully');
        return {
          authData: {}, // Auth data is already in AuthService, not fetched here
          userInfoData: result.userInfoData || {},
          doctorData: result.doctorData || ({} as Doctor)
        };
      }),
      catchError((err: any) => {
        console.error('[DoctorProfileDataService] ❌ Error loading doctor profile:', err);
        return of({
          authData: {},
          userInfoData: {},
          doctorData: {} as Doctor
        });
      })
    );
  }

  /**
   * Load complete doctor profile by email
   * Suitable when reference number is not yet available
   *
   * @param email - Doctor's email
   * @param referenceNumber - Optional reference number if available
   * @returns Observable<DoctorProfileData> with merged data
   */
  loadDoctorProfileByEmail(email: string, referenceNumber?: string): Observable<DoctorProfileData> {
    console.log('[DoctorProfileDataService] Loading doctor profile by email:', email);
    console.log('[DoctorProfileDataService] Reference number:', referenceNumber || 'not provided');

    // Load doctor data by email
    return this.doctorService.loadAndCacheDoctorByEmail(email).pipe(
      switchMap((doctorData: Doctor) => {
        // If reference number is available, fetch user information
        if (referenceNumber) {
          return this.doctorService.getUserInformationByReferenceNumber(referenceNumber).pipe(
            map((userInfoData: any) => {
              // Merge user information into doctor data
              if (userInfoData && Object.keys(userInfoData).length > 0) {
                const mergedDoctor = {
                  ...doctorData,
                  ...userInfoData
                };
                return {
                  authData: {},
                  userInfoData: userInfoData,
                  doctorData: mergedDoctor
                };
              }
              return {
                authData: {},
                userInfoData: {},
                doctorData: doctorData
              };
            }),
            catchError(() => {
              return of({
                authData: {},
                userInfoData: {},
                doctorData: doctorData
              });
            })
          );
        } else {
          // No reference number, return just doctor data
          return of({
            authData: {},
            userInfoData: {},
            doctorData: doctorData
          });
        }
      }),
      catchError((err: any) => {
        console.error('[DoctorProfileDataService] ❌ Error loading profile:', err);
        return of({
          authData: {},
          userInfoData: {},
          doctorData: {} as Doctor
        });
      })
    );
  }
}
