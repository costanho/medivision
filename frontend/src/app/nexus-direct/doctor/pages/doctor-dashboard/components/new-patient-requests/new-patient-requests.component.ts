import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PatientRequest {
  id: number;
  patientName: string;
  email: string;
  phone: string;
  requestDate: string;
  status: string;
}

@Component({
  selector: 'app-new-patient-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './new-patient-requests.component.html',
  styleUrls: ['./new-patient-requests.component.scss']
})
export class NewPatientRequestsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  requests: PatientRequest[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadPatientRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatientRequests(): void {
    this.loading = true;
    setTimeout(() => {
      this.requests = [
        {
          id: 1,
          patientName: 'Emma Thompson',
          email: 'emma.t@email.com',
          phone: '(555) 123-4567',
          requestDate: 'Today',
          status: 'new'
        },
        {
          id: 2,
          patientName: 'James Patterson',
          email: 'james.p@email.com',
          phone: '(555) 234-5678',
          requestDate: 'Yesterday',
          status: 'new'
        },
        {
          id: 3,
          patientName: 'Sophie Anderson',
          email: 'sophie.a@email.com',
          phone: '(555) 345-6789',
          requestDate: '2 days ago',
          status: 'new'
        }
      ];
      this.loading = false;
      console.log('[NewPatientRequests] Requests loaded:', this.requests);
    }, 500);
  }
}
