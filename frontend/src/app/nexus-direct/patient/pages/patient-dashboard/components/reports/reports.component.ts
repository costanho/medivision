import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PatientReport {
  id: number;
  title: string;
  type: 'medical' | 'appointment' | 'billing' | 'health_summary';
  generatedDate: string;
  period: string;
  description: string;
  fileUrl?: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ReportsComponent implements OnInit, OnDestroy {
  // Report sections
  activeSection: string = 'health_summary';
  loading = false;
  error = '';
  success = '';

  // Filters
  selectedReportType = 'all';
  dateRangeStart = '';
  dateRangeEnd = '';

  // Sample reports data
  reports: PatientReport[] = [
    {
      id: 1,
      title: 'Health Summary Report - December 2024',
      type: 'health_summary',
      generatedDate: 'Dec 20, 2024',
      period: 'December 2024',
      description: 'Comprehensive health summary including vital signs, medications, and recent appointments',
      fileUrl: '#'
    },
    {
      id: 2,
      title: 'Appointment Report - Q4 2024',
      type: 'appointment',
      generatedDate: 'Dec 15, 2024',
      period: 'October - December 2024',
      description: 'Complete record of all appointments attended and upcoming appointments',
      fileUrl: '#'
    },
    {
      id: 3,
      title: 'Medical History Report',
      type: 'medical',
      generatedDate: 'Nov 30, 2024',
      period: 'All-time',
      description: 'Detailed medical history including diagnoses, treatments, and procedures',
      fileUrl: '#'
    },
    {
      id: 4,
      title: 'Billing Summary Report - 2024',
      type: 'billing',
      generatedDate: 'Dec 1, 2024',
      period: 'January - December 2024',
      description: 'Annual billing summary with payment history and outstanding balances',
      fileUrl: '#'
    }
  ];

  // Health metrics
  healthMetrics = {
    avgBloodPressure: '120/80',
    avgHeartRate: '72 bpm',
    lastCheckup: 'Nov 15, 2024',
    appointmentsCompleted: 12,
    appointmentsScheduled: 3,
    outstandingBills: 2
  };

  // Appointment insights
  appointmentStats = {
    totalAppointments: 15,
    onTimePercentage: 87,
    cancelledAppointments: 2,
    rescheduledAppointments: 1,
    averageWaitTime: '12 mins'
  };

  // Billing insights
  billingStats = {
    totalBilled: 4500,
    totalPaid: 4200,
    outstanding: 300,
    onTimePaymentRate: 95
  };

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    console.log('[ReportsComponent] Initialized');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectSection(section: string): void {
    this.activeSection = section;
    this.error = '';
    this.success = '';
  }

  downloadReport(reportId: number): void {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      this.success = `Downloading ${report.title}...`;
      console.log('Downloading report:', report);
      setTimeout(() => { this.success = ''; }, 3000);
    }
  }

  printReport(reportId: number): void {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      this.success = `Printing ${report.title}...`;
      console.log('Printing report:', report);
      setTimeout(() => { this.success = ''; }, 3000);
    }
  }

  generateNewReport(type: string): void {
    this.loading = true;
    setTimeout(() => {
      this.success = `${type} report generated successfully!`;
      this.loading = false;
      setTimeout(() => { this.success = ''; }, 3000);
    }, 1500);
  }

  filterReportsByType(type: string): void {
    this.selectedReportType = type;
    console.log('Filtering reports by type:', type);
  }

  getReportIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'health_summary': 'fas fa-heart-pulse',
      'appointment': 'fas fa-calendar-check',
      'medical': 'fas fa-file-medical',
      'billing': 'fas fa-receipt'
    };
    return iconMap[type] || 'fas fa-file';
  }

  getReportTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'health_summary': 'Health Summary',
      'appointment': 'Appointment',
      'medical': 'Medical',
      'billing': 'Billing'
    };
    return labels[type] || 'Report';
  }

  getFilteredReports(): PatientReport[] {
    if (this.selectedReportType === 'all') {
      return this.reports;
    }
    return this.reports.filter(r => r.type === this.selectedReportType);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}
