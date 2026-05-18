import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface LabResult {
  id?: number;
  userEmail?: string;
  patientId?: number;
  patientName?: string;
  patientMRN?: string;
  patientDOB?: string;
  doctorId?: number;
  doctorName?: string;
  doctorNPI?: string;
  resultCode?: string;
  resultName?: string;
  resultValue?: string | number;
  resultUnit?: string;
  resultType?: string;
  resultDateTime?: string;
  referenceRange?: string;
  normalLow?: string | number;
  normalHigh?: string | number;
  abnormalFlag?: string;
  isAbnormal?: boolean;
  isCritical?: boolean;
  resultStatus?: string;
  interpretation?: string;
  comments?: string;
  specimenId?: string;
  specimenCollectionDate?: string;
  specimenReceivedDate?: string;
  specimenType?: string;
  labName?: string;
  labCode?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface LabResultListResponse {
  content: LabResult[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: any;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LabResultsService {
  constructor(private apiService: ApiService) {}

  getAllLabResults(page: number = 0, size: number = 100): Observable<LabResultListResponse> {
    return this.apiService.get<LabResultListResponse>(`/lab-results`, {
      page,
      size
    });
  }

  getLabResultsByPatient(patientId: number, page: number = 0, size: number = 100): Observable<LabResultListResponse> {
    return this.apiService.get<LabResultListResponse>(`/lab-results/filter/by-patient/${patientId}`, {
      page,
      size
    });
  }

  getLabResultById(id: number): Observable<LabResult> {
    return this.apiService.get<LabResult>(`/lab-results/${id}`);
  }
}
