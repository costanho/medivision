import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

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
 * Service for handling password change requests
 * Routes to Auth Service backend (port 8082)
 * Responsible for:
 * - Validating password change requests
 * - Sending password updates to /auth/users/change-password endpoint
 */
@Injectable({
  providedIn: 'root'
})
export class PasswordUpdateService {

  constructor(private apiService: ApiService) {}

  /**
   * Change user password via Auth Service
   * @param email - User's email (identifies which user is changing password)
   * @param passwordChangeRequest - Contains currentPassword, newPassword, confirmPassword
   * @returns Observable<PasswordChangeResponse> with success status
   */
  changePassword(email: string, passwordChangeRequest: PasswordChangeRequest): Observable<PasswordChangeResponse> {
    console.log('[PasswordUpdateService] Initiating password change for email:', email);

    // Validate password confirmation
    if (passwordChangeRequest.newPassword !== passwordChangeRequest.confirmPassword) {
      console.error('[PasswordUpdateService] Password confirmation mismatch');
      return throwError(() => new Error('Passwords do not match'));
    }

    // Validate password strength (min 8 characters)
    if (passwordChangeRequest.newPassword.length < 8) {
      console.error('[PasswordUpdateService] Password too short');
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
        console.log('[PasswordUpdateService] ✅ Password changed successfully:', response.message);
      }),
      catchError((error: any) => {
        console.error('[PasswordUpdateService] ❌ Error changing password:', error);
        console.error('[PasswordUpdateService] Error details:', error.message);

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
