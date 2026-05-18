import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PatientService } from '../../../../services/patient.service';
import { ApiService } from '../../../../../core/services/api.service';
import { CallService } from '../../../../services/call.service';
import { WebSocketService } from '../../../../../services/messaging/websocket.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { StorageService } from '../../../../../core/services/storage.service';

// Import shared WebRTC components
import {
  VideoContainerComponent,
  CallToolbarComponent,
  ParticipantListComponent,
  IncomingCallDialogComponent
} from '../../../shared/index';

/**
 * DoctorCallScreenComponent
 * Doctor's consultation interface for managing patient calls
 * Displays patient information, medical history, and consultation details
 * Full controls for call management
 */

@Component({
  selector: 'app-doctor-call-screen',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VideoContainerComponent,
    CallToolbarComponent,
    ParticipantListComponent,
    IncomingCallDialogComponent
  ],
  providers: [PatientService, CallService],
  templateUrl: './doctor-call-screen.component.html',
  styleUrls: ['./doctor-call-screen.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DoctorCallScreenComponent implements OnInit, OnDestroy {
  @Input() patientId: string = '';
  @Input() consultationId: string = '';

  // Call state
  isCallActive = false;
  isAudioEnabled = true;
  isVideoEnabled = true;
  isScreenSharing = false;
  isRecording = false;
  callDuration = 0;
  callStartTime: Date | null = null;
  callSessionId: string | null = null;
  callError: string = '';

  // Media streams
  localStream: MediaStream | null = null;
  remoteStreams = new Map<string, MediaStream>();

  // Call participants and patient info
  selectedPatient: any = null;
  participants: any[] = [];
  incomingCallInfo: any = null;
  showIncomingDialog = false;

  // Available patients and patient queue
  availablePatients: any[] = [];
  isLoadingPatients = true;
  patientLoadError = '';

  // Search functionality
  searchQuery: string = '';
  filteredPatients: any[] = [];
  noResultsFound = false;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalPatients = 0;
  totalPages = 0;

  // Consultation details
  consultationReason: string = '';
  consultationNotes: string = '';
  prescriptionNotes: string = '';

  // Patient vitals and health metrics (loaded from database)
  patientVitals: any = null;

  // Patient documents (loaded from database)
  patientDocuments: any[] = [];

  // Chat messages (loaded from database)
  chatMessages: any[] = [];
  newMessage: string = '';

  // UI state
  currentLayout: 'grid' | 'focus' = 'focus';
  focusedUserId: string | null = null;
  showParticipantList = true;
  showPatientSelector = false;
  callPhase: 'select-patient' | 'waiting' | 'in-call' | 'ended' = 'select-patient';

  private destroy$ = new Subject<void>();

  constructor(
    private patientService: PatientService,
    private apiService: ApiService,
    private callService: CallService,
    private changeDetectorRef: ChangeDetectorRef,
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.loadPatients();
    if (this.patientId) {
      this.focusedUserId = this.patientId;
    }

    // Connect WebSocket for receiving call events
    this.connectWebSocket();
  }

  /**
   * Connect to WebSocket and listen for call events
   */
  private connectWebSocket(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.webSocketService.connect(
        this.storageService.getAccessToken() || '',
        currentUser.id
      );

      // Listen for incoming call events from patients
      this.webSocketService.callEvents$
        .pipe(takeUntil(this.destroy$))
        .subscribe((event: any) => {
          console.log('[DoctorCallScreen] Call event received:', event);
          this.handleCallEvent(event);
          this.changeDetectorRef.markForCheck();
        });
    }
  }

  /**
   * Handle incoming call events
   */
  private handleCallEvent(event: any): void {
    switch (event.eventType) {
      case 'call_accepted':
        console.log('[DoctorCallScreen] Call accepted by patient', event.callerId);
        // Patient accepted the call - transition to in-call state
        this.callPhase = 'in-call';
        this.isCallActive = true;
        break;

      case 'call_rejected':
        console.log('[DoctorCallScreen] Call rejected by patient', event.callerId);
        // Patient rejected the call - return to patient selector
        this.callPhase = 'select-patient';
        this.isCallActive = false;
        this.callError = 'Patient declined the call';
        break;

      case 'call_ended':
        console.log('[DoctorCallScreen] Call ended by patient', event.callerId);
        // Patient ended the call - return to patient selector
        this.callPhase = 'ended';
        this.isCallActive = false;
        break;

      default:
        console.log('[DoctorCallScreen] Unknown call event type:', event.eventType);
    }
  }

  /**
   * Load patients from auth table (users with PATIENT role)
   */
  private loadPatients(page: number = 0): void {
    this.isLoadingPatients = true;
    this.patientLoadError = '';

    // Fetch patients from auth service endpoint
    this.apiService.get<any>('/auth/users/by-role', { role: 'PATIENT', page, size: this.pageSize })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // Extract pagination info
          this.totalPatients = response.totalElements || 0;
          this.totalPages = response.totalPages || 0;
          this.currentPage = page;

          this.availablePatients = (response.content || response || []).map((user: any) => {
            // Ensure ID is a number
            const patientId = typeof user.id === 'number' ? user.id : parseInt(user.id, 10);
            const patientName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'Unknown Patient';
            const patientEmail = user.email || '';

            console.log('[loadPatients] Mapping user to patient:', {
              originalId: user.id,
              parsedId: patientId,
              email: patientEmail,
              name: patientName
            });

            return {
              id: patientId,
              name: patientName,
              email: patientEmail,
              phone: user.phone || '',
              age: 'N/A',
              gender: 'Not specified',
              lastVisit: 'Never',
              medicalHistory: [],
              avatar: this.getPatientInitials(patientName)
            };
          });
          // Initialize filtered list with all patients
          this.filteredPatients = this.availablePatients;
          this.isLoadingPatients = false;
          this.changeDetectorRef.markForCheck();
        },
        error: (error: any) => {
          console.error('Error loading patients from auth service:', error);
          this.patientLoadError = 'Failed to load patients. Please try again.';
          this.isLoadingPatients = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Load patient vitals, documents, and messages from backend
   */
  private loadPatientData(patientId: number, patientEmail: string): void {
    // Load patient medical record for vitals
    this.patientService.getPatientById(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient: any) => {
          // Map patient data to vitals (only from database, no defaults)
          if (patient && (patient.bloodPressure || patient.heartRate || patient.temperature || patient.weight)) {
            this.patientVitals = {
              bloodPressure: patient.bloodPressure,
              heartRate: patient.heartRate,
              temperature: patient.temperature,
              weight: patient.weight,
              lastUpdated: new Date()
            };
            this.changeDetectorRef.markForCheck();
          }
        },
        error: (error: any) => {
          console.warn('Failed to load patient vitals:', error);
        }
      });

    // Load patient documents
    this.apiService.get<any>(`/documents/filter/by-patient/${patientId}`, { page: 0, size: 10 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.patientDocuments = (response.content || []).map((doc: any) => ({
            id: doc.id,
            name: doc.fileName || doc.name,
            type: this.getFileType(doc.fileName || doc.name),
            uploadedDate: this.formatDate(new Date(doc.createdAt || doc.uploadedDate)),
            size: this.formatFileSize(doc.fileSize)
          }));
          this.changeDetectorRef.markForCheck();
        },
        error: (error: any) => {
          console.warn('Failed to load patient documents:', error);
          this.patientDocuments = [];
        }
      });

    // Load conversation messages between doctor and patient
    this.apiService.get<any>(`/conversations`, { otherUserEmail: patientEmail, page: 0, size: 20 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const messages = response.messages || response.content || [];
          this.chatMessages = messages.map((msg: any) => ({
            id: msg.id,
            sender: msg.senderRole?.toLowerCase() === 'doctor' ? 'doctor' : 'patient',
            senderName: msg.senderName || msg.senderEmail,
            message: msg.content || msg.message,
            timestamp: new Date(msg.sentAt || msg.createdAt)
          }));
          this.changeDetectorRef.markForCheck();
        },
        error: (error: any) => {
          console.warn('Failed to load messages:', error);
          this.chatMessages = [];
        }
      });
  }

  /**
   * Generate initials avatar from patient name
   */
  private getPatientInitials(name: string): string {
    const parts = name.split(' ').filter(p => p);
    return parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
  }

  /**
   * Search patients by name, email, or phone
   */
  onSearchChange(query: string): void {
    this.searchQuery = query.toLowerCase().trim();

    if (!this.searchQuery) {
      // Reset to show all if search is empty
      this.filteredPatients = this.availablePatients;
      this.noResultsFound = false;
      this.changeDetectorRef.markForCheck();
      return;
    }

    // Filter patients by name, email, or phone
    this.filteredPatients = this.availablePatients.filter((patient: any) =>
      patient.name.toLowerCase().includes(this.searchQuery) ||
      patient.email.toLowerCase().includes(this.searchQuery) ||
      (patient.phone && patient.phone.includes(this.searchQuery))
    );

    // Check if no results found
    this.noResultsFound = this.filteredPatients.length === 0;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Clear search and reset to show all
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filteredPatients = this.availablePatients;
    this.noResultsFound = false;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.loadPatients(this.currentPage + 1);
    }
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.currentPage > 0) {
      this.loadPatients(this.currentPage - 1);
    }
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.loadPatients(page);
    }
  }

  /**
   * Check if can go to next page
   */
  canGoNext(): boolean {
    return this.currentPage < this.totalPages - 1;
  }

  /**
   * Check if can go to previous page
   */
  canGoPrevious(): boolean {
    return this.currentPage > 0;
  }

  /**
   * Select a patient and initiate call
   */
  selectPatient(patient: any): void {
    this.selectedPatient = patient;
    this.callError = '';
    this.isCallActive = true;
    this.callStartTime = new Date();

    console.log('[DoctorCallScreen] Selected patient:', patient);

    if (!patient) {
      this.callError = 'No patient selected';
      this.isCallActive = false;
      this.callPhase = 'select-patient';
      this.changeDetectorRef.markForCheck();
      return;
    }

    // Validate patient has a numeric ID
    const patientId = patient.id;
    if (!patientId || typeof patientId !== 'number') {
      console.error('[DoctorCallScreen] Invalid patient ID:', patientId, 'Type:', typeof patientId);
      this.callError = `Invalid patient ID. Expected number, got: ${typeof patientId}`;
      this.isCallActive = false;
      this.callPhase = 'select-patient';
      this.changeDetectorRef.markForCheck();
      return;
    }

    // Load patient data from backend (vitals, documents, messages)
    this.loadPatientData(patientId, patient.email);

    // Initiate call to patient
    this.callService.initiateCall(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // Extract session ID from response
          this.callSessionId = response.data?.sessionId || response.sessionId;
          this.callPhase = 'waiting';
          this.changeDetectorRef.markForCheck();
          console.log('Call initiated successfully. Session ID:', this.callSessionId);
        },
        error: (error: any) => {
          console.error('Failed to initiate call:', error);
          this.callError = error.error?.message || 'Failed to initiate call. Please try again.';
          this.isCallActive = false;
          this.callPhase = 'select-patient';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Handle audio toggle (doctor can mute themselves)
   */
  onToggleAudio(): void {
    this.isAudioEnabled = !this.isAudioEnabled;
  }

  /**
   * Handle video toggle (doctor can disable video)
   */
  onToggleVideo(): void {
    this.isVideoEnabled = !this.isVideoEnabled;
  }

  /**
   * Handle screen share toggle
   */
  onToggleScreenShare(): void {
    this.isScreenSharing = !this.isScreenSharing;
  }

  /**
   * Handle recording toggle
   */
  onToggleRecording(): void {
    this.isRecording = !this.isRecording;
  }

  /**
   * Handle end call
   */
  onEndCall(): void {
    if (confirm('Are you sure you want to end the consultation?')) {
      // End call via service if session exists
      if (this.callSessionId) {
        this.callService.endCall(this.callSessionId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              console.log('Call ended successfully');
              this.completeCallEnding();
            },
            error: (error: any) => {
              console.error('Error ending call:', error);
              // Still end the call locally even if backend fails
              this.completeCallEnding();
            }
          });
      } else {
        // No active session, just close locally
        this.completeCallEnding();
      }
    }
  }

  /**
   * Complete call ending and reset state
   */
  private completeCallEnding(): void {
    this.isCallActive = false;
    this.callPhase = 'ended';
    this.callSessionId = null;
    this.consultationNotes = '';
    this.prescriptionNotes = '';
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Handle incoming call accept
   */
  onAcceptIncomingCall(): void {
    this.showIncomingDialog = false;
  }

  /**
   * Handle incoming call reject
   */
  onRejectIncomingCall(): void {
    this.showIncomingDialog = false;
    this.incomingCallInfo = null;
  }

  /**
   * Focus on a specific participant
   */
  onFocusParticipant(userId: string): void {
    this.focusedUserId = userId;
  }

  /**
   * Toggle participant list visibility
   */
  toggleParticipantList(): void {
    this.showParticipantList = !this.showParticipantList;
  }

  /**
   * Switch to grid layout
   */
  switchToGridLayout(): void {
    this.currentLayout = 'grid';
  }

  /**
   * Switch to focus layout
   */
  switchToFocusLayout(): void {
    this.currentLayout = 'focus';
    if (this.patientId) {
      this.focusedUserId = this.patientId;
    }
  }

  /**
   * Send chat message
   */
  sendMessage(): void {
    if (!this.newMessage.trim()) return;

    const message = {
      id: this.chatMessages.length + 1,
      sender: 'doctor',
      senderName: 'You',
      message: this.newMessage,
      timestamp: new Date()
    };

    this.chatMessages.push(message);
    this.newMessage = '';
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Handle document upload
   */
  onDocumentUpload(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let file of files) {
      const newDoc = {
        id: this.patientDocuments.length + 1,
        name: file.name,
        type: this.getFileType(file.name),
        uploadedDate: this.formatDate(new Date()),
        size: this.formatFileSize(file.size)
      };
      this.patientDocuments.push(newDoc);
    }
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Get file type from filename
   */
  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'file';
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  }

  /**
   * Format date
   */
  private formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()] + ' ' + date.getDate();
  }

  /**
   * Check if vital is abnormal
   */
  isVitalAbnormal(vital: string, value: number): boolean {
    const abnormalRanges: any = {
      heartRate: { min: 60, max: 100 },
      temperature: { min: 98.6, max: 99.0 },
      weight: { min: 0, max: 500 }
    };

    if (abnormalRanges[vital]) {
      const range = abnormalRanges[vital];
      return value < range.min || value > range.max;
    }
    return false;
  }

  /**
   * Handle media errors
   */
  handleMediaError(error: any): void {
    console.error('Media error:', error);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
