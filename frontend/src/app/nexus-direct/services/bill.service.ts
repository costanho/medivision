import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface Bill {
  id: number;
  patientId: number;
  billNumber: string;
  billDate: string;
  dueDate: string;
  billingPeriod: string;
  totalCharges: number;
  discounts: number;
  netAmount: number;
  paymentStatus: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WRITTEN_OFF';
  currentAmount: number;
  thirtyDaysOverdue: number;
  sixtyDaysOverdue: number;
  ninetyDaysOverdue: number;
  oneHundredTwentyPlusOverdue: number;
  totalOverdue: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillRequest {
  patientId: number;
  billNumber: string;
  billDate: string;
  dueDate: string;
  billingPeriod: string;
  totalCharges: number;
  discounts: number;
  netAmount: number;
}

export interface BillingAnalytics {
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class BillService {
  constructor(private apiService: ApiService) {}

  // Get all bills for current user
  getBills(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>('/bills', { page, size });
  }

  // Get bill by ID
  getBillById(id: number): Observable<Bill> {
    return this.apiService.get<Bill>(`/bills/${id}`);
  }

  // Create new bill
  createBill(billData: BillRequest): Observable<Bill> {
    return this.apiService.post<Bill>('/bills', billData);
  }

  // Update bill
  updateBill(id: number, billData: Partial<BillRequest>): Observable<Bill> {
    return this.apiService.put<Bill>(`/bills/${id}`, billData);
  }

  // Get bills for patient
  getBillsForPatient(patientId: number, page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>(`/bills/patient/${patientId}`, { page, size });
  }

  // Mark payment on bill
  markPayment(id: number, paymentData: any): Observable<Bill> {
    return this.apiService.put<Bill>(`/bills/${id}/mark-payment`, paymentData);
  }

  // Get overdue bills
  getOverdueBills(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>('/bills/overdue', { page, size });
  }

  // Get bills by status
  getBillsByStatus(status: string, page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>(`/bills/status/${status}`, { page, size });
  }

  // Get bills by due date range
  getBillsByDueDateRange(startDate: string, endDate: string, page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>('/bills/due-date-range', { start: startDate, end: endDate, page, size });
  }

  // Get bills by amount range
  getBillsByAmountRange(minAmount: number, maxAmount: number, page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>('/bills/amount-range', { min: minAmount, max: maxAmount, page, size });
  }

  // Get aging analysis
  getAgingAnalysis(billId: number): Observable<any> {
    return this.apiService.get<any>(`/bills/${billId}/aging`);
  }

  // Get billing analytics
  getTotalPending(): Observable<any> {
    return this.apiService.get<any>('/bills/analytics/total-pending');
  }

  getTotalOverdue(): Observable<any> {
    return this.apiService.get<any>('/bills/analytics/total-overdue');
  }

  getCollectionRate(): Observable<any> {
    return this.apiService.get<any>('/bills/analytics/collection-rate');
  }

  // Get all analytics at once
  getAnalytics(): Observable<BillingAnalytics> {
    return this.apiService.get<BillingAnalytics>('/bills/analytics');
  }
}
