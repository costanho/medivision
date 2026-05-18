import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PatientService } from '../../../services/patient.service';
import { DoctorService } from '../../../services/doctor.service';
import { AppointmentService, Appointment } from '../../../services/appointment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MessageService, Message } from '../../../services/message.service';

interface Patient {
  id: number;
  name?: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  userEmail?: string;
  isOnline?: boolean;
  unreadCount?: number;
  lastSeen?: string;
  hasAppointment?: boolean;
  appointmentStatus?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'PENDING';
  appointmentDate?: string;
}

@Component({
  selector: 'app-doctor-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-messages.component.html',
  styleUrls: ['./doctor-messages.component.scss']
})
export class DoctorMessagesComponent implements OnInit, OnDestroy {
  // Tab management
  activeTab: 'patients' | 'doctors' = 'patients';

  // All contacts
  patients: Patient[] = [];
  doctors: Patient[] = [];

  // Filtered contacts
  filteredPatients: Patient[] = [];
  filteredDoctors: Patient[] = [];

  loading = true;
  error = '';

  // Search and filter properties
  searchQuery = '';
  filterByAppointment = false;
  filterByStatus: 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' = 'ALL';

  // Appointment data
  appointments: Appointment[] = [];
  appointmentContactMap = new Map<number, Appointment[]>();

  // Chat/Message view state
  selectedPatient: Patient | null = null;
  showChatView = false;
  messages: Message[] = [];  // Use Message interface to preserve senderEmail
  messageInput = '';

  private destroy$ = new Subject<void>();

  constructor(
    private patientService: PatientService,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('[DoctorMessagesComponent] ✓ ngOnInit called');
    console.log('[DoctorMessagesComponent] Initial state:', {
      loading: this.loading,
      patientsCount: this.patients.length
    });
    this.loadPatients();
    this.loadDoctors();
    this.loadAppointments();
  }

  private loadPatients(): void {
    console.log('[DoctorMessagesComponent.loadPatients] Starting to load patients from backend...');
    this.loading = true;
    this.error = '';

    this.patientService.getPatients(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[DoctorMessagesComponent.loadPatients] ✓ Patients loaded from backend:', response);
          this.patients = (response.content || []).map(patient => ({
            id: patient.id,
            name: patient.fullName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.email,
            email: patient.email || patient.userEmail,
            userEmail: patient.email || patient.userEmail,
            isOnline: patient.isOnline || false,
            unreadCount: 0,
            lastSeen: patient.updatedAt || patient.createdAt
          }));

          console.log('[DoctorMessagesComponent.loadPatients] ✓ Loaded', this.patients.length, 'patients from backend');
          // Fetch online status from presence API
          this.fetchPresenceStatus(this.patients, 'patients');
          this.applyFilters();
          this.loading = false;
          console.log('[DoctorMessagesComponent.loadPatients] ✓ Displaying', this.filteredPatients.length, 'patients');
        },
        error: (err) => {
          console.error('[DoctorMessagesComponent.loadPatients] ✗ Failed to load patients:', err);
          this.error = 'Failed to load patients from backend. Please try again.';
          this.patients = [];
          this.filteredPatients = [];
          this.loading = false;
        }
      });
  }

  private loadDoctors(): void {
    console.log('[DoctorMessagesComponent.loadDoctors] Starting to load doctors from backend...');
    this.doctorService.getDoctors(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[DoctorMessagesComponent.loadDoctors] ✓ Doctors loaded from backend:', response);
          this.doctors = (response.content || []).map(doctor => ({
            id: doctor.id,
            name: doctor.name || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.email,
            email: doctor.email || doctor.userEmail,
            userEmail: doctor.email || doctor.userEmail,
            isOnline: doctor.isOnline || false,
            unreadCount: 0,
            lastSeen: doctor.updatedAt || doctor.createdAt,
            specialization: doctor.specialization
          }));

          console.log('[DoctorMessagesComponent.loadDoctors] ✓ Loaded', this.doctors.length, 'doctors from backend');
          console.log('[DoctorMessagesComponent.loadDoctors] ✓ Total doctors:', this.doctors.length);
          // Fetch online status from presence API
          this.fetchPresenceStatus(this.doctors, 'doctors');
          this.applyFilters();
        },
        error: (err) => {
          console.error('[DoctorMessagesComponent.loadDoctors] ✗ Failed to load doctors:', err);
          // Don't set error if doctors fail, patients may have loaded successfully
        }
      });
  }

  private loadAppointments(): void {
    this.appointmentService.getAppointments(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Appointments loaded:', response);
          this.appointments = response.content || [];
          this.buildAppointmentContactMap();
          this.enrichPatientsWithAppointments();
        },
        error: (err) => {
          console.error('Failed to load appointments:', err);
          // Continue without appointments
        }
      });
  }

  private buildAppointmentContactMap(): void {
    this.appointmentContactMap.clear();

    this.appointments.forEach(appointment => {
      const contactId = appointment.patientId;

      if (!this.appointmentContactMap.has(contactId)) {
        this.appointmentContactMap.set(contactId, []);
      }

      const appts = this.appointmentContactMap.get(contactId) || [];
      appts.push(appointment);
      this.appointmentContactMap.set(contactId, appts);
    });
  }

  private enrichPatientsWithAppointments(): void {
    this.patients = this.patients.map(patient => ({
      ...patient,
      hasAppointment: this.appointmentContactMap.has(patient.id),
      appointmentStatus: this.getLatestAppointmentStatus(patient.id),
      appointmentDate: this.getLatestAppointmentDate(patient.id)
    }));
    this.applyFilters();
  }

  private getLatestAppointmentStatus(patientId: number): 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'PENDING' | undefined {
    const appointments = this.appointmentContactMap.get(patientId) || [];
    if (appointments.length === 0) return undefined;
    return appointments[0]?.status;
  }

  private getLatestAppointmentDate(patientId: number): string | undefined {
    const appointments = this.appointmentContactMap.get(patientId) || [];
    if (appointments.length === 0) return undefined;
    return appointments[0]?.appointmentDate;
  }

  /**
   * Fetch real-time online status from presence API
   */
  private fetchPresenceStatus(contacts: Patient[], type: 'patients' | 'doctors'): void {
    if (!contacts || contacts.length === 0) return;

    const emails = contacts
      .filter(c => c.userEmail)
      .map(c => c.userEmail!)
      .join(',');

    if (!emails) return;

    const endpoint = type === 'patients'
      ? `/api/presence/patients/online?patientEmails=${encodeURIComponent(emails)}`
      : `/api/presence/doctors/online?doctorEmails=${encodeURIComponent(emails)}`;

    console.log(`[DoctorMessagesComponent.fetchPresenceStatus] Fetching presence for ${contacts.length} ${type}`);

    this.http.get<{ [email: string]: boolean }>(endpoint)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (presenceMap) => {
          console.log(`[DoctorMessagesComponent.fetchPresenceStatus] Presence status received:`, presenceMap);
          // Update contacts with online status
          if (type === 'patients') {
            this.patients = this.patients.map(p => ({
              ...p,
              isOnline: presenceMap[p.userEmail!] || false
            }));
          } else {
            this.doctors = this.doctors.map(d => ({
              ...d,
              isOnline: presenceMap[d.userEmail!] || false
            }));
          }
          this.applyFilters();
        },
        error: (err) => {
          console.error(`[DoctorMessagesComponent.fetchPresenceStatus] Failed to fetch presence:`, err);
          // Continue without presence data if fetch fails
        }
      });
  }

  applyFilters(): void {
    // Filter patients
    let filteredPatients = this.patients;
    let filteredDoctors = this.doctors;

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filteredPatients = filteredPatients.filter(patient =>
        (patient.name && patient.name.toLowerCase().includes(query)) ||
        (patient.email && patient.email.toLowerCase().includes(query))
      );
      filteredDoctors = filteredDoctors.filter(doctor =>
        (doctor.name && doctor.name.toLowerCase().includes(query)) ||
        (doctor.email && doctor.email.toLowerCase().includes(query))
      );
    }

    // Filter by appointment (patients only)
    if (this.filterByAppointment) {
      filteredPatients = filteredPatients.filter(patient => patient.hasAppointment === true);
    }

    // Filter by status (patients only)
    if (this.filterByStatus !== 'ALL') {
      filteredPatients = filteredPatients.filter(patient => patient.appointmentStatus === this.filterByStatus);
    }

    this.filteredPatients = filteredPatients;
    this.filteredDoctors = filteredDoctors;
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  toggleAppointmentFilter(): void {
    this.filterByAppointment = !this.filterByAppointment;
    this.applyFilters();
  }

  setStatusFilter(status: 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'): void {
    this.filterByStatus = status;
    this.applyFilters();
  }

  switchTab(tab: 'patients' | 'doctors'): void {
    console.log('[DoctorMessagesComponent] Switching to tab:', tab);
    this.activeTab = tab;
  }

  selectPatient(patient: Patient): void {
    console.log('[DoctorMessagesComponent] Patient selected:', patient.name);
    this.selectedPatient = patient;
    this.showChatView = true;
    this.loadConversationMessages(patient.id);
  }

  private loadConversationMessages(patientId: number): void {
    console.log('[DoctorMessagesComponent] Loading messages for patient ID:', patientId);
    this.messageService.getConversation(patientId, 0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[DoctorMessagesComponent] Messages loaded:', response);
          // Keep full message objects to preserve senderEmail for alignment
          this.messages = response.content || [];
          console.log('[DoctorMessagesComponent] ✓ Loaded', this.messages.length, 'messages');
        },
        error: (err) => {
          console.error('[DoctorMessagesComponent] Failed to load messages:', err);
          // Clear messages on error - no conversation history yet
          this.messages = [];
        }
      });
  }

  closeChat(): void {
    console.log('[DoctorMessagesComponent] Closing chat view');
    this.showChatView = false;
    this.selectedPatient = null;
    this.messages = [];
    this.messageInput = '';
  }

  sendMessage(): void {
    if (!this.messageInput.trim() || !this.selectedPatient) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const messageData: any = {
      receiverId: this.selectedPatient.id,
      recipientEmail: this.selectedPatient.userEmail || this.selectedPatient.email,
      recipientName: this.selectedPatient.name,
      senderEmail: currentUser?.email,
      senderName: currentUser?.fullName || currentUser?.name || 'Doctor',
      content: this.messageInput
    };

    // Add optimistic message to UI immediately
    const localMessage: Message = {
      id: Date.now(),
      content: this.messageInput,
      createdAt: new Date().toISOString(),
      userEmail: currentUser?.email || '',
      senderName: currentUser?.fullName || currentUser?.name || 'Doctor'
    };
    // Set senderEmail via bracket notation to avoid TS strict mode issues
    (localMessage as any).senderEmail = currentUser?.email || '';

    this.messages.push(localMessage);
    this.messageInput = '';

    this.messageService.sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[DoctorMessagesComponent] Message sent successfully:', response);
          // Replace optimistic message with server response
          const idx = this.messages.findIndex(m => m.id === localMessage.id);
          if (idx !== -1 && response.id) {
            this.messages[idx] = response;
          }
        },
        error: (err) => {
          console.error('[DoctorMessagesComponent] Failed to send message:', err);
          // Keep optimistic message in UI
        }
      });
  }

  // Helper method to determine if a message was sent by the current user
  isSentByCurrentUser(message: Message): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !message) {
      return false;
    }

    // Get sender email - try multiple possible field names
    const messageSenderEmail = (message as any)['senderEmail'] || message.userEmail;
    const currentUserEmail = currentUser.email?.toLowerCase().trim() || '';

    // Normalize the sender email for comparison
    const normalizedSenderEmail = typeof messageSenderEmail === 'string'
      ? messageSenderEmail.toLowerCase().trim()
      : '';

    const isSent = normalizedSenderEmail === currentUserEmail && currentUserEmail !== '';

    // Log for debugging (only if mismatch)
    if (!isSent && normalizedSenderEmail && currentUserEmail) {
      console.log('[DoctorMessagesComponent.isSentByCurrentUser] Message NOT from current user:', {
        currentUserEmail,
        messageSenderEmail: normalizedSenderEmail,
        content: message.content?.substring(0, 30)
      });
    }

    return isSent;
  }

  // Helper method to determine CSS class for message alignment
  getMessageAlignmentClass(message: Message): string {
    const isSent = this.isSentByCurrentUser(message);
    // Simple alignment: if current user sent it, put it on the right (sent class)
    return isSent ? 'sent' : 'received';
  }

  // Helper method to determine bubble CSS class
  getMessageBubbleClass(message: Message): string {
    const isSent = this.isSentByCurrentUser(message);
    // Simple styling: if current user sent it, use sent-bubble style
    return isSent ? 'sent-bubble' : 'received-bubble';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
