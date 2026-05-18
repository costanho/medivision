import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

/**
 * DIRECT DATABASE SERVICE
 *
 * Responsible for all operations on the user_information table in the direct database.
 * Handles detailed user profile and document information storage.
 *
 * Tables affected:
 * - user_information (direct database)
 *
 * Fields inserted:
 * - reference_number (links to auth_user table)
 * - gender
 * - country
 * - date_of_birth
 * - national_id_number (optional)
 * - passport_number (optional)
 */

export interface DirectDatabaseUserInformation {
  referenceNumber: string;
  gender: string;
  country: string;
  dateOfBirth: string;
  documentType: 'nationalId' | 'passport';
  nationalIdNumber?: string;
  passportNumber?: string;
  city?: string;
}

export interface DirectDatabaseResponse {
  success: boolean;
  message: string;
  id?: number;
  referenceNumber?: string;
  gender?: string;
  country?: string;
  dateOfBirth?: string;
  data?: {
    id: number;
    referenceNumber: string;
    gender: string;
    country: string;
    dateOfBirth: string;
  };
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DirectDatabaseService {
  constructor(private apiService: ApiService) {
    console.log('[DirectDatabaseService] ✅ Service initialized');
  }

  /**
   * Insert user information record into user_information table
   *
   * This is the SECOND database insert during registration.
   * Can only be called AFTER auth user is created successfully.
   * Reference number must exist in auth_user table first.
   *
   * @param userInfo - User profile information for direct database
   * @returns Observable with response from direct database
   */
  insertUserInformation(userInfo: DirectDatabaseUserInformation): Observable<DirectDatabaseResponse> {
    console.log('[DirectDatabaseService] 📝 Inserting user information record...');
    console.log('[DirectDatabaseService] Reference:', userInfo.referenceNumber);
    console.log('[DirectDatabaseService] Country:', userInfo.country);
    console.log('[DirectDatabaseService] Document Type:', userInfo.documentType);

    const payload = {
      referenceNumber: userInfo.referenceNumber,
      gender: userInfo.gender,
      country: userInfo.country,
      dateOfBirth: userInfo.dateOfBirth,
      documentType: userInfo.documentType,
      nationalIdNumber: userInfo.nationalIdNumber,
      passportNumber: userInfo.passportNumber,
      city: userInfo.city
    };

    return this.apiService.post<DirectDatabaseResponse>('/users-information', payload).pipe(
      tap((response: any) => {
        console.log('[DirectDatabaseService] Response:', response);
        // Backend returns UserInformationDTO directly, not wrapped in success/message
        const r = response as any;
        if (r && r.id) {
          console.log('[DirectDatabaseService] ✅ User information created successfully');
          console.log('[DirectDatabaseService] User Info ID:', r.id);
          // Transform to expected response format for orchestrator
          r.success = true;
          r.message = 'User information created';
          r.data = {
            id: r.id,
            referenceNumber: r.referenceNumber,
            gender: r.gender,
            country: r.country,
            dateOfBirth: r.dateOfBirth
          };
        } else {
          console.error('[DirectDatabaseService] ❌ Failed to create user information');
          console.error('[DirectDatabaseService] Response:', response);
        }
      })
    );
  }
}
