/**
 * User Information Service
 *
 * Handles all operations related to the user_information database table.
 * This service manages:
 * - Extended user profile (personal details, location, health info)
 * - Identity documents (national ID, passport)
 * - File storage (profile pictures, supporting documents)
 *
 * Database Table: user_information
 * Linked to: auth_user via referenceNumber
 * Fields: id, referenceNumber, dateOfBirth, gender, country, city, streetAddress, state, zipCode,
 *         nationalIdNumber, passportNumber, profilePictureUrl, supportingDocuments, createdAt, updatedAt
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { UserInformation, UserProfileUpdateRequest, UserProfileResponse } from './registration-models';

@Injectable({
  providedIn: 'root'
})
export class UserInformationService {
  // ─────────────────────────────────────────────────────────────────────
  // Service: UserInformationService
  // Purpose: Manage user profile and extended information
  // Scope: User profile, documents, and personal details
  // ─────────────────────────────────────────────────────────────────────

  private apiUrl = '/api/users';
  // Base URL for user-related endpoints
  // Example: http://localhost:8081/api/users
  // Backend service: User/Direct Service (port 8081)

  private userInfoSubject = new BehaviorSubject<UserInformation | null>(null);
  // Current user's profile information
  // Used for: Displaying profile, editing profile info

  public userInfo$ = this.userInfoSubject.asObservable();
  // Observable for components to subscribe to
  // Usage: this.userInformationService.userInfo$.subscribe(info => {...})

  private allUsersInfoSubject = new BehaviorSubject<UserInformation[]>([]);
  // Cache of all users' info (for admin purposes)
  // Used for: User management, reporting

  public allUsersInfo$ = this.allUsersInfoSubject.asObservable();
  // Observable for user list
  // Usage: this.userInformationService.allUsersInfo$.subscribe(users => {...})

  constructor(private http: HttpClient) {
    console.log('[UserInformationService] ✅ Service initialized');
  }

  // ═════════════════════════════════════════════════════════════════════
  // CREATE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Create initial user information record in user_information table (direct database)
   *
   * Operation:
   * 1. Takes user info data
   * 2. Extracts only required fields for user_information table
   * 3. Sends to backend to create user_information record
   * 4. Links to auth_user via referenceNumber
   * 5. Returns created record with id
   *
   * Fields inserted into user_information table:
   * - referenceNumber (links to auth_user)
   * - gender (Male, Female, Other)
   * - country (user's country)
   * - dateOfBirth (user's date of birth)
   * - nationalIdNumber (national ID if provided)
   * - passportNumber (passport number if provided)
   *
   * Called after: User registration in auth_user table
   *
   * @param userInfo - User information to store
   * @returns Observable with created user info
   *
   * Example:
   * const userInfo = {
   *   referenceNumber: "JDP240152123145",
   *   dateOfBirth: "1990-05-15",
   *   gender: "Male",
   *   country: "Zimbabwe",
   *   nationalIdNumber: "ZW123456789",
   *   passportNumber: null
   * };
   * this.userInformationService.createUserInfo(userInfo).subscribe(
   *   created => console.log("User info created:", created),
   *   error => console.error("Creation failed:", error)
   * );
   */
  public createUserInfo(userInfo: UserInformation): Observable<UserInformation> {
    console.log('[UserInformationService] 📤 Creating user information in user_information table...', {
      referenceNumber: userInfo.referenceNumber,
      gender: userInfo.gender,
      country: userInfo.country,
      dateOfBirth: userInfo.dateOfBirth,
      nationalIdNumber: userInfo.nationalIdNumber,
      passportNumber: userInfo.passportNumber
    });

    // Extract only fields needed for user_information table
    const userInfoPayload = {
      referenceNumber: userInfo.referenceNumber,
      gender: userInfo.gender,
      country: userInfo.country,
      dateOfBirth: userInfo.dateOfBirth,
      nationalIdNumber: userInfo.nationalIdNumber,
      passportNumber: userInfo.passportNumber
    };

    return this.http.post<UserInformation>(`${this.apiUrl}/information`, userInfoPayload).pipe(
      tap(created => {
        console.log('[UserInformationService] ✅ User information created in user_information table', {
          referenceNumber: created.referenceNumber,
          id: created.id
        });
        this.userInfoSubject.next(created);
      }),
      catchError(error => {
        console.error('[UserInformationService] ❌ Creation failed in user_information table', error);
        throw error;
      })
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // READ OPERATIONS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Get user information by reference number
   *
   * @param referenceNumber - User's reference number
   * @returns Observable with user info
   *
   * Example:
   * this.userInformationService.getUserInfo("AUTH-12345-6789").subscribe(
   *   info => console.log("User info:", info)
   * );
   */
  public getUserInfo(referenceNumber: string): Observable<UserInformation> {
    console.log('[UserInformationService] 🔍 Fetching user information:', referenceNumber);

    return this.http.get<UserInformation>(`${this.apiUrl}/${referenceNumber}/information`).pipe(
      tap(info => {
        console.log('[UserInformationService] ✅ User info loaded:', {
          referenceNumber: info.referenceNumber,
          country: info.country
        });
        this.userInfoSubject.next(info);
      }),
      catchError(error => {
        console.error('[UserInformationService] ❌ Failed to load user info:', error);
        throw error;
      })
    );
  }

  /**
   * Get current user's information (from cache)
   *
   * @returns Current user info from subject (immediate)
   *
   * Example:
   * const userInfo = this.userInformationService.getCurrentUserInfo();
   * if (userInfo) {
   *   console.log("User from:", userInfo.country, userInfo.city);
   * }
   */
  public getCurrentUserInfo(): UserInformation | null {
    return this.userInfoSubject.getValue();
  }

  /**
   * Get all users information (admin only)
   *
   * @returns Observable with all user info records
   *
   * Example:
   * this.userInformationService.getAllUsersInfo().subscribe(
   *   users => console.log("Total users:", users.length)
   * );
   */
  public getAllUsersInfo(): Observable<UserInformation[]> {
    console.log('[UserInformationService] 🔍 Fetching all users information...');

    return this.http.get<UserInformation[]>(`${this.apiUrl}/information`).pipe(
      tap(users => {
        console.log('[UserInformationService] ✅ Loaded user info:', users.length);
        this.allUsersInfoSubject.next(users);
      }),
      catchError(error => {
        console.error('[UserInformationService] ❌ Failed to load users info:', error);
        throw error;
      })
    );
  }

  /**
   * Get user info by email (requires lookup in auth service first)
   *
   * @param email - User's email
   * @returns Observable with user info
   *
   * Example:
   * this.userInformationService.getUserInfoByEmail("john@example.com").subscribe(
   *   info => console.log("User info by email:", info)
   * );
   */
  public getUserInfoByEmail(email: string): Observable<UserInformation> {
    console.log('[UserInformationService] 🔍 Fetching user info by email:', email);

    return this.http.get<UserInformation>(`${this.apiUrl}/information/by-email`, {
      params: { email }
    }).pipe(
      tap(info => {
        console.log('[UserInformationService] ✅ User info loaded by email');
        this.userInfoSubject.next(info);
      }),
      catchError(error => {
        console.error('[UserInformationService] ❌ Failed to load user info by email:', error);
        throw error;
      })
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // UPDATE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Update user information
   *
   * Can update any subset of user information fields.
   * Only provided fields will be updated.
   *
   * @param referenceNumber - User's reference number
   * @param updateData - Fields to update
   * @returns Observable with updated user info
   *
   * Example:
   * this.userInformationService.updateUserInfo("AUTH-12345-6789", {
   *   city: "Bulawayo",
   *   country: "Zimbabwe",
   *   dateOfBirth: "1990-05-15"
   * }).subscribe(
   *   updated => console.log("User info updated:", updated)
   * );
   */
  public updateUserInfo(referenceNumber: string, updateData: Partial<UserInformation>): Observable<UserInformation> {
    console.log('[UserInformationService] 📝 Updating user information:', {
      referenceNumber,
      fields: Object.keys(updateData)
    });

    return this.http.put<UserInformation>(`${this.apiUrl}/${referenceNumber}/information`, updateData).pipe(
      tap(updated => {
        console.log('[UserInformationService] ✅ User info updated:', {
          referenceNumber: updated.referenceNumber,
          fields: Object.keys(updateData)
        });
        this.userInfoSubject.next(updated);
      }),
      catchError(error => {
        console.error('[UserInformationService] ❌ Update failed:', error);
        throw error;
      })
    );
  }

  /**
   * Update profile picture
   *
   * Convenience method for uploading/updating profile picture
   *
   * @param referenceNumber - User's reference number
   * @param pictureUrl - URL/path to profile picture
   * @returns Observable with updated user info
   *
   * Example:
   * this.userInformationService.updateProfilePicture("AUTH-12345-6789", "/uploads/pic.jpg")
   *   .subscribe(updated => console.log("Picture updated"));
   */
  public updateProfilePicture(referenceNumber: string, pictureUrl: string): Observable<UserInformation> {
    console.log('[UserInformationService] 📷 Updating profile picture:', referenceNumber);

    return this.updateUserInfo(referenceNumber, { profilePictureUrl: pictureUrl });
  }

  /**
   * Add supporting documents
   *
   * Appends document URLs to existing documents array
   *
   * @param referenceNumber - User's reference number
   * @param documentUrls - URLs of documents to add
   * @returns Observable with updated user info
   *
   * Example:
   * this.userInformationService.addDocuments("AUTH-12345-6789", [
   *   "/uploads/doc1.pdf",
   *   "/uploads/doc2.pdf"
   * ]).subscribe(updated => console.log("Documents added"));
   */
  public addDocuments(referenceNumber: string, documentUrls: string[]): Observable<UserInformation> {
    console.log('[UserInformationService] 📄 Adding documents:', {
      referenceNumber,
      count: documentUrls.length
    });

    // Get current documents first
    const currentInfo = this.userInfoSubject.getValue();
    const existingDocs = currentInfo?.supportingDocuments || [];
    const allDocs = [...existingDocs, ...documentUrls];

    return this.updateUserInfo(referenceNumber, { supportingDocuments: allDocs });
  }

  /**
   * Update identity document
   *
   * Convenience method for updating national ID or passport
   *
   * @param referenceNumber - User's reference number
   * @param documentType - Type of document ("nationalId" or "passport")
   * @param documentNumber - Document number
   * @returns Observable with updated user info
   *
   * Example:
   * this.userInformationService.updateIdentityDocument(
   *   "AUTH-12345-6789",
   *   "nationalId",
   *   "ZW123456789"
   * ).subscribe(updated => console.log("Document updated"));
   */
  public updateIdentityDocument(
    referenceNumber: string,
    documentType: 'nationalId' | 'passport',
    documentNumber: string
  ): Observable<UserInformation> {
    console.log('[UserInformationService] 📋 Updating identity document:', {
      referenceNumber,
      documentType,
      documentNumber
    });

    const updateData = documentType === 'nationalId'
      ? { nationalIdNumber: documentNumber }
      : { passportNumber: documentNumber };

    return this.updateUserInfo(referenceNumber, updateData);
  }

  /**
   * Update user location
   *
   * Convenience method for updating address info
   *
   * @param referenceNumber - User's reference number
   * @param location - Location data
   * @returns Observable with updated user info
   *
   * Example:
   * this.userInformationService.updateLocation("AUTH-12345-6789", {
   *   country: "Zimbabwe",
   *   city: "Harare",
   *   streetAddress: "123 Main St"
   * }).subscribe(updated => console.log("Location updated"));
   */
  public updateLocation(
    referenceNumber: string,
    location: {
      country?: string;
      city?: string;
      state?: string;
      streetAddress?: string;
      zipCode?: string;
    }
  ): Observable<UserInformation> {
    console.log('[UserInformationService] 📍 Updating user location:', {
      referenceNumber,
      country: location.country,
      city: location.city
    });

    return this.updateUserInfo(referenceNumber, location);
  }

  // ═════════════════════════════════════════════════════════════════════
  // DELETE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Delete user information record
   *
   * @param referenceNumber - User to delete info for
   * @returns Observable with deletion result
   *
   * Example:
   * this.userInformationService.deleteUserInfo("AUTH-12345-6789").subscribe(
   *   () => console.log("User info deleted")
   * );
   */
  public deleteUserInfo(referenceNumber: string): Observable<any> {
    console.log('[UserInformationService] 🗑️  Deleting user information:', referenceNumber);

    return this.http.delete(`${this.apiUrl}/${referenceNumber}/information`).pipe(
      tap(() => {
        console.log('[UserInformationService] ✅ User information deleted:', referenceNumber);
        if (this.userInfoSubject.getValue()?.referenceNumber === referenceNumber) {
          this.userInfoSubject.next(null);
        }
      }),
      catchError(error => {
        console.error('[UserInformationService] ❌ Deletion failed:', error);
        throw error;
      })
    );
  }

  /**
   * Remove document from user's documents
   *
   * @param referenceNumber - User's reference number
   * @param documentUrl - Document URL to remove
   * @returns Observable with updated user info
   *
   * Example:
   * this.userInformationService.removeDocument(
   *   "AUTH-12345-6789",
   *   "/uploads/doc1.pdf"
   * ).subscribe(updated => console.log("Document removed"));
   */
  public removeDocument(referenceNumber: string, documentUrl: string): Observable<UserInformation> {
    console.log('[UserInformationService] 🗑️  Removing document:', {
      referenceNumber,
      documentUrl
    });

    const currentInfo = this.userInfoSubject.getValue();
    const existingDocs = currentInfo?.supportingDocuments || [];
    const filteredDocs = existingDocs.filter(doc => doc !== documentUrl);

    return this.updateUserInfo(referenceNumber, { supportingDocuments: filteredDocs });
  }

  // ═════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Set current user info (after loading profile)
   *
   * @param userInfo - User info to set as current
   *
   * Example:
   * this.userInformationService.setCurrentUserInfo(userInfo);
   */
  public setCurrentUserInfo(userInfo: UserInformation | null): void {
    if (userInfo) {
      console.log('[UserInformationService] 👤 Setting current user info:', userInfo.referenceNumber);
    } else {
      console.log('[UserInformationService] 👤 Clearing current user info');
    }
    this.userInfoSubject.next(userInfo);
  }

  /**
   * Clear current user info (logout)
   *
   * Example:
   * this.userInformationService.clearCurrentUserInfo();
   */
  public clearCurrentUserInfo(): void {
    console.log('[UserInformationService] 🚪 Clearing user info on logout');
    this.userInfoSubject.next(null);
  }

  /**
   * Check if user has completed profile
   *
   * Checks if essential profile fields are filled
   *
   * @param referenceNumber - User's reference number
   * @returns Observable with boolean result
   *
   * Example:
   * this.userInformationService.isProfileComplete("AUTH-12345-6789").subscribe(
   *   complete => {
   *     if (complete) console.log("Profile is complete");
   *     else console.log("Profile needs more info");
   *   }
   * );
   */
  public isProfileComplete(referenceNumber: string): Observable<boolean> {
    console.log('[UserInformationService] 🔍 Checking profile completion:', referenceNumber);

    return this.getUserInfo(referenceNumber).pipe(
      map(info => {
        const isComplete = !!(
          info.dateOfBirth &&
          info.gender &&
          info.country &&
          info.city &&
          (info.nationalIdNumber || info.passportNumber)
        );
        console.log('[UserInformationService] ✅ Profile complete:', isComplete);
        return isComplete;
      }),
      catchError(() => of(false))
    );
  }
}
