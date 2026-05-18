import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface Allergy {
  id: number;
  patientId: number;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
  dateIdentified: string;
  status?: 'active' | 'resolved' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface AllergyListResponse {
  content: Allergy[];
  totalElements: number;
  totalPages: number;
  pageable: any;
}

@Injectable({
  providedIn: 'root'
})
export class AllergyService {

  constructor(private apiService: ApiService) {}

  // Get all allergies for a patient
  getAllergiesByPatient(patientId: number, page: number = 0, size: number = 100): Observable<AllergyListResponse> {
    console.log('[AllergyService] Fetching allergies for patient:', patientId);
    return this.apiService.get<AllergyListResponse>(`/allergies/patient/${patientId}/paginated`, {
      page,
      size,
      sortBy: 'identifiedDate',
      direction: 'DESC'
    });
  }

  // Get all allergies for patient (non-paginated)
  getAllergiesForCurrentPatient(patientId: number): Observable<Allergy[]> {
    console.log('[AllergyService] Fetching all allergies for current patient:', patientId);
    return this.apiService.get<Allergy[]>(`/allergies/patient/${patientId}`);
  }

  // Get single allergy by ID
  getAllergyById(id: number): Observable<Allergy> {
    return this.apiService.get<Allergy>(`/allergies/${id}`);
  }

  // Create new allergy
  createAllergy(allergy: any): Observable<Allergy> {
    console.log('[AllergyService] Creating new allergy:', allergy);
    return this.apiService.post<Allergy>('/allergies', allergy);
  }

  // Update allergy
  updateAllergy(id: number, allergy: any): Observable<Allergy> {
    console.log('[AllergyService] Updating allergy:', id);
    return this.apiService.put<Allergy>(`/allergies/${id}`, allergy);
  }

  // Delete allergy
  deleteAllergy(id: number): Observable<any> {
    console.log('[AllergyService] Deleting allergy:', id);
    return this.apiService.delete(`/allergies/${id}`);
  }

  // Resolve allergy
  resolveAllergy(id: number): Observable<Allergy> {
    console.log('[AllergyService] Resolving allergy:', id);
    return this.apiService.put<Allergy>(`/allergies/${id}/resolve`, {});
  }

  // Archive allergy
  archiveAllergy(id: number): Observable<Allergy> {
    console.log('[AllergyService] Archiving allergy:', id);
    return this.apiService.put<Allergy>(`/allergies/${id}/archive`, {});
  }
}
