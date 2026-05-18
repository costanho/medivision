import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService, Message } from '../../services/message.service';
import { DoctorService, Doctor } from '../../services/doctor.service';
import { PatientService } from '../../services/patient.service';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../services/messaging/websocket.service';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// WebSocket Real-Time Messaging Integration

interface Conversation {
  id: number;
  name?: string;
  email?: string;
  userEmail?: string;
  specialization?: string;
  isOnline?: boolean;
  unreadCount?: number;
  lastSeen?: string;
  hasAppointment?: boolean;
  appointmentStatus?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'PENDING';
  appointmentDate?: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MessagesComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  messages: Message[] = [];
  currentMessage = '';
  loading = true;
  error = '';
  successMessage = '';
  currentPage = 0;
  pageSize = 100;
  totalPages = 0;
  selectedConversation: Conversation | null = null;
  conversationMessages: Message[] = [];
  showConversationList = true;
  userRole: string = '';
  pageTitle = '';
  pageSubtitle = '';

  // Search and filter properties
  searchQuery = '';
  filterByAppointment = false;
  filterByStatus: 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' = 'ALL';

  // Appointment data
  appointments: Appointment[] = [];
  appointmentContactMap = new Map<number, Appointment[]>();

  // Call state
  callInProgress = false;
  currentCallParticipant = '';
  callType: 'video' | 'audio' = 'video';

  // Presence polling
  private presencePollingTimer: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private messageService: MessageService,
    private doctorService: DoctorService,
    private patientService: PatientService,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private webSocketService: WebSocketService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('[MessagesComponent] Component initializing...');
    this.detectUserRole();
    console.log('[MessagesComponent] User role detected:', this.userRole);
    this.loadAppointments();
    this.loadUserMessages();
    this.initializeWebSocket();
    this.subscribeToWebSocketMessages();
    this.startPresencePolling();
    console.log('[MessagesComponent] Component initialized successfully');
  }

  private initializeWebSocket(): void {
    const currentUser = this.authService.getCurrentUser();
    const token = localStorage.getItem('access_token') || '';

    if (currentUser && token) {
      console.log('[MessagesComponent] Initializing WebSocket connection...');
      this.webSocketService.connect(token, currentUser.id);

      // Monitor connection status
      this.webSocketService.connectionStatus$
        .pipe(takeUntil(this.destroy$))
        .subscribe(status => {
          console.log('[MessagesComponent] WebSocket status:', status);
          if (status.error) {
            console.error('[MessagesComponent] WebSocket error:', status.error);
            this.error = `Connection error: ${status.error}`;
          }
        });
    }
  }

  private subscribeToWebSocketMessages(): void {
    // Subscribe to chat messages from WebSocket
    this.webSocketService.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('[MessagesComponent] Message received from WebSocket:', message);

        // Add received message to conversation if it's from the selected conversation
        if (this.selectedConversation &&
            (message.senderId === this.selectedConversation.id ||
             message.recipientId === this.selectedConversation.id)) {

          const newMessage: Message = {
            id: message.messageId || Date.now(),
            content: message.content,
            createdAt: message.timestamp?.toString() || new Date().toISOString(),
            senderId: message.senderId,
            senderName: message.senderName,
            receiverId: message.recipientId,
            receiverName: this.selectedConversation?.name || 'Recipient',
            userEmail: this.authService.getCurrentUser()?.email || '',
            isRead: false
          };

          // Add to conversation
          this.conversationMessages.push(newMessage);
          console.log('[MessagesComponent] Message added to conversation view');
        }
      });

    // Subscribe to typing indicators
    this.webSocketService.typingIndicators$
      .pipe(takeUntil(this.destroy$))
      .subscribe(indicator => {
        console.log('[MessagesComponent] Typing indicator:', indicator);
        // Handle typing indicator display (optional)
      });

    // Subscribe to presence updates
    this.webSocketService.presenceUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(presence => {
        console.log('[MessagesComponent] Presence update:', presence);
        // Update online status for conversations
        const conversation = this.conversations.find(c => c.id === presence.userId);
        if (conversation) {
          conversation.isOnline = presence.status === 'online';
        }
      });
  }

  private detectUserRole(): void {
    console.log('[MessagesComponent.detectUserRole] Starting user role detection...');
    const currentUser = this.authService.getCurrentUser();
    console.log('[MessagesComponent.detectUserRole] Current user:', currentUser);

    // Check if user is doctor based on route or user data
    const isDoctor = this.route.snapshot.url.some(segment => segment.path.includes('doctor'));
    console.log('[MessagesComponent.detectUserRole] Is doctor (from route):', isDoctor);

    if (isDoctor || currentUser?.role === 'doctor' || currentUser?.role === 'DOCTOR') {
      this.userRole = 'doctor';
      this.pageTitle = 'Messages';
      this.pageSubtitle = 'Chat with your patients';
      console.log('[MessagesComponent.detectUserRole] User is doctor, loading patients...');
      this.loadPatients();
    } else {
      this.userRole = 'patient';
      this.pageTitle = 'Messages';
      this.pageSubtitle = 'Chat with your doctors';
      console.log('[MessagesComponent.detectUserRole] User is patient, loading doctors...');
      this.loadDoctors();
    }
  }

  private loadDoctors(): void {
    console.log('[MessagesComponent.loadDoctors] Starting to load doctors from backend...');
    this.loading = true;
    this.error = '';
    // Try to load with a larger page size to get all doctors
    this.doctorService.getDoctors(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[MessagesComponent.loadDoctors] ✓ Doctors loaded from backend:', response);
          const doctors = response.content || [];
          console.log('[MessagesComponent.loadDoctors] ✓ Received', doctors.length, 'doctors');

          if (!doctors || doctors.length === 0) {
            console.warn('[MessagesComponent.loadDoctors] ⚠ No doctors returned from API');
          }

          this.conversations = doctors.map(doctor => ({
            id: doctor.id,
            name: doctor.name || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.email,
            email: doctor.email || doctor.userEmail,
            userEmail: doctor.email || doctor.userEmail,
            specialization: doctor.specialization,
            isOnline: doctor.isOnline || false,
            unreadCount: (doctor as any)?.unreadCount || 0,
            lastSeen: doctor.lastSeenAt || doctor.lastSeen || doctor.updatedAt
          }));
          this.totalPages = response.totalPages || 1;
          console.log('[MessagesComponent.loadDoctors] ✓ Loaded', this.conversations.length, 'doctors from backend');
          // Fetch online status from presence API
          this.fetchPresenceStatus(this.conversations);
          this.applyFilters(); // Apply filters after loading
          this.loading = false;
        },
        error: (err) => {
          console.error('[MessagesComponent.loadDoctors] ✗ Failed to load doctors from database:', err);
          console.error('[MessagesComponent.loadDoctors] Error status:', err.status);
          console.error('[MessagesComponent.loadDoctors] Error message:', err.message);
          console.error('[MessagesComponent.loadDoctors] Full error:', err);

          let errorMsg = 'Unable to load doctors from database. ';
          if (err.status === 0) {
            errorMsg += 'Backend connection failed. Make sure the server is running at http://localhost:8081';
          } else if (err.status === 401) {
            errorMsg += 'Authentication failed. Please log in again.';
          } else if (err.status === 403) {
            errorMsg += 'Access denied. You do not have permission to view doctors.';
          } else {
            errorMsg += (err.message || 'Please try again.');
          }

          this.error = errorMsg;
          this.conversations = [];
          this.filteredConversations = [];
          this.loading = false;
        }
      });
  }

  private loadPatients(): void {
    console.log('[MessagesComponent.loadPatients] Starting to load patients from backend...');
    this.loading = true;
    this.error = '';
    // Load all patients from backend with large page size
    this.patientService.getPatients(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[MessagesComponent.loadPatients] ✓ Patients loaded from backend:', response);
          const patients = response.content || [];
          console.log('[MessagesComponent.loadPatients] ✓ Received', patients.length, 'patients');

          if (!patients || patients.length === 0) {
            console.warn('[MessagesComponent.loadPatients] ⚠ No patients returned from API');
          }

          this.conversations = patients.map(patient => ({
            id: patient.id,
            name: patient.fullName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.email,
            email: patient.email || patient.userEmail,
            userEmail: patient.email || patient.userEmail,
            isOnline: patient.isOnline || false,
            unreadCount: 0,
            lastSeen: patient.updatedAt || patient.createdAt
          }));
          this.totalPages = response.totalPages || 1;
          console.log('[MessagesComponent.loadPatients] ✓ Loaded', this.conversations.length, 'patients from backend');
          // Fetch online status from presence API
          this.fetchPresenceStatus(this.conversations);
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          console.error('[MessagesComponent.loadPatients] ✗ Failed to load patients from backend:', err);
          console.error('[MessagesComponent.loadPatients] Error status:', err.status);
          console.error('[MessagesComponent.loadPatients] Error message:', err.message);

          let errorMsg = 'Unable to load patients from backend. ';
          if (err.status === 0) {
            errorMsg += 'Backend connection failed. Make sure the server is running at http://localhost:8081';
          } else if (err.status === 401) {
            errorMsg += 'Authentication failed. Please log in again.';
          } else if (err.status === 403) {
            errorMsg += 'Access denied. You do not have permission to view patients.';
          } else {
            errorMsg += (err.message || 'Please try again.');
          }

          this.error = errorMsg;
          this.conversations = [];
          this.filteredConversations = [];
          this.loading = false;
        }
      });
  }

  private loadAppointments(): void {
    this.appointmentService.getAppointments(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.appointments = response.content || [];
          this.buildAppointmentContactMap();
          this.enrichConversationsWithAppointments();
        },
        error: (err) => {
          console.error('Failed to load appointments:', err);
          // Continue loading contacts even if appointments fail
        }
      });
  }

  private buildAppointmentContactMap(): void {
    this.appointmentContactMap.clear();
    const currentUser = this.authService.getCurrentUser();

    this.appointments.forEach(appointment => {
      // For doctors: key is patientId
      // For patients: key is doctorId
      const contactId = this.userRole === 'doctor' ? appointment.patientId : appointment.doctorId;

      if (!this.appointmentContactMap.has(contactId)) {
        this.appointmentContactMap.set(contactId, []);
      }

      const appointments = this.appointmentContactMap.get(contactId) || [];
      appointments.push(appointment);
      this.appointmentContactMap.set(contactId, appointments);
    });
  }

  private enrichConversationsWithAppointments(): void {
    this.conversations = this.conversations.map(conversation => ({
      ...conversation,
      hasAppointment: this.appointmentContactMap.has(conversation.id),
      appointmentStatus: this.getLatestAppointmentStatus(conversation.id),
      appointmentDate: this.getLatestAppointmentDate(conversation.id)
    }));
    this.applyFilters();
  }

  private getLatestAppointmentStatus(contactId: number): 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'PENDING' | undefined {
    const appointments = this.appointmentContactMap.get(contactId) || [];
    if (appointments.length === 0) return undefined;
    // Return the status of the most recent appointment
    return appointments[0]?.status;
  }

  private getLatestAppointmentDate(contactId: number): string | undefined {
    const appointments = this.appointmentContactMap.get(contactId) || [];
    if (appointments.length === 0) return undefined;
    return appointments[0]?.appointmentDate;
  }

  /**
   * Fetch real-time online status from presence API
   * Called after loading doctors/patients to get current online status
   */
  private fetchPresenceStatus(conversations: Conversation[]): void {
    if (!conversations || conversations.length === 0) return;

    // Get all emails and determine endpoint
    const emails = conversations
      .filter(c => c.userEmail)
      .map(c => c.userEmail!)
      .join(',');

    if (!emails) return;

    const endpoint = this.userRole === 'doctor'
      ? `/api/presence/patients/online?patientEmails=${encodeURIComponent(emails)}`
      : `/api/presence/doctors/online?doctorEmails=${encodeURIComponent(emails)}`;

    console.log('[MessagesComponent.fetchPresenceStatus] Fetching presence for', conversations.length, 'contacts');

    this.http.get<{ [email: string]: boolean }>(endpoint)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (presenceMap) => {
          console.log('[MessagesComponent.fetchPresenceStatus] Presence status received:', presenceMap);
          // Update conversations with online status
          this.conversations = this.conversations.map(conv => ({
            ...conv,
            isOnline: presenceMap[conv.userEmail!] || false
          }));
          this.applyFilters(); // Refresh filtered list with updated status
        },
        error: (err) => {
          console.error('[MessagesComponent.fetchPresenceStatus] Failed to fetch presence status:', err);
          // Continue without presence data if fetch fails
        }
      });
  }

  applyFilters(): void {
    let filtered = this.conversations;

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        (conv.name && conv.name.toLowerCase().includes(query)) ||
        (conv.email && conv.email.toLowerCase().includes(query)) ||
        (conv.specialization && conv.specialization.toLowerCase().includes(query))
      );
    }

    // Filter by appointment status
    if (this.filterByAppointment) {
      filtered = filtered.filter(conv => conv.hasAppointment === true);
    }

    // Filter by appointment status type
    if (this.filterByStatus !== 'ALL') {
      filtered = filtered.filter(conv => conv.appointmentStatus === this.filterByStatus);
    }

    this.filteredConversations = filtered;
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

  private loadUserMessages(): void {
    this.messageService.getMessages(0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('User messages loaded from database:', response);
          this.messages = response.content || [];
          console.log('Total messages from database:', this.messages.length);
        },
        error: (err) => {
          console.error('Failed to load messages from database:', err);
          this.messages = [];
        }
      });
  }

  private loadMessages(): void {
    this.loading = true;
    this.error = '';
    this.messageService.getMessages(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messages = response.content || [];
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load messages:', err);
          this.error = 'Failed to load messages. Please try again.';
          this.loading = false;
        }
      });
  }

  selectConversation(conversation: Conversation): void {
    this.showConversationList = false;
    this.selectedConversation = conversation;
    this.loadConversation(conversation.id);
  }

  private loadConversation(personId: number): void {
    this.loading = true;
    console.log('[loadConversation] Loading conversation for personId:', personId);
    this.messageService.getConversation(personId, 0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.conversationMessages = response.content || [];
          console.log('[loadConversation] ✓ Loaded', this.conversationMessages.length, 'messages');

          // Log first few messages to debug
          this.conversationMessages.slice(0, 3).forEach((msg, idx) => {
            console.log(`[loadConversation] Message ${idx}:`, {
              id: msg.id,
              senderEmail: msg['senderEmail'],
              userEmail: msg.userEmail,
              content: msg.content?.substring(0, 40),
              createdAt: msg.createdAt
            });
          });

          this.loading = false;
        },
        error: (err) => {
          console.error('[loadConversation] Failed to load conversation:', err);
          this.error = 'Failed to load conversation.';
          this.loading = false;
        }
      });
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || !this.selectedConversation) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.error = 'User not authenticated';
      return;
    }

    // Check if WebSocket is connected
    if (!this.webSocketService.isConnected()) {
      console.warn('[MessagesComponent] WebSocket not connected, falling back to HTTP');
      this.sendMessageViaHTTP();
      return;
    }

    console.log('[MessagesComponent] Sending message via WebSocket...');

    // Send message via WebSocket (immediately)
    const conversationId = this.selectedConversation.id;
    const recipientId = this.selectedConversation.id;
    const senderId = currentUser.id;
    const senderName = currentUser.fullName || currentUser.name || 'Patient';
    const content = this.currentMessage;

    // Send via WebSocket (immediately)
    this.webSocketService.sendMessage(
      conversationId,
      recipientId,
      content,
      senderId,
      senderName
    );

    // Add message to local UI immediately (optimistic update)
    const localMessage: Message = {
      id: Date.now(),
      content: content,
      createdAt: new Date().toISOString(),
      senderId: senderId,
      senderName: senderName,
      receiverId: recipientId,
      receiverName: this.selectedConversation?.name || 'Recipient',
      userEmail: currentUser.email || '',    // Use userEmail for consistency
      isRead: false
    };

    // Set senderEmail via bracket notation to avoid TS strict mode issues
    (localMessage as any).senderEmail = currentUser.email || '';

    console.log('[sendMessage] Adding local message to UI:', {
      senderEmail: (localMessage as any).senderEmail,
      userEmail: localMessage.userEmail,
      content: localMessage.content?.substring(0, 40),
      currentUserEmail: currentUser.email
    });

    this.conversationMessages.push(localMessage);
    this.currentMessage = '';
    this.successMessage = 'Message sent!';

    setTimeout(() => {
      this.successMessage = '';
    }, 3000);

    // Also persist to backend via HTTP for database storage
    const messageData: any = {
      receiverId: this.selectedConversation.id,
      recipientEmail: this.selectedConversation.userEmail || this.selectedConversation.email,
      recipientName: this.selectedConversation.name,
      senderEmail: currentUser.email,
      senderName: senderName,
      content: content
    };

    this.messageService.sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[MessagesComponent] Message persisted to database:', response);
          // Update the local message with server ID if it's different
          if (response.id) {
            const idx = this.conversationMessages.findIndex(m => m.content === content);
            if (idx !== -1) {
              this.conversationMessages[idx].id = response.id;
            }
          }
        },
        error: (err) => {
          console.error('[MessagesComponent] Failed to persist message:', err);
          // Message was sent via WebSocket, but couldn't persist
          // Keep the message in UI but warn user
          this.error = 'Message sent but could not persist to database';
        }
      });
  }

  private sendMessageViaHTTP(): void {
    if (!this.currentMessage.trim() || !this.selectedConversation) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const messageData: any = {
      receiverId: this.selectedConversation.id,
      recipientEmail: this.selectedConversation.userEmail || this.selectedConversation.email,
      recipientName: this.selectedConversation.name,
      senderEmail: currentUser?.email,
      senderName: currentUser?.fullName || currentUser?.name || 'Patient',
      content: this.currentMessage
    };

    this.messageService.sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.conversationMessages.push(response);
          this.currentMessage = '';
          this.successMessage = 'Message sent!';
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (err) => {
          console.error('Failed to send message:', err);
          this.error = 'Failed to send message. Please try again.';
        }
      });
  }

  backToConversationList(): void {
    this.showConversationList = true;
    this.selectedConversation = null;
    this.conversationMessages = [];
    this.currentMessage = '';
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadConversations();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadConversations();
    }
  }

  private loadConversations(): void {
    if (this.userRole === 'doctor') {
      this.loadPatients();
    } else {
      this.loadDoctors();
    }
  }

  // Video call handler
  onVideoCallStart(): void {
    if (!this.selectedConversation) {
      this.error = 'No conversation selected';
      return;
    }
    this.callInProgress = true;
    this.callType = 'video';
    this.currentCallParticipant = this.selectedConversation.name || 'Doctor';
    console.log('Starting video call with:', this.currentCallParticipant);
  }

  // Audio call handler
  onAudioCallStart(): void {
    if (!this.selectedConversation) {
      this.error = 'No conversation selected';
      return;
    }
    this.callInProgress = true;
    this.callType = 'audio';
    this.currentCallParticipant = this.selectedConversation.name || 'Doctor';
    console.log('Starting audio call with:', this.currentCallParticipant);
  }

  // End call handler
  onCallEnd(): void {
    this.callInProgress = false;
    this.callType = 'video';
    this.currentCallParticipant = '';
    console.log('Call ended');
  }

  // Clear error message
  clearError(): void {
    this.error = '';
  }

  // Helper method to determine if a message was sent by the current user
  isSentByCurrentUser(message: Message): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !message) {
      return false;
    }

    // Get sender email - try multiple possible field names
    const messageSenderEmail = (message as any)['senderEmail'] || message.userEmail || (message as any)['senderId'];
    const currentUserEmail = currentUser.email?.toLowerCase().trim() || '';

    // Normalize the sender email for comparison
    const normalizedSenderEmail = typeof messageSenderEmail === 'string'
      ? messageSenderEmail.toLowerCase().trim()
      : '';

    const isSent = normalizedSenderEmail === currentUserEmail && currentUserEmail !== '';

    // Log for debugging (only if mismatch)
    if (!isSent && normalizedSenderEmail && currentUserEmail) {
      console.log('[isSentByCurrentUser] Message NOT from current user:', {
        currentUserEmail,
        messageSenderEmail: normalizedSenderEmail,
        content: message.content?.substring(0, 30)
      });
    }

    return isSent;
  }

  // Helper method to check if current user is a doctor
  private isCurrentUserDoctor(): boolean {
    // First check userRole property
    if (this.userRole === 'doctor' || this.userRole === 'DOCTOR') {
      console.log('[isCurrentUserDoctor] Detected doctor via userRole property:', this.userRole);
      return true;
    }
    // Fallback to route detection
    const isDoctoRoute = this.route.snapshot.url.some(segment => segment.path.includes('doctor'));
    if (isDoctoRoute) {
      console.log('[isCurrentUserDoctor] Detected doctor via route');
      return true;
    }
    // Fallback to user data
    const currentUser = this.authService.getCurrentUser();
    const isDoctor = currentUser?.role === 'doctor' || currentUser?.role === 'DOCTOR';
    console.log('[isCurrentUserDoctor] User role from AuthService:', currentUser?.role, 'isDoctor:', isDoctor);
    return isDoctor;
  }

  // Helper method to determine CSS class for message alignment
  // SIMPLE RULE: Messages sent BY current user go on RIGHT (sent class)
  // Messages sent TO current user go on LEFT (received class)
  // This applies to BOTH patients and doctors
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
    console.log('[MessagesComponent] Destroying component, disconnecting WebSocket...');
    this.stopPresencePolling();
    this.webSocketService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Start polling presence status every 20 seconds
   * Keeps the UI updated with real-time online/offline status
   */
  private startPresencePolling(): void {
    console.log('[MessagesComponent] Starting presence polling...');
    this.presencePollingTimer = setInterval(() => {
      if (this.conversations.length > 0) {
        this.fetchPresenceStatus(this.conversations);
      }
    }, 20000); // Poll every 20 seconds
  }

  /**
   * Stop presence polling to prevent memory leaks
   */
  private stopPresencePolling(): void {
    if (this.presencePollingTimer) {
      clearInterval(this.presencePollingTimer);
      this.presencePollingTimer = null;
      console.log('[MessagesComponent] Presence polling stopped');
    }
  }
}
