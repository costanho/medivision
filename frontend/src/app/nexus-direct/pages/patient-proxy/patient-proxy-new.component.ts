import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-patient-proxy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-proxy-new.component.html',
  styleUrls: ['./patient-proxy-new.component.scss']
})
export class PatientProxyNewComponent implements OnInit, OnDestroy {

  currentUser: any = null;
  currentRole: string | null = null;
  destroy$ = new Subject<void>();

  activeTab: 'dependents' | 'health' | 'appointments' | 'records' = 'dependents';

  // Family members / dependents
  dependents = [
    {
      id: 1,
      name: 'Emma Johnson (Daughter)',
      age: 12,
      relationship: 'Daughter',
      status: 'Active',
      avatar: '👧',
      color: '#f093fb'
    },
    {
      id: 2,
      name: 'John Johnson (Son)',
      age: 9,
      relationship: 'Son',
      status: 'Active',
      avatar: '👦',
      color: '#667eea'
    },
    {
      id: 3,
      name: 'Mary Johnson (Wife)',
      age: 45,
      relationship: 'Spouse',
      status: 'Active',
      avatar: '👩',
      color: '#4caf50'
    }
  ];

  // Family health overview
  familyHealth = [
    {
      name: 'Emma Johnson',
      lastCheckup: 'Oct 15, 2025',
      conditions: ['Seasonal Allergies'],
      medications: ['Antihistamine'],
      allergies: ['Pollen', 'Dust'],
      healthScore: 85
    },
    {
      name: 'John Johnson',
      lastCheckup: 'Oct 20, 2025',
      conditions: ['Asthma'],
      medications: ['Inhaler'],
      allergies: ['Pollen'],
      healthScore: 78
    },
    {
      name: 'Mary Johnson',
      lastCheckup: 'Nov 01, 2025',
      conditions: ['Hypertension'],
      medications: ['Blood Pressure Medication'],
      allergies: ['Penicillin'],
      healthScore: 72
    }
  ];

  // Family appointments
  familyAppointments = [
    {
      dependent: 'Emma Johnson',
      doctor: 'Dr. Sarah Johnson',
      date: 'Nov 25, 2025',
      time: '2:00 PM',
      specialty: 'Pediatrics',
      status: 'confirmed'
    },
    {
      dependent: 'John Johnson',
      doctor: 'Dr. Michael Chen',
      date: 'Nov 28, 2025',
      time: '10:30 AM',
      specialty: 'Pulmonology',
      status: 'confirmed'
    }
  ];

  // Medical records for family
  familyRecords = [
    {
      dependent: 'Emma Johnson',
      title: 'Allergy Test Results',
      date: 'Oct 15, 2025',
      type: 'Lab Report',
      icon: '🧪'
    },
    {
      dependent: 'John Johnson',
      title: 'Chest X-Ray',
      date: 'Oct 10, 2025',
      type: 'Imaging',
      icon: '🩻'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.currentRole = this.authService.getCurrentRole();

    if (!this.currentRole || (this.currentRole !== 'ROLE_PATIENT' && this.currentRole !== 'PATIENT')) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.currentUserRole$
      .pipe(takeUntil(this.destroy$))
      .subscribe(role => {
        if (!role) {
          this.router.navigate(['/login']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  switchTab(tab: 'dependents' | 'health' | 'appointments' | 'records'): void {
    this.activeTab = tab;
  }

  addDependent(): void {
    console.log('Opening add dependent dialog');
  }

  editDependent(dependent: any): void {
    console.log('Editing dependent:', dependent.name);
  }

  removeDependent(dependent: any): void {
    if (confirm(`Are you sure you want to remove ${dependent.name} from your family?`)) {
      console.log('Removing dependent:', dependent.name);
    }
  }

  viewHealthHistory(person: any): void {
    console.log('Viewing health history for:', person.name);
  }

  scheduleAppointment(dependent: any): void {
    console.log('Scheduling appointment for:', dependent.name);
  }

  backToProfile(): void {
    this.router.navigate(['/patient/profile']);
  }
}
