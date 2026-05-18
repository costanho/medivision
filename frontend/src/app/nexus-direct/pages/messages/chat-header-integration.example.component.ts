/**
 * Chat Header Integration Example Component
 *
 * This example shows how to integrate the ChatHeaderComponent into your
 * messaging page with proper data flow, event handling, and styling.
 *
 * Features Demonstrated:
 * - Loading participant data from service
 * - Handling back navigation
 * - Managing call requests
 * - Real-time status updates
 * - Responsive layout
 * - Error handling
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Services
import { DoctorService } from '../../services/doctor.service';
import { CallService } from '../../services/call.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConnectionManagerService } from '../../../services/messaging/connection-manager.service';
import { PresenceService } from '../../../services/messaging/presence.service';
import { TypingIndicatorService } from '../../../services/messaging/typing-indicator.service';

// Components
import { ChatHeaderComponent } from '../../../shared/components/chat-header/chat-header.component';
import { MessageListComponent } from '../../../shared/components/message-list/message-list.component';
import { MessageInputComponent } from '../../../shared/components/message-input/message-input.component';

// Types
import { ChatParticipant, OnlineStatus } from '../../../shared/models/messaging.models';

/**
 * Example Integration Component
 *
 * This component demonstrates a complete messaging page with:
 * - Chat header with participant info
 * - Message list
 * - Message input
 * - Real-time status updates
 * - Call handling
 * - Connection loss handling
 * - Responsive design
 */
@Component({
  selector: 'app-messages-with-chat-header',
  standalone: true,
  imports: [
    CommonModule,
    ChatHeaderComponent,
    MessageListComponent,
    MessageInputComponent
  ],
  template: `
    <div class="messages-page" [class.offline]="!isConnected">
      <!-- Connection Loss Banner -->
      <div *ngIf="!isConnected" class="connection-banner">
        <span class="connection-icon">⚠️</span>
        <span class="connection-text">Disconnected - Messages will be sent when connection is restored</span>
        <button class="connection-retry-btn" (click)="retryConnection()">Retry</button>
      </div>

      <!-- Chat Header -->
      <app-chat-header
        *ngIf="selectedParticipant"
        [participant]="selectedParticipant"
        [showCallButtons]="isConnected"
        [showSubtitle]="true"
        (backClicked)="onBackToList()"
        (videoCallRequested)="onVideoCallRequested()"
        (audioCallRequested)="onAudioCallRequested()">
      </app-chat-header>

      <!-- Messages Container -->
      <div class="messages-container" *ngIf="selectedParticipant">
        <!-- Message List -->
        <app-message-list
          [messages]="messages"
          [currentUserId]="currentUserId"
          [participantName]="selectedParticipant.name"
          [isLoading]="isLoadingMessages"
          (loadMore)="loadMoreMessages()">
        </app-message-list>

        <!-- Message Input -->
        <app-message-input
          [disabled]="!isConnected"
          [placeholder]="isConnected ? 'Type a message...' : 'Messages will queue until connected'"
          (messageSent)="onMessageSent($event)"
          (typingStatusChanged)="onTypingStatusChanged($event)">
        </app-message-input>
      </div>

      <!-- Loading State -->
      <div *ngIf="!selectedParticipant" class="loading-state">
        <div class="spinner"></div>
        <p>Loading conversation...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-state">
        <p>{{ error }}</p>
        <button (click)="retryLoadParticipant()">Retry</button>
      </div>

      <!-- Call Modal (if call is active) -->
      <div *ngIf="activeCall" class="call-modal">
        <div class="call-container">
          <h3>{{ activeCall.type | uppercase }} Call with {{ selectedParticipant?.name }}</h3>
          <div class="call-status">Status: {{ activeCall.status }}</div>
          <div class="call-controls">
            <button class="call-btn end-call" (click)="onEndCall()">End Call</button>
            <button class="call-btn mute-btn" [class.muted]="activeCall.isMuted" (click)="toggleMute()">
              {{ activeCall.isMuted ? 'Unmute' : 'Mute' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .messages-page {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background-color: #f8fafc;
      transition: background-color 0.3s ease;

      &.offline {
        background-color: #fef2f2;
      }
    }

    /* Connection Banner */
    .connection-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background-color: #fed7aa;
      border-bottom: 2px solid #f59e0b;
      color: #92400e;
      font-size: 14px;
      animation: slideDown 0.3s ease-out;

      .connection-icon {
        font-size: 18px;
      }

      .connection-text {
        flex: 1;
      }

      .connection-retry-btn {
        padding: 6px 12px;
        background-color: #f59e0b;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: background-color 0.2s;

        &:hover {
          background-color: #d97706;
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }

    /* Messages Container */
    .messages-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;

      app-message-list {
        flex: 1;
        overflow-y: auto;
      }

      app-message-input {
        border-top: 1px solid #e2e8f0;
        padding: 12px;
      }
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 16px;
      color: #64748b;

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e2e8f0;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      p {
        font-size: 16px;
      }
    }

    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 16px;
      color: #dc2626;

      p {
        font-size: 16px;
      }

      button {
        padding: 8px 16px;
        background-color: #dc2626;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;

        &:hover {
          background-color: #b91c1c;
        }
      }
    }

    /* Call Modal */
    .call-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;

      .call-container {
        background-color: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);

        h3 {
          margin: 0 0 16px;
          color: #1f2937;
          font-size: 18px;
        }

        .call-status {
          padding: 12px;
          background-color: #f0fdf4;
          border-radius: 6px;
          color: #15803d;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .call-controls {
          display: flex;
          gap: 12px;
          justify-content: center;

          .call-btn {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;

            &.end-call {
              background-color: #dc2626;
              color: white;

              &:hover {
                background-color: #b91c1c;
              }
            }

            &.mute-btn {
              background-color: #3b82f6;
              color: white;

              &:hover {
                background-color: #2563eb;
              }

              &.muted {
                background-color: #f59e0b;

                &:hover {
                  background-color: #d97706;
                }
              }
            }
          }
        }
      }
    }

    /* Animations */
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .messages-page {
        height: calc(100vh - 56px); // Account for mobile header
      }

      .call-modal .call-container {
        max-width: 100%;
        margin: 16px;
      }
    }

    @media (max-width: 480px) {
      .connection-banner {
        padding: 8px 12px;
        font-size: 12px;
        gap: 8px;

        .connection-retry-btn {
          padding: 4px 8px;
          font-size: 11px;
        }
      }

      .call-modal .call-container {
        padding: 24px 16px;
      }
    }
  `]
})
export class ChatHeaderIntegrationExampleComponent implements OnInit, OnDestroy {
  // Data
  selectedParticipant: ChatParticipant | null = null;
  messages: any[] = [];
  currentUserId: string = '';

  // State
  isLoadingMessages = false;
  isConnected = true;
  error: string | null = null;
  activeCall: { type: 'video' | 'audio'; status: string; isMuted: boolean } | null = null;

  // Private
  private destroy$ = new Subject<void>();
  private participantId: number | null = null;

  constructor(
    private router: Router,
    private doctorService: DoctorService,
    private callService: CallService,
    private authService: AuthService,
    private connectionManager: ConnectionManagerService,
    private presenceService: PresenceService,
    private typingIndicator: TypingIndicatorService
  ) {
    this.setupConnectionMonitoring();
  }

  /**
   * Initialize component
   * - Load participant data
   * - Load message history
   * - Set up real-time subscriptions
   */
  ngOnInit(): void {
    this.getCurrentUserId();
    this.loadParticipantData();
    this.setupConnectionMonitoring();
  }

  /**
   * Get current user ID from auth service
   */
  private getCurrentUserId(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUserId = user.id.toString();
        }
      });
  }

  /**
   * Load participant data
   * In real application, this would come from route params or service
   */
  private loadParticipantData(): void {
    // Example: Get doctor ID from route params
    // In actual implementation:
    // this.route.params.subscribe(params => {
    //   this.participantId = params['doctorId'];
    //   this.loadDoctor(this.participantId);
    // });

    this.participantId = 1; // Example ID
    this.loadDoctor(this.participantId);
  }

  /**
   * Load doctor data from service
   */
  private loadDoctor(doctorId: number): void {
    this.doctorService.getDoctor(doctorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doctor) => {
          this.selectedParticipant = {
            id: doctor.id,
            name: doctor.name || 'Unknown Doctor',
            email: doctor.email || '',
            specialization: doctor.specialization || '',
            avatar: doctor.profileImage || `assets/avatars/default-${doctor.gender || 'male'}.svg`,
            lastSeen: doctor.lastSeen ? new Date(doctor.lastSeen) : new Date()
          };

          // Load messages for this participant
          this.loadMessages();

          // Setup real-time features
          this.setupPresenceUpdates();
          this.setupTypingIndicators();
        },
        error: (err) => {
          console.error('Error loading doctor:', err);
          this.error = 'Failed to load conversation. Please try again.';
        }
      });
  }

  /**
   * Load message history
   */
  private loadMessages(): void {
    if (!this.participantId) return;

    this.isLoadingMessages = true;

    this.doctorService.getMessages(this.participantId, 0, 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messages = response.content || [];
          this.isLoadingMessages = false;
        },
        error: (err) => {
          console.error('Error loading messages:', err);
          this.isLoadingMessages = false;
          this.error = 'Failed to load messages';
        }
      });
  }

  /**
   * Load more messages (pagination)
   */
  loadMoreMessages(): void {
    if (!this.participantId || this.isLoadingMessages) return;

    const pageNumber = Math.ceil(this.messages.length / 20);

    this.isLoadingMessages = true;

    this.doctorService.getMessages(this.participantId, pageNumber, 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messages = [...this.messages, ...(response.content || [])];
          this.isLoadingMessages = false;
        },
        error: (err) => {
          console.error('Error loading more messages:', err);
          this.isLoadingMessages = false;
        }
      });
  }

  /**
   * Setup presence monitoring for real-time status updates
   */
  private setupPresenceUpdates(): void {
    if (!this.selectedParticipant) return;

    // Monitor online status
    this.presenceService.isUserOnline$(this.selectedParticipant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOnline => {
        if (this.selectedParticipant) {
          // Chat header will handle this automatically
          // This is just for logging/additional logic
          console.log(`Doctor ${this.selectedParticipant.name} is ${isOnline ? 'online' : 'offline'}`);
        }
      });

    // Monitor last seen time
    this.presenceService.onlineIndicator$(this.selectedParticipant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(indicator => {
        if (this.selectedParticipant) {
          // Update last seen display
          console.log('Last seen:', indicator);
        }
      });
  }

  /**
   * Setup typing indicator monitoring
   */
  private setupTypingIndicators(): void {
    if (!this.selectedParticipant) return;

    this.typingIndicator.isUserTyping$(this.selectedParticipant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isTyping => {
        // Chat header will handle display automatically
        // This is for additional UI updates if needed
        console.log(`Doctor is ${isTyping ? 'typing' : 'not typing'}`);
      });
  }

  /**
   * Setup connection state monitoring
   */
  private setupConnectionMonitoring(): void {
    this.connectionManager.connectionState
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isConnected = state === 'CONNECTED';
        console.log('Connection state:', state);

        // Automatically retry sending queued messages when reconnected
        if (this.isConnected) {
          this.processQueuedMessages();
        }
      });
  }

  /**
   * Process queued messages when reconnected
   */
  private processQueuedMessages(): void {
    // In real implementation, this would be handled by the MessageQueueService
    // This is just an example of what you might do
    console.log('Processing queued messages...');
  }

  /**
   * Handle back button click
   * Navigate to message list
   */
  onBackToList(): void {
    this.router.navigate(['/patient/nexus-direct/messages']);
  }

  /**
   * Handle message sent
   * Queue message if offline, send if online
   */
  onMessageSent(message: string): void {
    if (!this.selectedParticipant || !message.trim()) return;

    const newMessage = {
      id: Date.now(),
      senderId: this.currentUserId,
      recipientId: this.selectedParticipant.id,
      content: message,
      timestamp: new Date(),
      isRead: false,
      queued: !this.isConnected // Mark as queued if offline
    };

    // Add to local messages immediately for UI feedback
    this.messages.push(newMessage);

    // Send to backend
    this.doctorService.sendMessage(this.selectedParticipant.id, message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Update message with server response
          const index = this.messages.findIndex(m => m.id === newMessage.id);
          if (index !== -1) {
            this.messages[index] = { ...this.messages[index], ...response, queued: false };
          }
        },
        error: (err) => {
          console.error('Error sending message:', err);
          // Mark message as failed
          const index = this.messages.findIndex(m => m.id === newMessage.id);
          if (index !== -1) {
            this.messages[index].failed = true;
          }
        }
      });
  }

  /**
   * Handle typing status changed
   * Broadcast typing indicator
   */
  onTypingStatusChanged(isTyping: boolean): void {
    if (!this.selectedParticipant) return;

    this.typingIndicator.setUserTyping(this.selectedParticipant.id, isTyping)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Error updating typing status:', err)
      });
  }

  /**
   * Handle video call request
   */
  onVideoCallRequested(): void {
    if (!this.selectedParticipant || !this.isConnected) {
      alert('Cannot initiate call while disconnected');
      return;
    }

    console.log('Video call requested with:', this.selectedParticipant.name);

    this.activeCall = {
      type: 'video',
      status: 'Calling...',
      isMuted: false
    };

    this.callService.initiateVideoCall(this.selectedParticipant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (callSession) => {
          console.log('Call session initiated:', callSession);
          if (this.activeCall) {
            this.activeCall.status = 'Connected';
          }
        },
        error: (err) => {
          console.error('Error initiating video call:', err);
          this.activeCall = null;
          alert('Failed to initiate video call. Please try again.');
        }
      });
  }

  /**
   * Handle audio call request
   */
  onAudioCallRequested(): void {
    if (!this.selectedParticipant || !this.isConnected) {
      alert('Cannot initiate call while disconnected');
      return;
    }

    console.log('Audio call requested with:', this.selectedParticipant.name);

    this.activeCall = {
      type: 'audio',
      status: 'Calling...',
      isMuted: false
    };

    this.callService.initiateAudioCall(this.selectedParticipant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (callSession) => {
          console.log('Call session initiated:', callSession);
          if (this.activeCall) {
            this.activeCall.status = 'Connected';
          }
        },
        error: (err) => {
          console.error('Error initiating audio call:', err);
          this.activeCall = null;
          alert('Failed to initiate audio call. Please try again.');
        }
      });
  }

  /**
   * End active call
   */
  onEndCall(): void {
    if (!this.activeCall || !this.selectedParticipant) return;

    this.callService.endCall(this.selectedParticipant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Call ended');
          this.activeCall = null;
        },
        error: (err) => {
          console.error('Error ending call:', err);
          this.activeCall = null;
        }
      });
  }

  /**
   * Toggle mute during call
   */
  toggleMute(): void {
    if (!this.activeCall) return;

    this.activeCall.isMuted = !this.activeCall.isMuted;

    this.callService.toggleMute(this.activeCall.isMuted)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Error toggling mute:', err)
      });
  }

  /**
   * Retry connection
   */
  retryConnection(): void {
    console.log('Retrying connection...');
    this.connectionManager.reconnect()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('Connection restored'),
        error: (err) => console.error('Error reconnecting:', err)
      });
  }

  /**
   * Retry loading participant
   */
  retryLoadParticipant(): void {
    this.error = null;
    if (this.participantId) {
      this.loadDoctor(this.participantId);
    }
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
