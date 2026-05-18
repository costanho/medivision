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
import { DoctorService } from '../../../../services/doctor.service';
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
 * PatientCallScreenComponent
 * Patient's simplified consultation interface
 * Shows doctor prominently, other participants secondary
 * Limited controls compared to doctor view
 */

@Component({
  selector: 'app-patient-call-screen',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VideoContainerComponent,
    CallToolbarComponent,
    ParticipantListComponent,
    IncomingCallDialogComponent
  ],
  providers: [DoctorService, CallService],
  templateUrl: './patient-call-screen.component.html',
  styleUrls: ['./patient-call-screen.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientCallScreenComponent implements OnInit, OnDestroy {
  @Input() doctorId: string = '';
  @Input() consultationId: string = '';

  // Call state
  isCallActive = false;
  isAudioEnabled = true;
  isVideoEnabled = true;
  isScreenSharing = false;
  callDuration = 0;
  callStartTime: Date | null = null;
  callSessionId: string | null = null;
  callError: string = '';

  // Media streams
  localStream: MediaStream | null = null;
  remoteStreams = new Map<string, MediaStream>();

  // Call participants and doctor info
  selectedDoctor: any = null;
  participants: any[] = [];
  incomingCallInfo: any = null;
  showIncomingDialog = false;

  // Consultation details
  consultationReason: string = '';
  consultationNotes: string = '';
  symptomsList: string[] = [];

  // Available doctors and admins
  availableDoctors: any[] = [];
  isLoadingDoctors = true;
  doctorLoadError = '';

  availableAdmins: any[] = [
    { id: 'a1', name: 'Admin Support', role: 'Administrator', avatar: '👤' }
  ];

  // Search functionality
  searchQuery: string = '';
  filteredDoctors: any[] = [];
  filteredAdmins: any[] = [];
  noResultsFound = false;

  // UI state
  currentLayout: 'grid' | 'focus' = 'focus';
  focusedUserId: string | null = null;
  showParticipantList = true;
  showDoctorSelector = false;
  callPhase: 'select-doctor' | 'waiting' | 'in-call' | 'ended' = 'select-doctor';

  private destroy$ = new Subject<void>();

  constructor(
    private doctorService: DoctorService,
    private apiService: ApiService,
    private callService: CallService,
    private changeDetectorRef: ChangeDetectorRef,
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
    if (this.doctorId) {
      this.focusedUserId = this.doctorId;
    }

    // Connect WebSocket for receiving incoming calls
    this.connectWebSocket();

    // Listen for incoming calls from WebSocket
    this.webSocketService.callEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        console.log('[PatientCallScreen] WebSocket call event received:', event);
        if (event.eventType === 'call_incoming') {
          this.handleIncomingCallWebSocket(event);
        } else {
          this.handleCallStateChange(event);
        }
        this.changeDetectorRef.markForCheck();
      });

    // Listen for incoming calls from CallService (legacy)
    this.callService.incomingCall$
      .pipe(takeUntil(this.destroy$))
      .subscribe((incomingCall: any) => {
        if (incomingCall) {
          this.handleIncomingCall(incomingCall);
        }
      });

    // Listen for call status changes
    this.callService.callStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: string) => {
        console.log('Call status changed:', status);
        this.changeDetectorRef.markForCheck();
      });
  }

  /**
   * Load doctors from database
   */
  private loadDoctors(): void {
    this.isLoadingDoctors = true;
    this.doctorLoadError = '';

    this.doctorService
      .getDoctors(0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.availableDoctors = (response.content || []).map((doctor: any) => ({
            id: doctor.id,
            name: doctor.name || 'Unknown Doctor',
            specialty: doctor.specialization || 'General Medicine',
            consultationFee: doctor.consultationFee || 0,
            avatar: this.getDoctorInitials(doctor.name || 'Doctor')
          }));
          // Initialize filtered list with all doctors
          this.filteredDoctors = this.availableDoctors;
          this.filteredAdmins = this.availableAdmins;
          this.isLoadingDoctors = false;
          this.changeDetectorRef.markForCheck();
        },
        error: (error: any) => {
          console.error('Error loading doctors:', error);
          this.doctorLoadError = 'Failed to load doctors. Please try again.';
          this.isLoadingDoctors = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Generate initials avatar from doctor name
   */
  private getDoctorInitials(name: string): string {
    const parts = name.split(' ').filter(p => p);
    return parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
  }

  /**
   * Connect to WebSocket for receiving incoming calls
   */
  private connectWebSocket(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.webSocketService.connect(
        this.storageService.getAccessToken() || '',
        currentUser.id
      );
    }
  }

  /**
   * Handle incoming call from WebSocket
   */
  private handleIncomingCallWebSocket(event: any): void {
    console.log('[PatientCallScreen] Incoming call from doctor:', event.callerId, event.callerName);

    // Set incoming call info and show dialog
    this.incomingCallInfo = {
      callerId: event.callerId,
      callerName: event.callerName || 'Doctor',
      sessionId: event.sessionId,
      timestamp: new Date()
    };

    this.showIncomingDialog = true;
    this.callPhase = 'waiting';
  }

  /**
   * Handle call state changes (accepted, rejected, ended)
   */
  private handleCallStateChange(event: any): void {
    switch (event.eventType) {
      case 'call_ended':
        console.log('[PatientCallScreen] Call ended by doctor');
        this.callPhase = 'ended';
        this.isCallActive = false;
        this.showIncomingDialog = false;
        break;

      default:
        console.log('[PatientCallScreen] Unknown call event:', event.eventType);
    }
  }

  /**
   * Search doctors and admins by name or specialty
   */
  onSearchChange(query: string): void {
    this.searchQuery = query.toLowerCase().trim();

    if (!this.searchQuery) {
      // Reset to show all if search is empty
      this.filteredDoctors = this.availableDoctors;
      this.filteredAdmins = this.availableAdmins;
      this.noResultsFound = false;
      this.changeDetectorRef.markForCheck();
      return;
    }

    // Filter doctors by name or specialty
    this.filteredDoctors = this.availableDoctors.filter((doctor: any) =>
      doctor.name.toLowerCase().includes(this.searchQuery) ||
      doctor.specialty.toLowerCase().includes(this.searchQuery)
    );

    // Filter admins by name or role
    this.filteredAdmins = this.availableAdmins.filter((admin: any) =>
      admin.name.toLowerCase().includes(this.searchQuery) ||
      admin.role.toLowerCase().includes(this.searchQuery)
    );

    // Check if no results found
    this.noResultsFound = this.filteredDoctors.length === 0 && this.filteredAdmins.length === 0;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Clear search and reset to show all
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filteredDoctors = this.availableDoctors;
    this.filteredAdmins = this.availableAdmins;
    this.noResultsFound = false;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Handle audio toggle (patient can mute themselves)
   */
  onToggleAudio(): void {
    this.isAudioEnabled = !this.isAudioEnabled;
  }

  /**
   * Handle video toggle (patient can disable video)
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
   * Select a doctor and initiate call
   */
  selectDoctor(doctor: any): void {
    this.selectedDoctor = doctor;
    this.callPhase = 'waiting';
    this.isCallActive = true;
    this.callStartTime = new Date();
  }

  /**
   * Select an admin and initiate call
   */
  selectAdmin(admin: any): void {
    this.selectedDoctor = admin;
    this.callPhase = 'waiting';
    this.isCallActive = true;
    this.callStartTime = new Date();
  }

  /**
   * Add symptom to list
   */
  addSymptom(symptom: string): void {
    if (symptom.trim() && !this.symptomsList.includes(symptom)) {
      this.symptomsList.push(symptom);
    }
  }

  /**
   * Remove symptom from list
   */
  removeSymptom(symptom: string): void {
    this.symptomsList = this.symptomsList.filter(s => s !== symptom);
  }

  /**
   * Handle end call
   */
  onEndCall(): void {
    if (confirm('Are you sure you want to end the consultation?')) {
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
              this.completeCallEnding();
            }
          });
      } else {
        this.completeCallEnding();
      }
    }
  }

  /**
   * Complete call ending and reset state
   */
  private completeCallEnding(): void {
    this.isCallActive = false;
    this.callPhase = 'select-doctor';
    this.selectedDoctor = null;
    this.callSessionId = null;
    this.consultationNotes = '';
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Handle incoming call notification
   */
  private handleIncomingCall(callData: any): void {
    console.log('Incoming call received:', callData);

    this.incomingCallInfo = {
      sessionId: callData.sessionId,
      callerId: callData.callerId,
      callerName: callData.callerName || 'Doctor',
      callerRole: 'Doctor',
      callerAvatar: this.getDoctorInitials(callData.callerName || 'Doctor')
    };

    // Fetch doctor info if available
    if (callData.callerId) {
      this.fetchDoctorInfo(callData.callerId);
    }

    this.showIncomingDialog = true;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Fetch doctor information from backend
   */
  private fetchDoctorInfo(doctorId: number): void {
    this.apiService.get<any>(`/doctors/${doctorId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doctor: any) => {
          this.selectedDoctor = {
            id: doctor.id,
            name: doctor.firstName && doctor.lastName ? `${doctor.firstName} ${doctor.lastName}` : doctor.email,
            email: doctor.email,
            specialty: doctor.specialization || 'General Practitioner',
            avatar: this.getDoctorInitials(doctor.firstName && doctor.lastName ? `${doctor.firstName} ${doctor.lastName}` : doctor.email)
          };
          this.changeDetectorRef.markForCheck();
        },
        error: (error: any) => {
          console.warn('Failed to load doctor info:', error);
        }
      });
  }

  /**
   * Handle incoming call accept
   */
  onAcceptIncomingCall(): void {
    if (!this.incomingCallInfo?.sessionId) {
      this.callError = 'Invalid call session';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.callService.acceptCall(this.incomingCallInfo.sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Call accepted:', response);
          this.callSessionId = this.incomingCallInfo.sessionId;
          this.callPhase = 'in-call';
          this.isCallActive = true;
          this.callStartTime = new Date();
          this.showIncomingDialog = false;
          this.callService.setActiveCall({ sessionId: this.callSessionId, doctorInfo: this.selectedDoctor });
          this.changeDetectorRef.markForCheck();
        },
        error: (error: any) => {
          console.error('Error accepting call:', error);
          this.callError = error.error?.message || 'Failed to accept call';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Handle incoming call reject
   */
  onRejectIncomingCall(): void {
    if (!this.incomingCallInfo?.sessionId) {
      this.showIncomingDialog = false;
      this.incomingCallInfo = null;
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.callService.rejectCall(this.incomingCallInfo.sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Call rejected');
          this.showIncomingDialog = false;
          this.incomingCallInfo = null;
          this.selectedDoctor = null;
          this.changeDetectorRef.markForCheck();
        },
        error: (error: any) => {
          console.error('Error rejecting call:', error);
          this.showIncomingDialog = false;
          this.incomingCallInfo = null;
          this.changeDetectorRef.markForCheck();
        }
      });
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
    if (this.doctorId) {
      this.focusedUserId = this.doctorId;
    }
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
