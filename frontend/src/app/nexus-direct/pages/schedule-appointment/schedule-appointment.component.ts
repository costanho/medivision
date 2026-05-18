import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DoctorService, Doctor } from '../../services/doctor.service';
import { AppointmentService } from '../../services/appointment.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-schedule-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './schedule-appointment.component.html',
  styleUrls: ['./schedule-appointment.component.scss']
})
export class ScheduleAppointmentComponent implements OnInit, OnDestroy {
  appointmentForm: FormGroup;
  doctor: Doctor | null = null;
  loading = true;
  submitted = false;
  error = '';
  successMessage = '';
  submitting = false;
  doctorId: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.appointmentForm = this.formBuilder.group({
      appointmentDate: ['', Validators.required],
      appointmentTime: ['', Validators.required],
      reason: ['', Validators.required],
      notes: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.doctorId = parseInt(params['doctorId'], 10);
        if (this.doctorId) {
          this.loadDoctorDetails();
        } else {
          this.error = 'Please select a doctor to schedule an appointment.';
          this.loading = false;
        }
      });
  }

  private loadDoctorDetails(): void {
    if (!this.doctorId) return;

    this.doctorService.getDoctorById(this.doctorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doctor) => {
          this.doctor = doctor;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load doctor:', err);
          this.error = 'Failed to load doctor details.';
          this.loading = false;
        }
      });
  }

  get f() {
    return this.appointmentForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.successMessage = '';

    if (this.appointmentForm.invalid || !this.doctorId) {
      return;
    }

    this.submitting = true;
    // Combine date and time into ISO 8601 format
    const dateStr = this.appointmentForm.value.appointmentDate; // Format: YYYY-MM-DD
    const timeStr = this.appointmentForm.value.appointmentTime; // Format: HH:MM
    const appointmentDateTime = `${dateStr}T${timeStr}:00`; // Format: YYYY-MM-DDTHH:MM:00

    const appointmentData = {
      doctorId: this.doctorId,
      appointmentDate: this.appointmentForm.value.appointmentDate,
      appointmentTime: appointmentDateTime,
      reason: this.appointmentForm.value.reason || '',
      notes: this.appointmentForm.value.notes || ''
    };

    this.appointmentService.bookAppointment(appointmentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Appointment scheduled successfully!', response);
          this.successMessage = 'Appointment scheduled successfully!';
          this.submitting = false;
          setTimeout(() => {
            this.router.navigate(['/patient/nexus-direct/dashboard/appointments']);
          }, 2000);
        },
        error: (err) => {
          console.error('Failed to schedule appointment:', err);
          this.error = err.error?.error || 'Failed to schedule appointment. Please try again.';
          this.submitting = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
