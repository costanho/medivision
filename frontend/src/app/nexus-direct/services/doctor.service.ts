import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface Doctor {
  id: number;
  userEmail?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  specialization?: string;
  licenseNumber?: string;
  license_number?: string;
  bio?: string;
  consultationFee?: number;
  consultation_fee?: number;
  createdAt?: string;
  updatedAt?: string;
  isOnline?: boolean;
  lastSeen?: string;
  lastSeenAt?: string;
}

export interface DoctorListResponse {
  content?: Doctor[];
  data?: Doctor[];
  doctors?: Doctor[];
  totalElements?: number;
  total_elements?: number;
  totalPages?: number;
  total_pages?: number;
  pageable?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  constructor(private apiService: ApiService) {}

  // Get all doctors from public directory (simple, no pagination)
  getAllDoctors(): Observable<DoctorListResponse> {
    console.log('[DoctorService] getAllDoctors called - using /doctors/directory endpoint');
    return this.apiService.get<any>('/doctors/directory', {}).pipe(
      map((response: any) => {
        console.log('[DoctorService] getAllDoctors raw response:', response);
        return this.normalizeResponse(response);
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error in getAllDoctors:', error);
        throw error;
      })
    );
  }

  // Get all doctors from public directory (paginated)
  getDoctors(page: number = 0, size: number = 10, sortBy: string = 'name', direction: string = 'ASC'): Observable<DoctorListResponse> {
    console.log('[DoctorService] getDoctors called', { page, size, sortBy, direction });
    return this.apiService.get<any>('/doctors/directory/paginated', {
      page,
      size,
      sortBy,
      direction
    }).pipe(
      map((response: any) => {
        console.log('[DoctorService] Raw response:', response);
        return this.normalizeResponse(response);
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error in getDoctors:', error);
        throw error;
      })
    );
  }

  private normalizeResponse(response: any): DoctorListResponse {
    console.log('[DoctorService] Normalizing response...', response);

    // Handle if response is a direct array
    let content = [];

    if (Array.isArray(response)) {
      console.log('[DoctorService] Response is a direct array');
      content = response;
    } else if (Array.isArray(response.content)) {
      console.log('[DoctorService] Response has content array');
      content = response.content;
    } else if (Array.isArray(response.data)) {
      console.log('[DoctorService] Response has data array');
      content = response.data;
    } else if (Array.isArray(response.doctors)) {
      console.log('[DoctorService] Response has doctors array');
      content = response.doctors;
    } else {
      console.warn('[DoctorService] No array found in response, treating as empty');
      content = [];
    }

    const totalElements = response.totalElements || response.total_elements || content.length || 0;
    const totalPages = response.totalPages || response.total_pages || Math.ceil((totalElements || 0) / 10) || 1;

    const normalized: DoctorListResponse = {
      content: (content || []).map((doc: any) => this.normalizeDoctor(doc)),
      totalElements,
      totalPages,
      pageable: response.pageable || {}
    };

    console.log('[DoctorService] Normalized response:', normalized);
    return normalized;
  }

  private normalizeDoctor(doc: any): Doctor {
    // Handle different field name conventions
    const name = doc.name || `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
    const email = doc.userEmail || doc.email || '';
    const specialization = doc.specialization || '';
    const licenseNumber = doc.licenseNumber || doc.license_number || '';
    const consultationFee = doc.consultationFee || doc.consultation_fee || 0;

    return {
      id: doc.id,
      name,
      email,
      specialization,
      licenseNumber,
      consultationFee,
      bio: doc.bio,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isOnline: doc.isOnline || false,
      lastSeen: doc.lastSeen
    };
  }

  // Search doctors by name
  searchByName(name: string, page: number = 0, size: number = 10): Observable<DoctorListResponse> {
    console.log('[DoctorService] searchByName called', { name, page, size });
    return this.apiService.get<any>('/doctors/directory/search/name', {
      name,
      page,
      size,
      sortBy: 'name',
      direction: 'ASC'
    }).pipe(
      map((response: any) => {
        console.log('[DoctorService] Search by name response:', response);
        return this.normalizeResponse(response);
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error in searchByName:', error);
        throw error;
      })
    );
  }

  // Search doctors by specialization
  searchBySpecialization(specialization: string, page: number = 0, size: number = 10): Observable<DoctorListResponse> {
    console.log('[DoctorService] searchBySpecialization called', { specialization, page, size });
    return this.apiService.get<any>('/doctors/directory/search/specialization', {
      specialization,
      page,
      size,
      sortBy: 'specialization',
      direction: 'ASC'
    }).pipe(
      map((response: any) => {
        console.log('[DoctorService] Search by specialization response:', response);
        return this.normalizeResponse(response);
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error in searchBySpecialization:', error);
        throw error;
      })
    );
  }

  // Get single doctor by ID
  getDoctorById(id: number): Observable<Doctor> {
    return this.apiService.get<Doctor>(`/doctors/directory/${id}`);
  }

  // Get doctor by email
  getDoctorByEmail(email: string): Observable<Doctor> {
    console.log('[DoctorService] getDoctorByEmail called:', email);
    return this.apiService.get<Doctor>('/doctors/directory/by-email', {
      email
    }).pipe(
      catchError((error: any) => {
        console.error('[DoctorService] Error fetching doctor by email:', email, error);
        throw error;
      })
    );
  }

  // Get all specializations from the directory
  getSpecializations(): Observable<string[]> {
    console.log('[DoctorService] getSpecializations called');
    return this.apiService.get<string[]>('/doctors/directory/specializations').pipe(
      map((response: any) => {
        console.log('[DoctorService] Specializations fetched:', response);
        return Array.isArray(response) ? response : [];
      }),
      catchError((error: any) => {
        console.error('[DoctorService] Error fetching specializations:', error);
        return of([]);
      })
    );
  }

  // Create new doctor
  createDoctor(doctor: any): Observable<Doctor> {
    return this.apiService.post<Doctor>('/doctors', doctor);
  }

  // Update doctor
  updateDoctor(id: number, doctor: any): Observable<Doctor> {
    return this.apiService.put<Doctor>(`/doctors/${id}`, doctor);
  }

  // Delete doctor
  deleteDoctor(id: number): Observable<any> {
    return this.apiService.delete(`/doctors/${id}`);
  }

  /**
   * Get complete doctor profile with data from auth service, user_information, and doctor tables
   * Data sources:
   * - doctor table: All professional and office information
   * - user_information table: Personal information (city, country, dateOfBirth, gender, etc.)
   * - auth_user table: Email, phone, etc.
   */
  getCompleteProfile(referenceNumber: string): Observable<any> {
    console.log('[DoctorService] getCompleteProfile called for reference:', referenceNumber);
    return this.apiService.get<any>('/doctors/profile/complete', {
      referenceNumber
    }).pipe(
      catchError((error: any) => {
        console.error('[DoctorService] Error fetching complete profile:', error);
        throw error;
      })
    );
  }

  /**
   * Update complete doctor profile
   * Saves all profile fields to the doctor table
   * Data updated: All fields from doctor table (name, email, phone, specialization, office info, etc.)
   */
  updateCompleteProfile(profileData: any, referenceNumber: string): Observable<any> {
    console.log('[DoctorService] updateCompleteProfile called for reference:', referenceNumber);
    return this.apiService.put<any>('/doctors/profile/complete', profileData, { referenceNumber }).pipe(
      catchError((error: any) => {
        console.error('[DoctorService] Error updating complete profile:', error);
        throw error;
      })
    );
  }

  /**
   * Change doctor's password
   * Validates current password and updates to new password
   * Data sources: auth_user table (password verification and update)
   */
  changePassword(referenceNumber: string, currentPassword: string, newPassword: string): Observable<any> {
    console.log('[DoctorService] changePassword called for reference:', referenceNumber);
    const request = {
      currentPassword,
      newPassword,
      referenceNumber
    };
    return this.apiService.post<any>('/doctors/profile/change-password', request).pipe(
      catchError((error: any) => {
        console.error('[DoctorService] Error changing password:', error);
        throw error;
      })
    );
  }
}
