import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaymentService, Payment } from '../../../../../services/payment.service';
import { BillService, Bill } from '../../../../../services/bill.service';

interface BillingStats {
  totalBilled: number;
  totalPaid: number;
  totalOverdue: number;
  pendingPayments: number;
}

type TabType = 'overview' | 'payments' | 'bills' | 'analytics';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BillingComponent implements OnInit, OnDestroy {
  // Expose Math for template calculations
  Math = Math;

  activeTab: TabType = 'overview';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Data
  payments: Payment[] = [];
  bills: Bill[] = [];
  billingStats: BillingStats = {
    totalBilled: 0,
    totalPaid: 0,
    totalOverdue: 0,
    pendingPayments: 0
  };

  // Pagination
  paymentPage = 0;
  billPage = 0;
  pageSize = 10;
  totalPayments = 0;
  totalBills = 0;

  // Filter and Sort
  paymentStatusFilter = '';
  paymentMethodFilter = '';
  billStatusFilter = '';
  dateRangeStart = '';
  dateRangeEnd = '';

  private destroy$ = new Subject<void>();

  constructor(
    private paymentService: PaymentService,
    private billService: BillService
  ) {}

  ngOnInit(): void {
    this.loadBillingData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBillingData(): void {
    this.isLoading = true;
    this.loadPayments();
    this.loadBills();
    this.loadBillingStats();
  }

  loadPayments(): void {
    this.paymentService.getPayments(this.paymentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.payments = data.content || [];
          this.totalPayments = data.totalElements || 0;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load payments';
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  loadBills(): void {
    this.billService.getBills(this.billPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.bills = data.content || [];
          this.totalBills = data.totalElements || 0;
        },
        error: (err) => {
          console.error('Failed to load bills', err);
        }
      });
  }

  loadBillingStats(): void {
    Promise.all([
      this.paymentService.getTotalPayments().toPromise(),
      this.billService.getTotalPending().toPromise(),
      this.billService.getTotalOverdue().toPromise()
    ]).then(([totalPayments, totalPending, totalOverdue]) => {
      this.billingStats = {
        totalBilled: this.calculateTotalBilled(),
        totalPaid: totalPayments?.content?.[0]?.amount || 0,
        totalOverdue: totalOverdue?.content?.[0]?.amount || 0,
        pendingPayments: totalPending?.content?.[0]?.amount || 0
      };
    }).catch(err => {
      console.error('Failed to load billing stats', err);
    });
  }

  calculateTotalBilled(): number {
    return this.bills.reduce((sum, bill) => sum + bill.netAmount, 0);
  }

  // Payment Methods
  processPayment(paymentId: number): void {
    this.isLoading = true;
    this.paymentService.processPayment(paymentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Payment processing started';
          this.loadPayments();
          this.loadBillingStats();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err) => {
          this.errorMessage = 'Failed to process payment';
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  completePayment(paymentId: number): void {
    this.isLoading = true;
    this.paymentService.completePayment(paymentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Payment completed successfully';
          this.loadPayments();
          this.loadBillingStats();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err) => {
          this.errorMessage = 'Failed to complete payment';
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  // Bill Methods
  viewBillDetails(billId: number): void {
    console.log('View bill details for:', billId);
    // Navigate to bill detail page
  }

  downloadBillPDF(billId: number): void {
    console.log('Download bill PDF:', billId);
    // Implement PDF download
  }

  markBillPaid(billId: number): void {
    console.log('Mark bill as paid:', billId);
    // Implement mark as paid functionality
  }

  // Filter Methods
  filterPaymentsByStatus(status: string): void {
    this.paymentStatusFilter = status;
    this.paymentPage = 0;
    if (status) {
      this.paymentService.getPaymentsByStatus(status, this.paymentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.payments = data.content || [];
            this.totalPayments = data.totalElements || 0;
          },
          error: (err) => {
            this.errorMessage = 'Failed to filter payments';
            console.error(err);
          }
        });
    } else {
      this.loadPayments();
    }
  }

  filterBillsByStatus(status: string): void {
    this.billStatusFilter = status;
    this.billPage = 0;
    if (status) {
      this.billService.getBillsByStatus(status, this.billPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.bills = data.content || [];
            this.totalBills = data.totalElements || 0;
          },
          error: (err) => {
            this.errorMessage = 'Failed to filter bills';
            console.error(err);
          }
        });
    } else {
      this.loadBills();
    }
  }

  // Pagination Methods
  nextPaymentPage(): void {
    if ((this.paymentPage + 1) * this.pageSize < this.totalPayments) {
      this.paymentPage++;
      this.loadPayments();
    }
  }

  prevPaymentPage(): void {
    if (this.paymentPage > 0) {
      this.paymentPage--;
      this.loadPayments();
    }
  }

  nextBillPage(): void {
    if ((this.billPage + 1) * this.pageSize < this.totalBills) {
      this.billPage++;
      this.loadBills();
    }
  }

  prevBillPage(): void {
    if (this.billPage > 0) {
      this.billPage--;
      this.loadBills();
    }
  }

  // Utility Methods
  getPaymentStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'status-pending',
      'PROCESSING': 'status-processing',
      'COMPLETED': 'status-completed',
      'FAILED': 'status-failed',
      'CANCELLED': 'status-cancelled'
    };
    return statusMap[status] || 'status-pending';
  }

  getBillStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'DRAFT': 'status-draft',
      'ISSUED': 'status-issued',
      'PARTIALLY_PAID': 'status-partial',
      'PAID': 'status-paid',
      'OVERDUE': 'status-overdue',
      'WRITTEN_OFF': 'status-written-off'
    };
    return statusMap[status] || 'status-draft';
  }

  getPaymentStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      'PENDING': '⏳',
      'PROCESSING': '🔄',
      'COMPLETED': '✅',
      'FAILED': '❌',
      'CANCELLED': '⛔'
    };
    return iconMap[status] || '❓';
  }

  getBillStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      'DRAFT': '📝',
      'ISSUED': '📤',
      'PARTIALLY_PAID': '💰',
      'PAID': '✅',
      'OVERDUE': '⚠️',
      'WRITTEN_OFF': '🗑️'
    };
    return iconMap[status] || '📋';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
