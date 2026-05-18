import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DoctorProfileDataService, DoctorProfileData } from './doctor-profile-data.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Service for handling doctor profile data loading logic
 * Simplifies and encapsulates all loading operations
 * Uses DoctorProfileDataService and AuthService
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorDataLoadingService {

  constructor(
    private doctorProfileDataService: DoctorProfileDataService,
    private authService: AuthService
  ) {}

  /**
   * Load complete doctor profile for logged-in user
   * Uses reference number from AuthService to fetch all data
   *
   * @returns Observable<any> with combined auth and profile data
   */
  loadLoggedInDoctorProfile(): Observable<any> {
    console.log('[DoctorDataLoadingService] Loading logged-in doctor profile');

    // Get current user from AuthService
    const authUser = this.authService.getCurrentUser();
    console.log('[DoctorDataLoadingService] Auth user:', authUser);

    if (!authUser || !authUser.referenceNumber) {
      console.error('[DoctorDataLoadingService] No auth user or reference number found');
      throw new Error('User not authenticated or reference number not available');
    }

    // Load full user info from /api/auth/me to get firstName, lastName, phone
    return this.authService.getAuthUserInfo().pipe(
      tap((fullUserInfo: any) => {
        console.log('[DoctorDataLoadingService] ✅ Full auth user info loaded:', fullUserInfo);
      })
    ).pipe(
      // Then load profile data using reference number
      tap(() => {
        this.loadProfileByReferenceNumber(authUser.referenceNumber);
      })
    );
  }

  /**
   * Load doctor profile by reference number
   * Fetches from both doctor table and user_information table
   *
   * @param referenceNumber - Doctor's reference number
   * @returns Observable<DoctorProfileData> with merged data
   */
  loadProfileByReferenceNumber(referenceNumber: string): Observable<DoctorProfileData> {
    console.log('[DoctorDataLoadingService] Loading profile by reference number:', referenceNumber);

    return this.doctorProfileDataService.loadDoctorProfileByReferenceNumber(referenceNumber).pipe(
      tap((profileData: DoctorProfileData) => {
        console.log('[DoctorDataLoadingService] ✅ Profile data loaded:', profileData);
        console.log('[DoctorDataLoadingService] Doctor data:', profileData.doctorData);
        console.log('[DoctorDataLoadingService] User info data:', profileData.userInfoData);
      })
    );
  }

  /**
   * Load doctor profile by email
   * Useful when reference number is not yet available
   *
   * @param email - Doctor's email
   * @param referenceNumber - Optional reference number if available
   * @returns Observable<DoctorProfileData> with merged data
   */
  loadProfileByEmail(email: string, referenceNumber?: string): Observable<DoctorProfileData> {
    console.log('[DoctorDataLoadingService] Loading profile by email:', email);

    return this.doctorProfileDataService.loadDoctorProfileByEmail(email, referenceNumber).pipe(
      tap((profileData: DoctorProfileData) => {
        console.log('[DoctorDataLoadingService] ✅ Profile data loaded by email');
      })
    );
  }

  /**
   * Get current authenticated doctor user info
   * Returns cached user info from AuthService
   */
  getCurrentDoctorUser(): any {
    return this.authService.getCurrentUser();
  }

  /**
   * Get full authenticated doctor user info from /api/auth/me
   */
  getFullDoctorUserInfo(): Observable<any> {
    return this.authService.getAuthUserInfo().pipe(
      tap((userInfo: any) => {
        console.log('[DoctorDataLoadingService] ✅ Full doctor user info:', userInfo);
      })
    );
  }
}
