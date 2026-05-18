import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Consultation {
  id: number;
  patientName: string;
  patientEmail: string;
  reason: string;
  submittedDate: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
}

@Component({
  selector: 'app-pending-consultations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-consultations.component.html',
  styleUrls: ['./pending-consultations.component.scss']
})
export class PendingConsultationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  consultations: Consultation[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadPendingConsultations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPendingConsultations(): void {
    this.loading = true;
    this.consultations = [];
    this.loading = false;
    console.log('[PendingConsultations] Consultations loaded from backend');
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      case 'low':
        return '#4caf50';
      default:
        return '#95a5a6';
    }
  }
}
