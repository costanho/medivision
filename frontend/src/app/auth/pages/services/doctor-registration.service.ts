import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

/**
 * DOCTOR REGISTRATION SERVICE
 *
 * Handles doctor-specific registration logic.
 * Only executes if user role is DOCTOR.
 *
 * Tables affected:
 * - doctor (direct database)
 *
 * Fields inserted (matching database schema):
 * - referenceNumber (links to auth_user table and user_information)
 * - name (Dr. + firstName + surname)
 * - userEmail (for multi-tenancy filtering and access control)
 *
 * This creates a minimal doctor role record in the doctor table,
 * allowing the system to identify and manage doctor-specific features.
 *
 * Extended information (office details, specializations, license, etc.)
 * can be added through a doctor profile update endpoint.
 *
 * Note: Doctor table has minimal fields for registration.
 * Extended doctor information is stored in the user_information table.
 */

export interface DoctorRecord {
  referenceNumber: string;
}

export interface DoctorRegistrationResponse {
  success: boolean;
  message: string;
  id?: number;
  referenceNumber?: string;
  createdAt?: string;
  data?: {
    id: number;
    referenceNumber: string;
    createdAt: string;
  };
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorRegistrationService {
  constructor(private apiService: ApiService) {
    console.log('[DoctorRegistrationService] ✅ Service initialized');
  }

  /**
   * Create doctor record
   *
   * This is called ONLY if user selected DOCTOR role.
   * Must be called AFTER auth user and user_information are created.
   *
   * Creates a minimal doctor role record in the doctor table.
   * Extended information (specialization, license, office details, etc.)
   * can be added later through a doctor profile update endpoint.
   *
   * Payload sent to backend:
   * - referenceNumber: Generated reference number for linking across databases
   * - name: Combined firstName + surname with "Dr." prefix
   * - userEmail: Doctor's email for multi-tenancy enforcement
   *
   * @param formData - Complete registration form data
   * @returns Observable with response from direct database
   */
  createDoctorRecord(formData: any): Observable<DoctorRegistrationResponse> {
    console.log('[DoctorRegistrationService] 👨‍⚕️ Creating doctor record...');
    console.log('[DoctorRegistrationService] Reference:', formData.systemReferenceNumber);

    const payload: DoctorRecord = {
      referenceNumber: formData.systemReferenceNumber
    };

    console.log('[DoctorRegistrationService] Payload:', payload);

    return this.apiService.post<DoctorRegistrationResponse>('/doctors', payload).pipe(
      tap((response: any) => {
        console.log('[DoctorRegistrationService] Response:', response);
        // Backend returns DoctorDTO directly, not wrapped in success/message
        const r = response as any;
        if (r && r.id) {
          console.log('[DoctorRegistrationService] ✅ Doctor record created successfully');
          console.log('[DoctorRegistrationService] Doctor ID:', r.id);
          // Transform to expected response format for orchestrator
          r.success = true;
          r.message = 'Doctor record created';
          r.data = {
            id: r.id,
            referenceNumber: r.referenceNumber,
            createdAt: r.createdAt
          };
        } else {
          console.error('[DoctorRegistrationService] ❌ Failed to create doctor record');
          console.error('[DoctorRegistrationService] Response:', response);
        }
      })
    );
  }
}
