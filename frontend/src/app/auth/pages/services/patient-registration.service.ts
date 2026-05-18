import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

/**
 * PATIENT REGISTRATION SERVICE
 *
 * Handles patient-specific registration logic.
 * Only executes if user role is PATIENT.
 *
 * Tables affected:
 * - patient (direct database)
 *
 * Fields inserted (matching database schema):
 * - referenceNumber (links to auth_user table and user_information)
 * - name (firstName + surname combined)
 * - userEmail (for multi-tenancy filtering and access control)
 *
 * This creates the patient role record in the patient table,
 * allowing the system to identify and manage patient-specific features.
 *
 * Note: Patient table has minimal fields for registration.
 * Extended patient information (DOB, gender, medical history, etc.)
 * is stored in the user_information table instead.
 */

export interface PatientRecord {
  referenceNumber: string;
}

export interface PatientRegistrationResponse {
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
export class PatientRegistrationService {
  constructor(private apiService: ApiService) {
    console.log('[PatientRegistrationService] ✅ Service initialized');
  }

  /**
   * Create patient record
   *
   * This is called ONLY if user selected PATIENT role.
   * Must be called AFTER auth user and user_information are created.
   *
   * Creates a minimal patient role record in the patient table.
   * Extended information (DOB, gender, medical data) is stored in user_information.
   *
   * Payload sent to backend:
   * - referenceNumber: Generated reference number for linking across databases
   * - name: Combined firstName + surname
   * - userEmail: User's email for multi-tenancy enforcement
   *
   * @param formData - Complete registration form data
   * @returns Observable with response from direct database
   */
  createPatientRecord(formData: any): Observable<PatientRegistrationResponse> {
    console.log('[PatientRegistrationService] 👤 Creating patient record...');
    console.log('[PatientRegistrationService] Reference:', formData.systemReferenceNumber);

    const payload: PatientRecord = {
      referenceNumber: formData.systemReferenceNumber
    };

    console.log('[PatientRegistrationService] Payload:', payload);

    return this.apiService.post<PatientRegistrationResponse>('/patients', payload).pipe(
      tap((response: any) => {
        console.log('[PatientRegistrationService] Response:', response);
        // Backend returns PatientDTO directly, not wrapped in success/message
        const r = response as any;
        if (r && r.id) {
          console.log('[PatientRegistrationService] ✅ Patient record created successfully');
          console.log('[PatientRegistrationService] Patient ID:', r.id);
          // Transform to expected response format for orchestrator
          r.success = true;
          r.message = 'Patient record created';
          r.data = {
            id: r.id,
            referenceNumber: r.referenceNumber,
            createdAt: r.createdAt
          };
        } else {
          console.error('[PatientRegistrationService] ❌ Failed to create patient record');
          console.error('[PatientRegistrationService] Response:', response);
        }
      })
    );
  }
}
