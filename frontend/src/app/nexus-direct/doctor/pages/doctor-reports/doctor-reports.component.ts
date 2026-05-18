import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Report {
  id: string;
  patientName: string;
  patientEmail: string;
  reportType: 'consultation' | 'appointment' | 'diagnosis' | 'treatment';
  date: string;
  status: 'draft' | 'submitted' | 'approved' | 'archived';
  title: string;
  content: string;
  findings: string;
  recommendations: string;
}

interface ReportStats {
  totalReports: number;
  draftReports: number;
  submittedReports: number;
  approvedReports: number;
}

@Component({
  selector: 'app-doctor-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-reports.component.html',
  styleUrls: ['./doctor-reports.component.scss']
})
export class DoctorReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  Math = Math;

  reports: Report[] = [];
  stats: ReportStats = {
    totalReports: 0,
    draftReports: 0,
    submittedReports: 0,
    approvedReports: 0
  };

  loading = true;
  error = '';
  successMessage = '';
  filterStatus: 'all' | 'draft' | 'submitted' | 'approved' | 'archived' = 'all';
  filterType: 'all' | 'consultation' | 'appointment' | 'diagnosis' | 'treatment' = 'all';
  selectedReport: Report | null = null;
  showDetailModal = false;
  showCreateModal = false;
  editingReport: Report | null = null;

  // Form fields
  newReportTitle = '';
  newReportType: 'consultation' | 'appointment' | 'diagnosis' | 'treatment' = 'consultation';
  newReportPatient = '';
  newReportFindings = '';
  newReportRecommendations = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  constructor() {}

  ngOnInit(): void {
    console.log('[DoctorReports] Component initialized');
    this.loadReports();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadReports(): void {
    this.loading = true;
    console.log('[DoctorReports] Loading reports...');

    // Mock data - replace with actual API call
    const mockReports: Report[] = [
      {
        id: '1',
        patientName: 'Sarah Johnson',
        patientEmail: 'sarah.johnson@example.com',
        reportType: 'consultation',
        date: '2026-01-10',
        status: 'approved',
        title: 'Cardiac Consultation Report',
        content: 'Patient presented with symptoms of chest discomfort and shortness of breath.',
        findings: 'ECG shows normal sinus rhythm. Blood pressure elevated at 150/95 mmHg.',
        recommendations: 'Continue current medication. Schedule follow-up in 2 weeks.'
      },
      {
        id: '2',
        patientName: 'Michael Chen',
        patientEmail: 'michael.chen@example.com',
        reportType: 'diagnosis',
        date: '2026-01-09',
        status: 'submitted',
        title: 'Heart Palpitations Diagnosis',
        content: 'Patient reports frequent heart palpitations and anxiety.',
        findings: 'Holter monitor shows occasional PACs. No structural abnormalities.',
        recommendations: 'Consider beta-blocker therapy. Lifestyle modifications recommended.'
      },
      {
        id: '3',
        patientName: 'Emily Rodriguez',
        patientEmail: 'emily.rodriguez@example.com',
        reportType: 'treatment',
        date: '2026-01-08',
        status: 'approved',
        title: 'Hypertension Treatment Plan',
        content: 'Patient diagnosed with Stage 2 hypertension.',
        findings: 'BP readings consistently above 140/90 mmHg over 3 weeks.',
        recommendations: 'Start ACE inhibitor. Reduce sodium intake. Regular exercise 30 mins daily.'
      },
      {
        id: '4',
        patientName: 'James Wilson',
        patientEmail: 'james.wilson@example.com',
        reportType: 'appointment',
        date: '2026-01-07',
        status: 'draft',
        title: 'Follow-up Appointment Notes',
        content: 'Patient reviewed progress on current treatment plan.',
        findings: 'Improved symptoms noted. Patient compliant with medications.',
        recommendations: 'Continue current regimen. Next appointment in 1 month.'
      },
      {
        id: '5',
        patientName: 'Lisa Anderson',
        patientEmail: 'lisa.anderson@example.com',
        reportType: 'consultation',
        date: '2026-01-06',
        status: 'approved',
        title: 'Pre-operative Consultation',
        content: 'Patient evaluated for cardiac surgery candidacy.',
        findings: 'Patient stable for surgery. All pre-op tests completed.',
        recommendations: 'Proceed with scheduled surgery. Standard post-op care protocol.'
      },
      {
        id: '6',
        patientName: 'David Brown',
        patientEmail: 'david.brown@example.com',
        reportType: 'diagnosis',
        date: '2026-01-05',
        status: 'submitted',
        title: 'Arrhythmia Diagnosis Report',
        content: 'Patient with irregular heartbeat pattern.',
        findings: 'EKG confirms atrial fibrillation. HR 110 bpm. No acute symptoms.',
        recommendations: 'Anticoagulation therapy. Cardiology referral recommended.'
      },
      {
        id: '7',
        patientName: 'Jennifer Martinez',
        patientEmail: 'jennifer.martinez@example.com',
        reportType: 'treatment',
        date: '2026-01-04',
        status: 'draft',
        title: 'Medication Adjustment Plan',
        content: 'Review and adjustment of current cardiac medications.',
        findings: 'Side effects reported with current beta-blocker.',
        recommendations: 'Switch to alternative beta-blocker. Monitor for 2 weeks.'
      },
      {
        id: '8',
        patientName: 'Robert Taylor',
        patientEmail: 'robert.taylor@example.com',
        reportType: 'appointment',
        date: '2026-01-03',
        status: 'approved',
        title: 'Post-operative Follow-up',
        content: 'Post-operative assessment after cardiac intervention.',
        findings: 'Healing progressing well. Incision clean and dry.',
        recommendations: 'Continue rehabilitation. Pain management as needed.'
      }
    ];

    setTimeout(() => {
      this.reports = mockReports;
      this.totalItems = mockReports.length;
      this.loading = false;
      this.error = '';
      console.log('[DoctorReports] Reports loaded:', this.reports.length);
    }, 800);
  }

  private loadStats(): void {
    console.log('[DoctorReports] Loading statistics...');

    setTimeout(() => {
      this.stats = {
        totalReports: this.reports.length,
        draftReports: this.reports.filter(r => r.status === 'draft').length,
        submittedReports: this.reports.filter(r => r.status === 'submitted').length,
        approvedReports: this.reports.filter(r => r.status === 'approved').length
      };
      console.log('[DoctorReports] Stats loaded:', this.stats);
    }, 800);
  }

  getFilteredReports(): Report[] {
    return this.reports.filter(report => {
      const statusMatch = this.filterStatus === 'all' || report.status === this.filterStatus;
      const typeMatch = this.filterType === 'all' || report.reportType === this.filterType;
      return statusMatch && typeMatch;
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'submitted':
        return 'status-submitted';
      case 'draft':
        return 'status-draft';
      case 'archived':
        return 'status-archived';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'approved':
        return 'fas fa-check-circle';
      case 'submitted':
        return 'fas fa-paper-plane';
      case 'draft':
        return 'fas fa-file-alt';
      case 'archived':
        return 'fas fa-archive';
      default:
        return 'fas fa-circle';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'consultation':
        return 'fas fa-stethoscope';
      case 'appointment':
        return 'fas fa-calendar-check';
      case 'diagnosis':
        return 'fas fa-diagnoses';
      case 'treatment':
        return 'fas fa-pills';
      default:
        return 'fas fa-file-alt';
    }
  }

  openReportDetail(report: Report): void {
    this.selectedReport = report;
    this.showDetailModal = true;
    console.log('[DoctorReports] Opening detail modal for:', report.id);
  }

  closeReportDetail(): void {
    this.showDetailModal = false;
    this.selectedReport = null;
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.resetForm();
    console.log('[DoctorReports] Opening create modal');
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.newReportTitle = '';
    this.newReportType = 'consultation';
    this.newReportPatient = '';
    this.newReportFindings = '';
    this.newReportRecommendations = '';
  }

  createReport(): void {
    if (!this.newReportTitle || !this.newReportPatient || !this.newReportFindings) {
      this.error = 'Please fill in all required fields';
      return;
    }

    const newReport: Report = {
      id: (this.reports.length + 1).toString(),
      patientName: this.newReportPatient,
      patientEmail: 'patient@example.com',
      reportType: this.newReportType,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      title: this.newReportTitle,
      content: `${this.newReportType.charAt(0).toUpperCase() + this.newReportType.slice(1)} report`,
      findings: this.newReportFindings,
      recommendations: this.newReportRecommendations
    };

    this.reports.unshift(newReport);
    this.totalItems = this.reports.length;
    this.successMessage = 'Report created successfully!';
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
    this.closeCreateModal();
    this.loadStats();
    console.log('[DoctorReports] Report created:', newReport.id);
  }

  editReport(report: Report): void {
    this.editingReport = report;
    this.newReportTitle = report.title;
    this.newReportType = report.reportType;
    this.newReportPatient = report.patientName;
    this.newReportFindings = report.findings;
    this.newReportRecommendations = report.recommendations;
    this.showCreateModal = true;
  }

  saveReport(): void {
    if (this.editingReport) {
      this.editingReport.title = this.newReportTitle;
      this.editingReport.reportType = this.newReportType;
      this.editingReport.findings = this.newReportFindings;
      this.editingReport.recommendations = this.newReportRecommendations;
      this.successMessage = 'Report updated successfully!';
      this.editingReport = null;
    } else {
      this.createReport();
    }
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  submitReport(reportId: string): void {
    const report = this.reports.find(r => r.id === reportId);
    if (report && report.status === 'draft') {
      report.status = 'submitted';
      this.successMessage = 'Report submitted successfully!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      this.closeReportDetail();
      this.loadStats();
      console.log('[DoctorReports] Report submitted:', reportId);
    }
  }

  approveReport(reportId: string): void {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      report.status = 'approved';
      this.successMessage = 'Report approved!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      this.closeReportDetail();
      this.loadStats();
      console.log('[DoctorReports] Report approved:', reportId);
    }
  }

  archiveReport(reportId: string): void {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      report.status = 'archived';
      this.successMessage = 'Report archived!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      this.closeReportDetail();
      this.loadStats();
      console.log('[DoctorReports] Report archived:', reportId);
    }
  }

  downloadReport(report: Report): void {
    const content = `
MEDICAL REPORT
==============
Patient: ${report.patientName}
Type: ${report.reportType}
Date: ${report.date}
Status: ${report.status}

Title: ${report.title}

Content:
${report.content}

Findings:
${report.findings}

Recommendations:
${report.recommendations}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.title.replace(/\s+/g, '_')}_${report.date}.txt`;
    link.click();
    console.log('[DoctorReports] Report downloaded:', report.id);
  }

  getNextPage(): void {
    if (this.currentPage * this.pageSize < this.totalItems) {
      this.currentPage++;
      console.log('[DoctorReports] Moving to page:', this.currentPage);
    }
  }

  getPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      console.log('[DoctorReports] Moving to page:', this.currentPage);
    }
  }

  clearError(): void {
    this.error = '';
  }
}
