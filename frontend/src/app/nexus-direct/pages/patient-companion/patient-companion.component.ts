import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ServiceHeaderComponent } from '../../../shared/components/service-header/service-header.component';

@Component({
  selector: 'app-patient-companion',
  standalone: true,
  imports: [CommonModule, ServiceHeaderComponent],
  templateUrl: './patient-companion.component.html',
  styleUrls: ['./patient-companion.component.scss']
})
export class PatientCompanionComponent implements OnInit {
  currentUser: any = null;

  features = [
    { icon: '❓', title: 'Symptom Checker', description: 'AI-powered symptom analysis' },
    { icon: '💊', title: 'Medication Reminders', description: 'Never miss your medication' },
    { icon: '📚', title: 'Health Tips', description: 'Daily health and wellness advice' },
    { icon: '🗣️', title: 'Ask AI', description: '24/7 AI health assistant' }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }
}
