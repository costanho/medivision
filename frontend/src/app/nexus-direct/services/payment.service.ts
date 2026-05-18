import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface Payment {
  id: number;
  patientId: number;
  invoiceId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  transactionReference: string;
  refunded: boolean;
  refundAmount?: number;
  refundStatus?: string;
  disputed: boolean;
  disputeStatus?: string;
  reconciled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  patientId: number;
  invoiceId?: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionReference: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private apiService: ApiService) {}

  // Get all payments for current user
  getPayments(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>('/payments', { page, size });
  }

  // Get payment by ID
  getPaymentById(id: number): Observable<Payment> {
    return this.apiService.get<Payment>(`/payments/${id}`);
  }

  // Create new payment
  createPayment(paymentData: PaymentRequest): Observable<Payment> {
    return this.apiService.post<Payment>('/payments', paymentData);
  }

  // Process payment
  processPayment(id: number): Observable<Payment> {
    return this.apiService.put<Payment>(`/payments/${id}/process`, {});
  }

  // Complete payment
  completePayment(id: number): Observable<Payment> {
    return this.apiService.put<Payment>(`/payments/${id}/complete`, {});
  }

  // Get failed payments
  getFailedPayments(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>('/payments/failed', { page, size });
  }

  // Get pending payments
  getPendingPayments(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>('/payments/pending', { page, size });
  }

  // Get payments by status
  getPaymentsByStatus(status: string, page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>(`/payments/status/${status}`, { page, size });
  }

  // Get payments by date range
  getPaymentsByDateRange(startDate: string, endDate: string, page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get<any>('/payments/date-range', { start: startDate, end: endDate, page, size });
  }

  // Get payment analytics
  getTotalPayments(): Observable<any> {
    return this.apiService.get<any>('/payments/analytics/total');
  }

  getSuccessfulPaymentCount(): Observable<any> {
    return this.apiService.get<any>('/payments/analytics/successful-count');
  }

  getFailedPaymentCount(): Observable<any> {
    return this.apiService.get<any>('/payments/analytics/failed-count');
  }
}
