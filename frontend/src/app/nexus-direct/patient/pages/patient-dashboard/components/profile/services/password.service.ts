import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, tap, catchError } from 'rxjs/operators';
import { AuthService } from '../../../../../../../core/services/auth.service';

/**
 * PasswordService
 *
 * Handles password change logic and validation.
 * Manages password form state separately from the main profile form.
 */
@Injectable({
  providedIn: 'root'
})
export class PasswordService {
  private showPasswordFormSubject = new BehaviorSubject<boolean>(false);
  showPasswordForm$ = this.showPasswordFormSubject.asObservable();

  private passwordLoadingSubject = new BehaviorSubject<boolean>(false);
  passwordLoading$ = this.passwordLoadingSubject.asObservable();

  private passwordErrorSubject = new BehaviorSubject<string>('');
  passwordError$ = this.passwordErrorSubject.asObservable();

  private passwordSuccessSubject = new BehaviorSubject<string>('');
  passwordSuccess$ = this.passwordSuccessSubject.asObservable();

  private passwordSubmittedSubject = new BehaviorSubject<boolean>(false);
  passwordSubmitted$ = this.passwordSubmittedSubject.asObservable();

  constructor(private authService: AuthService) {}

  // ──────────────────────────────────────────────────────────────────
  // PASSWORD FORM VISIBILITY
  // ──────────────────────────────────────────────────────────────────

  togglePasswordForm(): void {
    const currentState = this.showPasswordFormSubject.getValue();
    console.log(`[PasswordService] Toggling password form: ${currentState} -> ${!currentState}`);
    this.showPasswordFormSubject.next(!currentState);

    if (!currentState) {
      // Closing form - reset state
      this.resetPasswordState();
    }
  }

  setShowPasswordForm(show: boolean): void {
    this.showPasswordFormSubject.next(show);
  }

  isShowingPasswordForm(): boolean {
    return this.showPasswordFormSubject.getValue();
  }

  // ──────────────────────────────────────────────────────────────────
  // PASSWORD CHANGE SUBMISSION
  // ──────────────────────────────────────────────────────────────────

  /**
   * Change password
   * @param currentPassword Current password
   * @param newPassword New password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    this.passwordLoadingSubject.next(true);
    this.passwordErrorSubject.next('');
    this.passwordSuccessSubject.next('');

    const passwordData = {
      currentPassword: currentPassword,
      newPassword: newPassword
    };

    console.log('[PasswordService] Attempting password change...');

    // TODO: Integrate with actual password change endpoint when available
    // Temporarily returning simulated success
    return of({ success: true }).pipe(
      delay(1000),
      tap((result: any) => {
        console.log('[PasswordService] ✅ Password changed successfully:', result);
        this.passwordLoadingSubject.next(false);
        this.setSuccess('Password changed successfully!');
        this.closePasswordForm();
      }),
      catchError((err: any) => {
        console.error('[PasswordService] ❌ Password change failed:', err);
        this.passwordLoadingSubject.next(false);
        this.setError(this.parsePasswordError(err));
        throw err;
      })
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // PASSWORD VALIDATION
  // ──────────────────────────────────────────────────────────────────

  /**
   * Validate password match
   */
  validatePasswordMatch(newPassword: string, confirmPassword: string): boolean {
    return newPassword === confirmPassword;
  }

  /**
   * Get password strength score (0-3)
   * 0: weak, 1: fair, 2: good, 3: strong
   */
  getPasswordStrength(password: string): number {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

    return Math.min(strength, 3);
  }

  /**
   * Get password strength label
   */
  getPasswordStrengthLabel(password: string): string {
    const strength = this.getPasswordStrength(password);
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return labels[strength] || 'Weak';
  }

  // ──────────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────

  setSubmitted(submitted: boolean): void {
    this.passwordSubmittedSubject.next(submitted);
  }

  isSubmitted(): boolean {
    return this.passwordSubmittedSubject.getValue();
  }

  setError(message: string): void {
    this.passwordErrorSubject.next(message);
  }

  setSuccess(message: string): void {
    this.passwordSuccessSubject.next(message);
    // Auto-clear success message after 3 seconds
    setTimeout(() => {
      if (this.passwordSuccessSubject.getValue() === message) {
        this.passwordSuccessSubject.next('');
      }
    }, 3000);
  }

  getError(): string {
    return this.passwordErrorSubject.getValue();
  }

  getSuccess(): string {
    return this.passwordSuccessSubject.getValue();
  }

  closePasswordForm(): void {
    this.showPasswordFormSubject.next(false);
    this.resetPasswordState();
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ──────────────────────────────────────────────────────────────────

  private resetPasswordState(): void {
    console.log('[PasswordService] Resetting password state');
    this.passwordSubmittedSubject.next(false);
    this.passwordErrorSubject.next('');
    this.passwordSuccessSubject.next('');
    this.passwordLoadingSubject.next(false);
  }

  private parsePasswordError(error: any): string {
    if (error.status === 401) {
      return 'Current password is incorrect';
    } else if (error.status === 400) {
      return 'Invalid password format or requirements not met';
    } else if (error.error?.message) {
      return error.error.message;
    }
    return 'Failed to change password. Please try again.';
  }
}
