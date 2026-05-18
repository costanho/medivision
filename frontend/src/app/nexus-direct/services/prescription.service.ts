import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface Prescription {
  id: number;
  patientId: number;
  patientName?: string;
  patientEmail?: string;
  medicationName?: string;
  medication?: string;
  strength?: string;
  dosageAmount?: number;
  dosage?: string;
  frequency: string;
  route?: string;
  quantity?: number;
  unit?: string;
  days?: number;
  durationDays?: number;
  prescribedBy?: string;
  doctorName?: string;
  prescribedById?: number;
  doctorId?: number;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'active' | 'COMPLETED' | 'completed' | 'DISCONTINUED' | 'discontinued';
  notes?: string;
  additionalNotes?: string;
  userEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  issuedAt?: string;
}

export interface PrescriptionListResponse {
  content: Prescription[];
  totalElements: number;
  totalPages: number;
  pageable: any;
}

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {

  constructor(private apiService: ApiService) {}

  // Get all prescriptions for a patient (paginated)
  getPrescriptionsByPatient(patientId: number, page: number = 0, size: number = 100): Observable<PrescriptionListResponse> {
    console.log('[PrescriptionService] Fetching prescriptions for patient:', patientId);
    return this.apiService.get<PrescriptionListResponse>(`/prescriptions/filter/by-patient/${patientId}`, {
      page,
      size
    });
  }

  // Get all prescriptions for patient (non-paginated)
  getPrescriptionsForCurrentPatient(patientId: number): Observable<Prescription[]> {
    console.log('[PrescriptionService] Fetching all prescriptions for current patient:', patientId);
    return this.apiService.get<Prescription[]>(`/prescriptions/filter/by-patient/${patientId}`);
  }

  // Get single prescription by ID
  getPrescriptionById(id: number): Observable<Prescription> {
    console.log('[PrescriptionService] Fetching prescription by ID:', id);
    return this.apiService.get<Prescription>(`/prescriptions/${id}`);
  }

  // Create new prescription
  createPrescription(prescription: any): Observable<Prescription> {
    console.log('[PrescriptionService] Creating new prescription:', prescription);
    return this.apiService.post<Prescription>('/prescriptions', prescription);
  }

  // Update prescription
  updatePrescription(id: number, prescription: any): Observable<Prescription> {
    console.log('[PrescriptionService] Updating prescription:', id);
    return this.apiService.put<Prescription>(`/prescriptions/${id}`, prescription);
  }

  // Delete prescription
  deletePrescription(id: number): Observable<any> {
    console.log('[PrescriptionService] Deleting prescription:', id);
    return this.apiService.delete(`/prescriptions/${id}`);
  }

  // Complete prescription
  completePrescription(id: number): Observable<Prescription> {
    console.log('[PrescriptionService] Completing prescription:', id);
    return this.apiService.put<Prescription>(`/prescriptions/${id}/complete`, {});
  }

  // Discontinue prescription
  discontinuePrescription(id: number, reason?: string): Observable<Prescription> {
    console.log('[PrescriptionService] Discontinuing prescription:', id);
    return this.apiService.put<Prescription>(`/prescriptions/${id}/discontinue`, { reason });
  }
}
