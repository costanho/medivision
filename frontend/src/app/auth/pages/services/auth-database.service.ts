import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

/**
 * AUTH DATABASE SERVICE
 *
 * Responsible for all operations on the auth_user table in the auth database.
 * Handles credential and basic user information storage.
 *
 * Tables affected:
 * - auth_user (auth database)
 *
 * Fields inserted:
 * - reference_number (unique identifier)
 * - email (login credential)
 * - first_name
 * - last_name
 * - role (PATIENT, DOCTOR, ADMIN)
 * - phone_number
 */

export interface AuthDatabaseUserRecord {
  referenceNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  mobilePhone: string;
  password?: string; // Only for creation, not stored in response
}

export interface AuthDatabaseResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    referenceNumber: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    accessToken?: string;
    refreshToken?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthDatabaseService {
  constructor(private apiService: ApiService) {
    console.log('[AuthDatabaseService] ✅ Service initialized');
  }

  /**
   * Insert user record into auth_user table
   *
   * This is the FIRST database insert during registration.
   * Auth user must be created before user_information because:
   * - User needs credentials for login
   * - Reference number links all related records
   *
   * @param userData - User data for auth table
   * @returns Observable with response from auth database
   */
  insertAuthUser(userData: AuthDatabaseUserRecord): Observable<any> {
    console.log('[AuthDatabaseService] 📝 Inserting auth user record...');
    console.log('[AuthDatabaseService] Reference:', userData.referenceNumber);
    console.log('[AuthDatabaseService] Email:', userData.email);
    console.log('[AuthDatabaseService] Role:', userData.role);

    const payload = {
      referenceNumber: userData.referenceNumber,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      mobilePhone: userData.mobilePhone,
      password: userData.password
    };

    return this.apiService.post<any>('/auth/register', payload).pipe(
      tap((response: any) => {
        console.log('[AuthDatabaseService] Backend response:', response);
        if (response && (response as any).accessToken) {
          console.log('[AuthDatabaseService] ✅ Auth user created successfully');
          console.log('[AuthDatabaseService] Tokens generated for:', userData.email);
          // Transform response to expected format
          response.success = true;
          response.message = 'Auth user created';
          response.data = {
            referenceNumber: userData.referenceNumber,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            accessToken: (response as any).accessToken,
            refreshToken: (response as any).refreshToken
          };
        } else {
          console.error('[AuthDatabaseService] ❌ Failed to create auth user - no access token');
        }
      })
    );
  }
}
