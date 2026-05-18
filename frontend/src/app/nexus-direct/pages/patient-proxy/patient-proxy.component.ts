import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ServiceHeaderComponent } from '../../../shared/components/service-header/service-header.component';

@Component({
  selector: 'app-patient-proxy',
  standalone: true,
  imports: [CommonModule, ServiceHeaderComponent],
  templateUrl: './patient-proxy.component.html',
  styleUrls: ['./patient-proxy.component.scss']
})
export class PatientProxyComponent implements OnInit {
  currentUser: any = null;
  familyMembers: any[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }
}
