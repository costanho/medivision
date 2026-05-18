import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';

export interface Doctor {
  // Basic Information
  id?: number;
  referenceNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;

  // User Information (from user_information table)
  city?: string;
  country?: string;
  createdAt?: string;
  dateOfBirth?: string;
  gender?: string;
  location?: string;
  nationalIdNumber?: string;
  passportNumber?: string;
  registrationDate?: string;

  // Doctor-specific Information (from doctor table)
  name?: string;
  affiliations?: string;
  appointmentDuration?: number;
  certifications?: string;
  education?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  languages?: string;
  licenseIssuer?: string;
  licenseNumber?: string;
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

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  // Cache for current doctor data
  private currentDoctor$ = new BehaviorSubject<Doctor | null>(null);
  public currentDoctor = this.currentDoctor$.asObservable();

  // Cache timestamp
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private apiService: ApiService) {}

  /**
   * Get cached doctor or null
   */
  getCachedDoctor(): Doctor | null {
    return this.currentDoctor$.value;
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION && this.currentDoctor$.value !== null;
  }

  /**
   * Load and cache doctor by email
   * Fetches from Direct Service
   */
  loadAndCacheDoctorByEmail(email: string): Observable<Doctor> {
    console.log('[DoctorService] Loading and caching doctor by email:', email);

    return this.apiService.get<Doctor>('/doctors/by-email', { email }).pipe(
      tap((doctor: Doctor) => {
        console.log('[DoctorService] ✅ Doctor loaded and cached:', doctor);
        this.currentDoctor$.next(doctor);
        this.cacheTimestamp = Date.now();
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error loading doctor by email:', error);
        return of({} as Doctor);
      })
    );
  }

  /**
   * Get doctor by reference number from Direct Service
   */
  getDoctorByReferenceNumber(referenceNumber: string): Observable<Doctor> {
    console.log('[DoctorService] Fetching doctor by reference number:', referenceNumber);

    return this.apiService.get<Doctor>('/doctors/by-reference-number', {
      referenceNumber
    }).pipe(
      tap((doctor: Doctor) => {
        console.log('[DoctorService] ✅ Doctor data retrieved:', doctor);
      }),
      catchError((error: any) => {
        console.warn('[DoctorService] Error fetching doctor:', error);
        return of({} as Doctor);
      })
    );
  }

  /**
   * Get complete doctor profile with data from all sources
   * Retrieves: user (auth), user_information, and doctor tables
   * Used by doctor profile form for comprehensive profile data
   */
  getCompleteProfile(referenceNumber: string): Observable<Doctor> {
    console.log('[DoctorService] Fetching complete profile for reference:', referenceNumber);

    return this.apiService.get<Doctor>('/doctors/profile/complete', {
      referenceNumber
    }).pipe(
      tap((doctor: Doctor) => {
        console.log('[DoctorService] ✅ Complete profile retrieved:', doctor);
      }),
      catchError((error: any) => {
        console.warn('[DoctorService] Error fetching complete profile:', error);
        return of({} as Doctor);
      })
    );
  }

  /**
   * Get user information (demographics) by reference number from Direct Service
   */
  getUserInformationByReferenceNumber(referenceNumber: string): Observable<any> {
    console.log('[DoctorService] Fetching user information by reference number:', referenceNumber);

    return this.apiService.get<any>(`/users-information/reference/${referenceNumber}`).pipe(
      tap((userInfo: any) => {
        console.log('[DoctorService] ✅ User information retrieved:', userInfo);
      }),
      catchError((error: any) => {
        console.warn('[DoctorService] Could not fetch user information:', error);
        return of({});
      })
    );
  }

  /**
   * Update doctor profile data in Direct Service
   * Routes to /doctors/by-reference-number/{referenceNumber}
   */
  updateDoctorData(referenceNumber: string, doctorData: any): Observable<Doctor> {
    console.log('[DoctorService] Updating doctor data for reference:', referenceNumber);
    console.log('[DoctorService] Data:', doctorData);

    return this.apiService.put<Doctor>(`/doctors/by-reference-number/${referenceNumber}`, doctorData).pipe(
      tap((updatedDoctor: Doctor) => {
        console.log('[DoctorService] ✅ Doctor data updated successfully');
        this.currentDoctor$.next(updatedDoctor);
        this.cacheTimestamp = Date.now();
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error updating doctor data:', error);
        throw error;
      })
    );
  }

  /**
   * Update user information (demographics) in Direct Service
   * Routes to /users-information/reference/{referenceNumber}
   */
  updateUserInformation(referenceNumber: string, userInfo: any): Observable<any> {
    console.log('[DoctorService] Updating user information for reference:', referenceNumber);

    return this.apiService.put<any>(`/users-information/reference/${referenceNumber}`, userInfo).pipe(
      tap((updatedInfo: any) => {
        console.log('[DoctorService] ✅ User information updated successfully');
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error updating user information:', error);
        throw error;
      })
    );
  }

  /**
   * Update user data in Auth Service
   * Routes to /auth/users/by-reference-number/{referenceNumber}
   */
  updateAuthData(referenceNumber: string, authData: any): Observable<any> {
    console.log('[DoctorService] Updating auth data for reference:', referenceNumber);

    return this.apiService.put<any>(`/auth/users/by-reference-number/${referenceNumber}`, authData).pipe(
      tap((updatedAuth: any) => {
        console.log('[DoctorService] ✅ Auth data updated successfully');
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error updating auth data:', error);
        throw error;
      })
    );
  }

  /**
   * Update complete doctor profile
   * Updates all fields from doctor table
   * Data sources: doctor table (professional information, office info, etc.)
   */
  updateCompleteProfile(profileData: any, referenceNumber: string): Observable<any> {
    console.log('[DoctorService] Updating complete profile for reference:', referenceNumber);

    return this.apiService.put<any>('/doctors/profile/complete', profileData, { referenceNumber }).pipe(
      tap((updatedProfile: any) => {
        console.log('[DoctorService] ✅ Complete profile updated successfully');
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error updating complete profile:', error);
        throw error;
      })
    );
  }

  /**
   * Change doctor's password
   * Validates current password and updates to new password
   * Data sources: auth_user table (password validation and update)
   */
  changePassword(referenceNumber: string, currentPassword: string, newPassword: string): Observable<any> {
    console.log('[DoctorService] Changing password for reference:', referenceNumber);

    const request = {
      currentPassword,
      newPassword,
      referenceNumber
    };

    return this.apiService.post<any>('/doctors/profile/change-password', request).pipe(
      tap((response: any) => {
        console.log('[DoctorService] ✅ Password changed successfully');
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error changing password:', error);
        throw error;
      })
    );
  }

  /**
   * Get all available specializations from database
   * Data source: doctor table (specialization field)
   * PUBLIC ENDPOINT - No authentication required
   */
  getSpecializations(): Observable<string[]> {
    console.log('[DoctorService] Fetching specializations from backend');
    return this.apiService.get<string[]>('/doctors/options/specializations').pipe(
      tap((specializations: string[]) => {
        console.log('[DoctorService] ✅ Specializations loaded:', specializations);
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error fetching specializations:', error);
        return of([]);
      })
    );
  }

  /**
   * Get all available languages from database
   * Data source: doctor table (languages field)
   * PUBLIC ENDPOINT - No authentication required
   */
  getLanguages(): Observable<string[]> {
    console.log('[DoctorService] Fetching languages from backend');
    return this.apiService.get<string[]>('/doctors/options/languages').pipe(
      tap((languages: string[]) => {
        console.log('[DoctorService] ✅ Languages loaded:', languages);
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error fetching languages:', error);
        return of([]);
      })
    );
  }

  /**
   * Get all available certifications from database
   * Data source: doctor table (certifications field)
   * PUBLIC ENDPOINT - No authentication required
   */
  getCertifications(): Observable<string[]> {
    console.log('[DoctorService] Fetching certifications from backend');
    return this.apiService.get<string[]>('/doctors/options/certifications').pipe(
      tap((certifications: string[]) => {
        console.log('[DoctorService] ✅ Certifications loaded:', certifications);
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error fetching certifications:', error);
        return of([]);
      })
    );
  }
}
