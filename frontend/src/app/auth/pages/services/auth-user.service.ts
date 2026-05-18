/**
 * Auth User Service
 *
 * Handles all operations related to the auth_user database table.
 * This service manages:
 * - User authentication credentials (email, password, reference)
 * - User identity (first name, last name)
 * - User access control (role, permissions)
 * - User contact (mobile phone)
 *
 * Database Table: auth_user
 * Fields: id, referenceNumber, email, password, firstName, lastName, role, mobilePhone, createdAt, updatedAt
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthUserData, RegistrationRequest, RegistrationResponse } from './registration-models';
import { ApiService } from '../../../core/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthUserService {
  // ─────────────────────────────────────────────────────────────────────
  // Service: AuthUserService
  // Purpose: Manage authentication user records
  // Scope: Core authentication and user identification only
  // ─────────────────────────────────────────────────────────────────────

  private authUsersSubject = new BehaviorSubject<AuthUserData[]>([]);
  // Cache of loaded auth users
  // Used for: Displaying user lists, reducing API calls

  public authUsers$ = this.authUsersSubject.asObservable();
  // Observable for components to subscribe to
  // Usage: this.authUserService.authUsers$.subscribe(users => {...})

  private currentAuthUserSubject = new BehaviorSubject<AuthUserData | null>(null);
  // Current logged-in user's auth data
  // Used for: Displaying current user info, checking authentication status

  public currentAuthUser$ = this.currentAuthUserSubject.asObservable();
  // Observable for current user
  // Usage: this.authUserService.currentAuthUser$.subscribe(user => {...})

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {
    console.log('[AuthUserService] ✅ Service initialized');
  }

  // ═════════════════════════════════════════════════════════════════════
  // CREATE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Register a new user (create auth_user record in auth database)
   *
   * Operation:
   * 1. Takes registration form data
   * 2. Extracts only required fields for auth_user table
   * 3. Sends to backend /auth/register endpoint
   * 4. Backend creates new record with: referenceNumber, email, firstName, lastName, role, mobilePhone
   * 5. Backend returns new user with id and tokens
   *
   * Fields inserted into auth_user table:
   * - referenceNumber (unique identifier linking tables)
   * - email (for login)
   * - firstName (user's first name)
   * - lastName (user's last name)
   * - role (PATIENT, DOCTOR, ADMIN)
   * - mobilePhone (contact number)
   *
   * @param userData - User registration data
   * @returns Observable with registration response
   *
   * Example:
   * const userData = {
   *   referenceNumber: "JDP240152123145",
   *   firstName: "John",
   *   surname: "Doe",
   *   email: "john@example.com",
   *   password: "SecurePass123",
   *   role: "PATIENT",
   *   mobilePhone: "+263712345678"
   * };
   * this.authUserService.registerUser(userData).subscribe(
   *   response => console.log("User created:", response),
   *   error => console.error("Registration failed:", error)
   * );
   */
  public registerUser(userData: RegistrationRequest): Observable<RegistrationResponse> {
    console.log('[AuthUserService] 📤 Creating new auth user in auth_user table...', {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.surname,
      role: userData.role,
      phone: userData.mobilePhone
    });

    // Extract only fields needed for auth_user table
    // Backend expects: referenceNumber, email, firstName, lastName, role, phone, password
    const authUserPayload = {
      referenceNumber: userData.referenceNumber,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.surname,
      role: userData.role,
      phone: userData.mobilePhone,
      password: userData.password  // REQUIRED for authentication
    };

    return this.apiService.post<any>('/auth/register', authUserPayload).pipe(
      map(response => {
        // Backend returns JWT tokens directly: { accessToken, refreshToken }
        // Transform to RegistrationResponse format expected by calling code
        const registrationResponse: RegistrationResponse = {
          success: true,
          message: 'Registration successful',
          data: {
            referenceNumber: userData.referenceNumber,
            email: userData.email,
            role: userData.role
          }
        };

        console.log('[AuthUserService] ✅ Auth user created successfully in auth_user table', {
          referenceNumber: registrationResponse.data?.referenceNumber,
          email: registrationResponse.data?.email,
          role: registrationResponse.data?.role,
          accessToken: response.accessToken ? 'present' : 'missing',
          refreshToken: response.refreshToken ? 'present' : 'missing'
        });

        // Update cache with new user
        const newUser: AuthUserData = {
          referenceNumber: userData.referenceNumber,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.surname,
          role: userData.role as any,
          mobilePhone: userData.mobilePhone
        };
        // Could update authUsersSubject here if needed

        return registrationResponse;
      }),
      catchError(error => {
        console.error('[AuthUserService] ❌ Auth user creation failed in auth_user table', error);
        // Transform error response to standard format
        const errorResponse: RegistrationResponse = {
          success: false,
          message: 'Registration failed',
          error: error.error?.error || error.message || 'Unknown error'
        };
        throw errorResponse;
      })
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // READ OPERATIONS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Get auth user by email
   *
   * @param email - User's email address
   * @returns Observable with user data
   *
   * Example:
   * this.authUserService.getUserByEmail("john@example.com").subscribe(
   *   user => console.log("User found:", user)
   * );
   */
  public getUserByEmail(email: string): Observable<AuthUserData> {
    console.log('[AuthUserService] 🔍 Fetching user by email:', email);

    return this.apiService.get<AuthUserData>('/auth/users/by-email', { email }).pipe(
      tap(user => {
        console.log('[AuthUserService] ✅ User found:', {
          email: user.email,
          referenceNumber: user.referenceNumber
        });
        this.currentAuthUserSubject.next(user);
      }),
      catchError(error => {
        console.error('[AuthUserService] ❌ User not found:', error);
        throw error;
      })
    );
  }

  /**
   * Get auth user by reference number
   *
   * @param referenceNumber - User's reference number
   * @returns Observable with user data
   *
   * Example:
   * this.authUserService.getUserByReference("AUTH-12345-6789").subscribe(
   *   user => console.log("User found:", user)
   * );
   */
  public getUserByReference(referenceNumber: string): Observable<AuthUserData> {
    console.log('[AuthUserService] 🔍 Fetching user by reference:', referenceNumber);

    return this.apiService.get<AuthUserData>(`/auth/users/${referenceNumber}`).pipe(
      tap(user => {
        console.log('[AuthUserService] ✅ User found by reference:', user.email);
        this.currentAuthUserSubject.next(user);
      }),
      catchError(error => {
        console.error('[AuthUserService] ❌ User not found:', error);
        throw error;
      })
    );
  }

  /**
   * Get current logged-in user's auth data
   *
   * @returns Current user from subject (immediate)
   *
   * Example:
   * const currentUser = this.authUserService.getCurrentUser();
   * if (currentUser) {
   *   console.log("Current user:", currentUser.email);
   * }
   */
  public getCurrentUser(): AuthUserData | null {
    return this.currentAuthUserSubject.getValue();
  }

  /**
   * Get all auth users (admin only)
   *
   * @returns Observable with all users
   *
   * Example:
   * this.authUserService.getAllUsers().subscribe(
   *   users => console.log("Total users:", users.length)
   * );
   */
  public getAllUsers(): Observable<AuthUserData[]> {
    console.log('[AuthUserService] 🔍 Fetching all users...');

    return this.apiService.get<AuthUserData[]>('/auth/users').pipe(
      tap(users => {
        console.log('[AuthUserService] ✅ Loaded users:', users.length);
        this.authUsersSubject.next(users);
      }),
      catchError(error => {
        console.error('[AuthUserService] ❌ Failed to load users:', error);
        throw error;
      })
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // UPDATE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Update user auth data
   *
   * Note: Updates basic auth fields only. For profile updates, use UserInformationService.
   *
   * @param referenceNumber - User's reference number
   * @param updateData - Fields to update
   * @returns Observable with updated user
   *
   * Example:
   * this.authUserService.updateUser("AUTH-12345-6789", {
   *   mobilePhone: "+263712345679"
   * }).subscribe(
   *   updated => console.log("User updated:", updated)
   * );
   */
  public updateUser(referenceNumber: string, updateData: Partial<AuthUserData>): Observable<AuthUserData> {
    console.log('[AuthUserService] 📝 Updating user:', {
      referenceNumber,
      fields: Object.keys(updateData)
    });

    return this.apiService.put<AuthUserData>(`/auth/users/${referenceNumber}`, updateData).pipe(
      tap(updated => {
        console.log('[AuthUserService] ✅ User updated:', {
          referenceNumber: updated.referenceNumber,
          email: updated.email
        });
        this.currentAuthUserSubject.next(updated);
      }),
      catchError(error => {
        console.error('[AuthUserService] ❌ Update failed:', error);
        throw error;
      })
    );
  }

  /**
   * Update user's phone number
   *
   * Convenience method for common update operation
   *
   * @param referenceNumber - User's reference number
   * @param mobilePhone - New phone number with country code
   * @returns Observable with updated user
   *
   * Example:
   * this.authUserService.updatePhoneNumber("AUTH-12345-6789", "+263712345679")
   *   .subscribe(updated => console.log("Phone updated"));
   */
  public updatePhoneNumber(referenceNumber: string, mobilePhone: string): Observable<AuthUserData> {
    console.log('[AuthUserService] 📝 Updating phone number:', {
      referenceNumber,
      mobilePhone
    });

    return this.updateUser(referenceNumber, { mobilePhone });
  }

  /**
   * Update user's role (admin only)
   *
   * Convenience method for changing user role
   *
   * @param referenceNumber - User's reference number
   * @param role - New role (PATIENT, DOCTOR, ADMIN)
   * @returns Observable with updated user
   *
   * Example:
   * this.authUserService.updateRole("AUTH-12345-6789", "DOCTOR")
   *   .subscribe(updated => console.log("Role updated to:", updated.role));
   */
  public updateRole(referenceNumber: string, role: 'PATIENT' | 'DOCTOR' | 'ADMIN'): Observable<AuthUserData> {
    console.log('[AuthUserService] 📝 Updating user role:', {
      referenceNumber,
      newRole: role
    });

    return this.updateUser(referenceNumber, { role });
  }

  // ═════════════════════════════════════════════════════════════════════
  // DELETE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Delete/deactivate a user account
   *
   * Note: This might soft-delete (mark as inactive) rather than hard-delete
   * Check backend implementation for actual behavior
   *
   * @param referenceNumber - User to delete
   * @returns Observable with deletion result
   *
   * Example:
   * this.authUserService.deleteUser("AUTH-12345-6789").subscribe(
   *   result => console.log("User deleted")
   * );
   */
  public deleteUser(referenceNumber: string): Observable<any> {
    console.log('[AuthUserService] 🗑️  Deleting user:', referenceNumber);

    return this.apiService.delete(`/auth/users/${referenceNumber}`).pipe(
      tap(() => {
        console.log('[AuthUserService] ✅ User deleted:', referenceNumber);
        if (this.currentAuthUserSubject.getValue()?.referenceNumber === referenceNumber) {
          this.currentAuthUserSubject.next(null);
        }
      }),
      catchError(error => {
        console.error('[AuthUserService] ❌ Deletion failed:', error);
        throw error;
      })
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Set current user (after login/registration)
   *
   * @param user - User data to set as current
   *
   * Example:
   * this.authUserService.setCurrentUser(userData);
   */
  public setCurrentUser(user: AuthUserData | null): void {
    if (user) {
      console.log('[AuthUserService] 👤 Setting current user:', user.email);
    } else {
      console.log('[AuthUserService] 👤 Clearing current user');
    }
    this.currentAuthUserSubject.next(user);
  }

  /**
   * Clear current user (logout)
   *
   * Example:
   * this.authUserService.clearCurrentUser();
   */
  public clearCurrentUser(): void {
    console.log('[AuthUserService] 🚪 Logging out user');
    this.currentAuthUserSubject.next(null);
  }

  /**
   * Validate if email exists
   *
   * @param email - Email to check
   * @returns Observable with boolean result
   *
   * Example:
   * this.authUserService.isEmailExists("john@example.com").subscribe(
   *   exists => {
   *     if (exists) console.log("Email already registered");
   *     else console.log("Email available");
   *   }
   * );
   */
  public isEmailExists(email: string): Observable<boolean> {
    console.log('[AuthUserService] 🔍 Checking if email exists:', email);

    return this.apiService.get<{ exists: boolean }>('/auth/check-email', { email }).pipe(
      map(response => response.exists),
      catchError(() => {
        // If error, assume email doesn't exist (safer for validation)
        return of(false);
      })
    );
  }

  /**
   * Validate if reference number exists
   *
   * @param referenceNumber - Reference to check
   * @returns Observable with boolean result
   *
   * Example:
   * this.authUserService.isReferenceExists("AUTH-12345-6789").subscribe(
   *   exists => console.log("Reference exists:", exists)
   * );
   */
  public isReferenceExists(referenceNumber: string): Observable<boolean> {
    console.log('[AuthUserService] 🔍 Checking if reference exists:', referenceNumber);

    return this.apiService.get<{ exists: boolean }>('/auth/check-reference', { referenceNumber }).pipe(
      map(response => response.exists),
      catchError(() => {
        return of(false);
      })
    );
  }
}
