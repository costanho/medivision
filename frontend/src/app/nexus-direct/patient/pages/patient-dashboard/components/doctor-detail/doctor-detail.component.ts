import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DoctorService, Doctor } from '../../../../../services/doctor.service';
import { MessageService } from '../../../../../services/message.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './doctor-detail.component.html',
  styleUrls: ['./doctor-detail.component.scss']
})
export class DoctorDetailComponent implements OnInit, OnDestroy {
  doctor: Doctor | null = null;
  loading = true;
  error = '';
  doctorId: number | null = null;
  showMessageModal = false;
  messageContent = '';
  sendingMessage = false;
  private destroy$ = new Subject<void>();

  constructor(
    private doctorService: DoctorService,
    private messageService: MessageService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.doctorId = parseInt(params['id'], 10);
        if (this.doctorId) {
          this.loadDoctorDetails();
        }
      });
  }

  private loadDoctorDetails(): void {
    if (!this.doctorId) return;

    this.loading = true;
    this.error = '';
    this.doctorService.getDoctorById(this.doctorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doctor) => {
          this.doctor = doctor;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load doctor:', err);
          this.error = 'Failed to load doctor details. Please try again.';
          this.loading = false;
        }
      });
  }

  openMessageModal(): void {
    this.showMessageModal = true;
    this.messageContent = '';
  }

  closeMessageModal(): void {
    this.showMessageModal = false;
    this.messageContent = '';
  }

  sendMessage(): void {
    if (!this.messageContent.trim() || !this.doctor) {
      return;
    }

    this.sendingMessage = true;
    const currentUser = this.authService.getCurrentUser();

    const messageData = {
      receiverId: this.doctor.id,
      recipientEmail: this.doctor.email || this.doctor.userEmail,
      recipientName: this.doctor.name,
      senderEmail: currentUser?.email,
      senderName: currentUser?.fullName || currentUser?.name || 'Patient',
      content: this.messageContent
    };

    this.messageService.sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sendingMessage = false;
          this.closeMessageModal();
          this.error = '';
        },
        error: (err) => {
          console.error('Failed to send message:', err);
          this.error = 'Failed to send message. Please try again.';
          this.sendingMessage = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
