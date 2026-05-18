import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillService } from '../../services/bill.service';
import { PaymentService } from '../../services/payment.service';

interface FinancialMetrics {
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  averagePaymentTime: number;
}

interface MonthlyData {
  month: string;
  billed: number;
  paid: number;
  pending: number;
}

type PeriodType = 'monthly' | 'quarterly' | 'yearly';

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-dashboard.component.html',
  styleUrls: ['./financial-dashboard.component.scss']
})
export class FinancialDashboardComponent implements OnInit, OnDestroy {
  Math = Math;

  // Metrics
  metrics: FinancialMetrics = {
    totalBilled: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    collectionRate: 0,
    averagePaymentTime: 0
  };

  // Data
  monthlyData: MonthlyData[] = [];
  allBills: any[] = [];
  paymentsTrend: any[] = [];

  // UI State
  isLoading = false;
  errorMessage = '';
  selectedPeriod: PeriodType = 'monthly';
  dateRangeStart = '';
  dateRangeEnd = '';
  page = 0;
  pageSize = 50;

  private destroy$ = new Subject<void>();

  constructor(
    private billService: BillService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.loadFinancialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFinancialData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load all bills first
    this.billService.getBills(0, 200)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.allBills = data.content || [];
          this.calculateMetrics();
          this.generateMonthlyData();
          this.loadPaymentsTrend();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load financial data';
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  calculateMetrics(): void {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    this.allBills.forEach(bill => {
      totalBilled += bill.totalCharges || 0;

      if (bill.paymentStatus === 'PAID') {
        totalPaid += bill.netAmount || 0;
      } else if (bill.paymentStatus === 'OVERDUE') {
        totalOverdue += bill.currentAmount || 0;
        totalPending += bill.currentAmount || 0;
      } else if (bill.paymentStatus === 'PARTIALLY_PAID') {
        const remaining = (bill.netAmount || 0) - (bill.currentAmount || 0);
        totalPaid += bill.currentAmount || 0;
        totalPending += remaining;
      } else {
        totalPending += bill.netAmount || 0;
      }
    });

    const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

    this.metrics = {
      totalBilled,
      totalPaid,
      totalPending,
      totalOverdue,
      collectionRate,
      averagePaymentTime: this.calculateAveragePaymentTime()
    };
  }

  calculateAveragePaymentTime(): number {
    if (this.allBills.length === 0) return 0;

    let totalDays = 0;
    let paidBills = 0;

    this.allBills.forEach(bill => {
      if (bill.paymentStatus === 'PAID' && bill.billDate && bill.updatedAt) {
        const billDate = new Date(bill.billDate);
        const paidDate = new Date(bill.updatedAt);
        const days = Math.floor((paidDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += days;
        paidBills++;
      }
    });

    return paidBills > 0 ? Math.round(totalDays / paidBills) : 0;
  }

  generateMonthlyData(): void {
    const monthMap = new Map<string, MonthlyData>();

    this.allBills.forEach(bill => {
      const billDate = new Date(bill.billDate);
      const monthKey = billDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthKey, billed: 0, paid: 0, pending: 0 });
      }

      const monthData = monthMap.get(monthKey)!;
      monthData.billed += bill.totalCharges || 0;

      if (bill.paymentStatus === 'PAID') {
        monthData.paid += bill.netAmount || 0;
      } else {
        monthData.pending += bill.currentAmount || 0;
      }
    });

    this.monthlyData = Array.from(monthMap.values()).slice(-12);
  }

  loadPaymentsTrend(): void {
    this.paymentService.getPayments(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.paymentsTrend = (data.content || []).sort((a: any, b: any) =>
            new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
          );
        },
        error: (err) => {
          console.error('Failed to load payments trend', err);
        }
      });
  }

  filterByDateRange(): void {
    if (!this.dateRangeStart || !this.dateRangeEnd) {
      this.errorMessage = 'Please select both start and end dates';
      return;
    }

    this.isLoading = true;
    this.billService.getBillsByDueDateRange(this.dateRangeStart, this.dateRangeEnd, 0, 200)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.allBills = data.content || [];
          this.calculateMetrics();
          this.generateMonthlyData();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load data for selected date range';
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  exportData(format: 'csv' | 'pdf'): void {
    if (format === 'csv') {
      this.exportAsCSV();
    } else {
      this.exportAsPDF();
    }
  }

  exportAsCSV(): void {
    let csv = 'Financial Dashboard Report\n';
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    csv += 'Financial Metrics\n';
    csv += `Total Billed,Total Paid,Total Pending,Total Overdue,Collection Rate,Avg Payment Time\n`;
    csv += `${this.metrics.totalBilled},${this.metrics.totalPaid},${this.metrics.totalPending},${this.metrics.totalOverdue},${this.metrics.collectionRate.toFixed(2)}%,${this.metrics.averagePaymentTime} days\n\n`;

    csv += 'Monthly Breakdown\n';
    csv += 'Month,Billed,Paid,Pending\n';
    this.monthlyData.forEach(month => {
      csv += `${month.month},${month.billed},${month.paid},${month.pending}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  exportAsPDF(): void {
    // Simple text-based PDF export (in production, use a library like pdfkit or jspdf)
    let pdfContent = `
Financial Dashboard Report
Generated: ${new Date().toLocaleString()}

FINANCIAL METRICS
=================
Total Billed: $${this.formatCurrency(this.metrics.totalBilled)}
Total Paid: $${this.formatCurrency(this.metrics.totalPaid)}
Total Pending: $${this.formatCurrency(this.metrics.totalPending)}
Total Overdue: $${this.formatCurrency(this.metrics.totalOverdue)}
Collection Rate: ${this.metrics.collectionRate.toFixed(2)}%
Average Payment Time: ${this.metrics.averagePaymentTime} days

MONTHLY BREAKDOWN
=================`;

    this.monthlyData.forEach(month => {
      const pdfLine = `\n${month.month}
  Billed: $${this.formatCurrency(month.billed)}
  Paid: $${this.formatCurrency(month.paid)}
  Pending: $${this.formatCurrency(month.pending)}`;
      pdfContent += pdfLine;
    });

    alert('PDF Export Feature: ' + pdfContent.substring(0, 100) + '...\n\nFor full PDF export, integrate a PDF library like jsPDF or pdfkit.');
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

  clearFilters(): void {
    this.dateRangeStart = '';
    this.dateRangeEnd = '';
    this.selectedPeriod = 'monthly';
    this.errorMessage = '';
    this.loadFinancialData();
  }

  getOutstandingPercentage(): number {
    const total = this.metrics.totalBilled;
    return total > 0 ? (this.metrics.totalPending / total) * 100 : 0;
  }

  getOverduePercentage(): number {
    const total = this.metrics.totalBilled;
    return total > 0 ? (this.metrics.totalOverdue / total) * 100 : 0;
  }

  getMetricTrendIcon(current: number, previous: number): string {
    if (current > previous) return '📈';
    if (current < previous) return '📉';
    return '➡️';
  }

  getMaxMonthlyBilled(): number {
    if (this.monthlyData.length === 0) return 1;
    return Math.max(...this.monthlyData.map(m => m.billed));
  }
}
