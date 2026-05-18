import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface MedicalCondition {
  id: number;
  patientId: number;
  conditionName: string;
  description?: string;
  diagnosedDate: string;
  status: 'active' | 'resolved' | 'archived';
  severity?: string;
  notes?: string;
  doctorName?: string;
  doctorEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalConditionListResponse {
  content: MedicalCondition[];
  totalElements: number;
  totalPages: number;
  pageable: any;
}

@Injectable({
  providedIn: 'root'
})
export class MedicalConditionService {

  constructor(private apiService: ApiService) {}

  // Get all medical conditions for a patient
  getConditionsByPatient(patientId: number, page: number = 0, size: number = 100): Observable<MedicalConditionListResponse> {
    console.log('[MedicalConditionService] Fetching conditions for patient:', patientId);
    return this.apiService.get<MedicalConditionListResponse>(`/medical-conditions/patient/${patientId}`, {
      page,
      size,
      sortBy: 'createdAt',
      direction: 'DESC'
    });
  }

  // Get all conditions for authenticated patient (non-paginated)
  getConditionsForCurrentPatient(patientId: number): Observable<MedicalCondition[]> {
    console.log('[MedicalConditionService] Fetching all conditions for current patient:', patientId);
    return this.apiService.get<MedicalCondition[]>(`/medical-conditions/patient/${patientId}`);
  }

  // Get single condition by ID
  getConditionById(id: number): Observable<MedicalCondition> {
    return this.apiService.get<MedicalCondition>(`/medical-conditions/${id}`);
  }

  // Create new medical condition
  createCondition(condition: any): Observable<MedicalCondition> {
    console.log('[MedicalConditionService] Creating new condition:', condition);
    return this.apiService.post<MedicalCondition>('/medical-conditions', condition);
  }

  // Update medical condition
  updateCondition(id: number, condition: any): Observable<MedicalCondition> {
    console.log('[MedicalConditionService] Updating condition:', id);
    return this.apiService.put<MedicalCondition>(`/medical-conditions/${id}`, condition);
  }

  // Delete medical condition
  deleteCondition(id: number): Observable<any> {
    console.log('[MedicalConditionService] Deleting condition:', id);
    return this.apiService.delete(`/medical-conditions/${id}`);
  }

  // Resolve medical condition
  resolveCondition(id: number): Observable<MedicalCondition> {
    console.log('[MedicalConditionService] Resolving condition:', id);
    return this.apiService.put<MedicalCondition>(`/medical-conditions/${id}/resolve`, {});
  }

  // Archive medical condition
  archiveCondition(id: number): Observable<MedicalCondition> {
    console.log('[MedicalConditionService] Archiving condition:', id);
    return this.apiService.put<MedicalCondition>(`/medical-conditions/${id}/archive`, {});
  }

  // Add comments to condition
  addComments(id: number, comments: string): Observable<MedicalCondition> {
    console.log('[MedicalConditionService] Adding comments to condition:', id);
    return this.apiService.put<MedicalCondition>(`/medical-conditions/${id}/add-comments?comments=${encodeURIComponent(comments)}`, {});
  }
}
