import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

/**
 * Service for handling doctor password change requests
 * Routes to Auth Service backend (port 8082)
 * Responsible for:
 * - Validating password change requests
 * - Sending password updates to /auth/users/change-password endpoint
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorPasswordUpdateService {

  constructor(private apiService: ApiService) {}

  /**
   * Change doctor password via Auth Service
   * @param email - Doctor's email (identifies which user is changing password)
   * @param passwordChangeRequest - Contains currentPassword, newPassword, confirmPassword
   * @returns Observable<PasswordChangeResponse> with success status
   */
  changePassword(email: string, passwordChangeRequest: PasswordChangeRequest): Observable<PasswordChangeResponse> {
    console.log('[DoctorPasswordUpdateService] Initiating password change for email:', email);

    // Validate password confirmation
    if (passwordChangeRequest.newPassword !== passwordChangeRequest.confirmPassword) {
      console.error('[DoctorPasswordUpdateService] Password confirmation mismatch');
      return throwError(() => new Error('Passwords do not match'));
    }

    // Validate password strength (min 8 characters)
    if (passwordChangeRequest.newPassword.length < 8) {
      console.error('[DoctorPasswordUpdateService] Password too short');
      return throwError(() => new Error('Password must be at least 8 characters long'));
    }

    const requestPayload = {
      email: email,
      currentPassword: passwordChangeRequest.currentPassword,
      newPassword: passwordChangeRequest.newPassword
    };

    return this.apiService.put<PasswordChangeResponse>(
      '/auth/users/change-password',
      requestPayload
    ).pipe(
      tap((response: PasswordChangeResponse) => {
        console.log('[DoctorPasswordUpdateService] ✅ Password changed successfully:', response.message);
      }),
      catchError((error: any) => {
        console.error('[DoctorPasswordUpdateService] ❌ Error changing password:', error);
        console.error('[DoctorPasswordUpdateService] Error details:', error.message);

        let errorMessage = 'Failed to change password';
        if (error.status === 401) {
          errorMessage = 'Current password is incorrect';
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Invalid password format';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
