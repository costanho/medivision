import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Consultation {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  type: 'video' | 'voice' | 'text';
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  scheduledTime: string;
  duration: number;
  fee: number;
  notes: string;
  reason: string;
}

interface ConsultationStats {
  totalConsultations: number;
  completedConsultations: number;
  pendingConsultations: number;
  cancelledConsultations: number;
  totalEarnings: number;
}

@Component({
  selector: 'app-doctor-consultations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-consultations.component.html',
  styleUrls: ['./doctor-consultations.component.scss']
})
export class DoctorConsultationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  Math = Math;

  consultations: Consultation[] = [];
  stats: ConsultationStats = {
    totalConsultations: 0,
    completedConsultations: 0,
    pendingConsultations: 0,
    cancelledConsultations: 0,
    totalEarnings: 0
  };

  loading = true;
  error = '';
  successMessage = '';
  filterStatus: 'all' | 'pending' | 'scheduled' | 'completed' | 'cancelled' = 'all';
  filterType: 'all' | 'video' | 'voice' | 'text' = 'all';
  selectedConsultation: Consultation | null = null;
  showDetailModal = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  constructor() {}

  ngOnInit(): void {
    console.log('[DoctorConsultations] Component initialized');
    this.loadConsultations();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadConsultations(): void {
    this.loading = true;
    console.log('[DoctorConsultations] Loading consultations...');

    // Mock data - replace with actual API call
    const mockConsultations: Consultation[] = [
      {
        id: '1',
        patientName: 'Sarah Johnson',
        patientEmail: 'sarah.johnson@example.com',
        patientPhone: '+1 (555) 234-5678',
        type: 'video',
        status: 'completed',
        scheduledTime: '2026-01-10 10:00 AM',
        duration: 30,
        fee: 85,
        notes: 'Follow-up consultation',
        reason: 'Cardiac checkup'
      },
      {
        id: '2',
        patientName: 'Michael Chen',
        patientEmail: 'michael.chen@example.com',
        patientPhone: '+1 (555) 345-6789',
        type: 'video',
        status: 'scheduled',
        scheduledTime: '2026-01-15 02:00 PM',
        duration: 30,
        fee: 85,
        notes: 'Initial consultation',
        reason: 'Heart palpitations'
      },
      {
        id: '3',
        patientName: 'Emily Rodriguez',
        patientEmail: 'emily.rodriguez@example.com',
        patientPhone: '+1 (555) 456-7890',
        type: 'voice',
        status: 'pending',
        scheduledTime: '2026-01-20 11:00 AM',
        duration: 20,
        fee: 65,
        notes: 'Phone consultation',
        reason: 'Blood pressure concerns'
      },
      {
        id: '4',
        patientName: 'James Wilson',
        patientEmail: 'james.wilson@example.com',
        patientPhone: '+1 (555) 567-8901',
        type: 'text',
        status: 'completed',
        scheduledTime: '2026-01-08 03:30 PM',
        duration: 15,
        fee: 45,
        notes: 'Chat consultation',
        reason: 'Medication questions'
      },
      {
        id: '5',
        patientName: 'Lisa Anderson',
        patientEmail: 'lisa.anderson@example.com',
        patientPhone: '+1 (555) 678-9012',
        type: 'video',
        status: 'cancelled',
        scheduledTime: '2026-01-12 09:00 AM',
        duration: 30,
        fee: 85,
        notes: 'Patient requested cancellation',
        reason: 'Routine checkup'
      },
      {
        id: '6',
        patientName: 'David Brown',
        patientEmail: 'david.brown@example.com',
        patientPhone: '+1 (555) 789-0123',
        type: 'video',
        status: 'scheduled',
        scheduledTime: '2026-01-18 04:00 PM',
        duration: 45,
        fee: 125,
        notes: 'Extended consultation',
        reason: 'Comprehensive evaluation'
      },
      {
        id: '7',
        patientName: 'Jennifer Martinez',
        patientEmail: 'jennifer.martinez@example.com',
        patientPhone: '+1 (555) 890-1234',
        type: 'voice',
        status: 'completed',
        scheduledTime: '2026-01-09 01:00 PM',
        duration: 25,
        fee: 75,
        notes: 'Follow-up call',
        reason: 'Post-procedure check'
      },
      {
        id: '8',
        patientName: 'Robert Taylor',
        patientEmail: 'robert.taylor@example.com',
        patientPhone: '+1 (555) 901-2345',
        type: 'text',
        status: 'pending',
        scheduledTime: '2026-01-22 02:30 PM',
        duration: 10,
        fee: 35,
        notes: 'Quick chat',
        reason: 'Prescription refill'
      }
    ];

    setTimeout(() => {
      this.consultations = mockConsultations;
      this.totalItems = mockConsultations.length;
      this.loading = false;
      this.error = '';
      console.log('[DoctorConsultations] Consultations loaded:', this.consultations.length);
    }, 800);
  }

  private loadStats(): void {
    console.log('[DoctorConsultations] Loading statistics...');

    setTimeout(() => {
      this.stats = {
        totalConsultations: this.consultations.length,
        completedConsultations: this.consultations.filter(c => c.status === 'completed').length,
        pendingConsultations: this.consultations.filter(c => c.status === 'pending').length,
        cancelledConsultations: this.consultations.filter(c => c.status === 'cancelled').length,
        totalEarnings: this.consultations.reduce((sum, c) => sum + (c.status === 'completed' ? c.fee : 0), 0)
      };
      console.log('[DoctorConsultations] Stats loaded:', this.stats);
    }, 800);
  }

  getFilteredConsultations(): Consultation[] {
    return this.consultations.filter(consultation => {
      const statusMatch = this.filterStatus === 'all' || consultation.status === this.filterStatus;
      const typeMatch = this.filterType === 'all' || consultation.type === this.filterType;
      return statusMatch && typeMatch;
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'scheduled':
        return 'status-scheduled';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'fas fa-check-circle';
      case 'scheduled':
        return 'fas fa-calendar-check';
      case 'pending':
        return 'fas fa-clock';
      case 'cancelled':
        return 'fas fa-times-circle';
      default:
        return 'fas fa-circle';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'video':
        return 'fas fa-video';
      case 'voice':
        return 'fas fa-phone';
      case 'text':
        return 'fas fa-comments';
      default:
        return 'fas fa-circle';
    }
  }

  openConsultationDetail(consultation: Consultation): void {
    this.selectedConsultation = consultation;
    this.showDetailModal = true;
    console.log('[DoctorConsultations] Opening detail modal for:', consultation.id);
  }

  closeConsultationDetail(): void {
    this.showDetailModal = false;
    this.selectedConsultation = null;
  }

  approveConsultation(consultationId: string): void {
    const consultation = this.consultations.find(c => c.id === consultationId);
    if (consultation && consultation.status === 'pending') {
      consultation.status = 'scheduled';
      this.successMessage = 'Consultation approved successfully!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      this.closeConsultationDetail();
      console.log('[DoctorConsultations] Consultation approved:', consultationId);
    }
  }

  rejectConsultation(consultationId: string): void {
    const consultation = this.consultations.find(c => c.id === consultationId);
    if (consultation && consultation.status === 'pending') {
      consultation.status = 'cancelled';
      this.successMessage = 'Consultation rejected!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      this.closeConsultationDetail();
      console.log('[DoctorConsultations] Consultation rejected:', consultationId);
    }
  }

  rescheduleConsultation(consultationId: string, newTime: string): void {
    const consultation = this.consultations.find(c => c.id === consultationId);
    if (consultation) {
      consultation.scheduledTime = newTime;
      this.successMessage = 'Consultation rescheduled successfully!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      console.log('[DoctorConsultations] Consultation rescheduled:', consultationId);
    }
  }

  completeConsultation(consultationId: string): void {
    const consultation = this.consultations.find(c => c.id === consultationId);
    if (consultation) {
      consultation.status = 'completed';
      this.successMessage = 'Consultation marked as completed!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      this.closeConsultationDetail();
      this.loadStats();
      console.log('[DoctorConsultations] Consultation completed:', consultationId);
    }
  }

  cancelConsultation(consultationId: string): void {
    if (confirm('Are you sure you want to cancel this consultation?')) {
      const consultation = this.consultations.find(c => c.id === consultationId);
      if (consultation) {
        consultation.status = 'cancelled';
        this.successMessage = 'Consultation cancelled!';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        this.closeConsultationDetail();
        this.loadStats();
        console.log('[DoctorConsultations] Consultation cancelled:', consultationId);
      }
    }
  }

  getNextPage(): void {
    if (this.currentPage * this.pageSize < this.totalItems) {
      this.currentPage++;
      console.log('[DoctorConsultations] Moving to page:', this.currentPage);
    }
  }

  getPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      console.log('[DoctorConsultations] Moving to page:', this.currentPage);
    }
  }

  clearError(): void {
    this.error = '';
  }
}
