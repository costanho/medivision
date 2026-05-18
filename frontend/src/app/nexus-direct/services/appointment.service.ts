import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface Appointment {
  id: number;
  userEmail?: string;
  doctorEmail?: string;
  doctorId: number;
  doctorName?: string;
  specialty?: string;
  patientId: number;
  patientName?: string;
  appointmentDate?: string;
  appointmentTime: string;  // Contains full datetime
  endTime?: string;
  location?: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'PENDING';
  reason?: string;
  notes?: string;
  patientNotes?: string;
  doctorNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface AppointmentListResponse {
  content: Appointment[];
  totalElements: number;
  totalPages: number;
  pageable: any;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  constructor(private apiService: ApiService) {}

  // Get all appointments (paginated) - filtered by current user
  getAppointments(page: number = 0, size: number = 10): Observable<AppointmentListResponse> {
    return this.apiService.get<AppointmentListResponse>('/appointments/search/paginated', {
      page,
      size,
      sortBy: 'appointmentTime',
      direction: 'DESC'
    });
  }

  // Get all system appointments (paginated) - NOT filtered by user
  getSystemAppointments(page: number = 0, size: number = 10): Observable<AppointmentListResponse> {
    return this.apiService.get<AppointmentListResponse>('/appointments/system/paginated', {
      page,
      size,
      sortBy: 'appointmentTime',
      direction: 'DESC'
    });
  }

  // Get appointments by doctor email (paginated)
  getAppointmentsByDoctorEmail(
    doctorEmail: string,
    page: number = 0,
    size: number = 10,
    sortBy: string = 'appointmentTime',
    direction: string = 'DESC'
  ): Observable<AppointmentListResponse> {
    return this.apiService.get<AppointmentListResponse>(
      `/appointments/doctor/${doctorEmail}/paginated`,
      {
        page,
        size,
        sortBy,
        direction
      }
    );
  }

  // Get appointments by doctor email and status
  getAppointmentsByDoctorEmailAndStatus(
    doctorEmail: string,
    status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'PENDING'
  ): Observable<Appointment[]> {
    return this.apiService.get<Appointment[]>(
      `/appointments/doctor/${doctorEmail}/status/${status}`
    );
  }

  // Search appointments by date range
  searchByDateRange(start: string, end: string, page: number = 0, size: number = 10): Observable<AppointmentListResponse> {
    return this.apiService.get<AppointmentListResponse>('/appointments/search/by-date-range', {
      start,
      end,
      page,
      size
    });
  }

  // Get single appointment by ID
  getAppointmentById(id: number): Observable<Appointment> {
    return this.apiService.get<Appointment>(`/appointments/${id}`);
  }

  // Create new appointment (book)
  bookAppointment(appointment: any): Observable<Appointment> {
    return this.apiService.post<Appointment>('/appointments', appointment);
  }

  // Update appointment
  updateAppointment(id: number, appointment: any): Observable<Appointment> {
    return this.apiService.put<Appointment>(`/appointments/${id}`, appointment);
  }

  // Delete appointment (cancel)
  cancelAppointment(id: number): Observable<any> {
    return this.apiService.delete(`/appointments/${id}`);
  }
}
