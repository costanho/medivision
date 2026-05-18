/**
 * Chat Header Component
 * Displays conversation header with participant info, status, and navigation
 *
 * Features:
 * - Show other person's name
 * - Display online/offline/away status
 * - Show "Last seen at X" time if offline
 * - Back button to return to conversation list
 * - Optional call buttons (video/audio)
 * - Online indicator with green dot
 * - Typing indicator support
 * - Responsive design
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PresenceService } from '../../../services/messaging/presence.service';
import { TypingIndicatorService } from '../../../services/messaging/typing-indicator.service';
import { ConnectionManagerService } from '../../../services/messaging/connection-manager.service';

export interface ChatParticipant {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
  lastSeen?: Date;
  specialization?: string; // For doctors
}

export enum OnlineStatus {
  ONLINE = 'online',
  AWAY = 'away',
  OFFLINE = 'offline',
  IDLE = 'idle'
}

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="chat-header" [ngClass]="'connection-' + connectionState">
      <!-- Left Section: Back Button -->
      <div class="header-left">
        <button (click)="onBack()" class="btn-back"
                title="Back to conversations"
                aria-label="Back to conversations">
          <i class="icon-arrow-left">←</i>
        </button>
      </div>

      <!-- Center Section: Participant Info -->
      <div class="header-center">
        <!-- Participant Details -->
        <div class="participant-info">
          <!-- Avatar -->
          <div class="avatar-container">
            <div class="avatar" [style.background-color]="getAvatarColor()">
              {{ getInitials() }}
            </div>
            <!-- Online Indicator -->
            <span class="status-indicator"
                  [ngClass]="'status-' + onlineStatus"
                  [title]="getStatusText()">
            </span>
          </div>

          <!-- Name and Status -->
          <div class="participant-details">
            <h2 class="participant-name">{{ participant.name }}</h2>
            <div class="participant-status">
              <!-- Online Status -->
              <span class="status-text" [ngClass]="'status-' + onlineStatus">
                {{ getStatusText() }}
              </span>

              <!-- Typing Indicator -->
              <span *ngIf="isTyping$ | async" class="typing-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                typing...
              </span>

              <!-- Last Seen -->
              <span *ngIf="onlineStatus === 'offline' && lastSeenTime"
                    class="last-seen-text">
                {{ lastSeenTime }}
              </span>

              <!-- Specialization (if available) -->
              <span *ngIf="participant.specialization" class="specialization">
                {{ participant.specialization }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Section: Actions -->
      <div class="header-right">
        <!-- Typing Indicator Badge -->
        <span *ngIf="isTyping$ | async" class="typing-badge" title="User is typing">
          ✎
        </span>

        <!-- Connection Status Badge -->
        <span *ngIf="!isConnected" class="connection-badge" title="Offline">
          ⚠
        </span>

        <!-- Call Buttons (if enabled) -->
        <div class="call-actions" *ngIf="showCallButtons">
          <button (click)="onVideoCall()" class="btn-video-call"
                  title="Start video call"
                  [disabled]="!isConnected"
                  aria-label="Start video call">
            <i class="icon-video">📹</i>
          </button>
          <button (click)="onAudioCall()" class="btn-audio-call"
                  title="Start audio call"
                  [disabled]="!isConnected"
                  aria-label="Start audio call">
            <i class="icon-audio">📞</i>
          </button>
        </div>

        <!-- More Menu (placeholder for future use) -->
        <button class="btn-more" title="More options" aria-label="More options">
          ⋮
        </button>
      </div>
    </header>

    <!-- Optional: Subtitle with additional info -->
    <div class="chat-header-subtitle" *ngIf="showSubtitle">
      <span *ngIf="onlineStatus === 'online'" class="subtitle-online">
        Online and available
      </span>
      <span *ngIf="onlineStatus === 'away'" class="subtitle-away">
        Away - may not respond immediately
      </span>
      <span *ngIf="onlineStatus === 'offline'" class="subtitle-offline">
        Offline - messages will be delivered when they return
      </span>
    </div>
  `,
  styles: [`
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 100;
      transition: background 0.3s ease;

      &.connection-disconnected {
        background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%);
        opacity: 0.9;
      }

      &.connection-reconnecting {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        animation: pulse 1.5s ease-in-out infinite;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .header-left {
      flex-shrink: 0;

      .btn-back {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: none;
        background-color: rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 18px;

        &:hover {
          background-color: rgba(255, 255, 255, 0.3);
          transform: translateX(-2px);
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }

    .header-center {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;

      .participant-info {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-width: 0;

        .avatar-container {
          position: relative;
          flex-shrink: 0;

          .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
            color: white;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }

          .status-indicator {
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

            &.status-online {
              background-color: #28a745;
              animation: pulse-green 2s ease-in-out infinite;
            }

            &.status-away {
              background-color: #ffc107;
            }

            &.status-idle {
              background-color: #6c757d;
            }

            &.status-offline {
              background-color: #dc3545;
            }
          }
        }

        .participant-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;

          .participant-name {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: white;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .participant-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.9);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            .status-text {
              font-weight: 500;

              &.status-online {
                color: #90EE90;
              }

              &.status-away {
                color: #FFD700;
              }

              &.status-offline {
                color: #FFB6C6;
              }

              &.status-idle {
                color: #A9A9A9;
              }
            }

            .typing-indicator {
              display: inline-flex;
              align-items: center;
              gap: 2px;
              font-style: italic;

              .dot {
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.7);
                animation: typing 1.4s infinite;

                &:nth-child(2) {
                  animation-delay: 0.2s;
                }

                &:nth-child(3) {
                  animation-delay: 0.4s;
                }
              }
            }

            .last-seen-text {
              color: rgba(255, 255, 255, 0.8);
              font-size: 11px;
            }

            .specialization {
              color: rgba(255, 255, 255, 0.7);
              font-size: 11px;
              font-style: italic;
            }
          }
        }
      }
    }

    @keyframes typing {
      0%, 60%, 100% {
        opacity: 0.3;
      }
      30% {
        opacity: 1;
      }
    }

    @keyframes pulse-green {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
      }
      50% {
        box-shadow: 0 0 0 4px rgba(40, 167, 69, 0);
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;

      .typing-badge {
        display: inline-block;
        width: 24px;
        height: 24px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        animation: bounce 1.5s ease-in-out infinite;
      }

      .connection-badge {
        display: inline-block;
        width: 24px;
        height: 24px;
        background-color: rgba(220, 53, 69, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        animation: blink 1s ease-in-out infinite;
        title: "Connection offline";
      }

      .call-actions {
        display: flex;
        gap: 4px;

        .btn-video-call,
        .btn-audio-call {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          background-color: rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 16px;

          &:hover:not(:disabled) {
            background-color: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
          }

          &:active:not(:disabled) {
            transform: scale(0.95);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }

      .btn-more {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        background-color: rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 16px;

        &:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }

    @keyframes bounce {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    @keyframes blink {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    .chat-header-subtitle {
      padding: 8px 16px;
      background-color: rgba(102, 126, 234, 0.1);
      font-size: 12px;
      color: rgba(102, 126, 234, 0.8);
      border-bottom: 1px solid rgba(102, 126, 234, 0.2);
      animation: slideDown 0.3s ease-out;

      .subtitle-online {
        color: #28a745;
      }

      .subtitle-away {
        color: #ffc107;
      }

      .subtitle-offline {
        color: #dc3545;
      }
    }

    @keyframes slideDown {
      from {
        transform: translateY(-10px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .chat-header {
        padding: 10px 12px;
        gap: 8px;
      }

      .header-center {
        .participant-info {
          gap: 10px;

          .avatar-container {
            .avatar {
              width: 36px;
              height: 36px;
              font-size: 14px;
            }

            .status-indicator {
              width: 12px;
              height: 12px;
            }
          }

          .participant-details {
            .participant-name {
              font-size: 14px;
            }

            .participant-status {
              font-size: 11px;
            }
          }
        }
      }

      .header-right {
        gap: 4px;

        .call-actions {
          .btn-video-call,
          .btn-audio-call {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }
        }

        .btn-more {
          width: 32px;
          height: 32px;
          font-size: 14px;
        }
      }
    }

    @media (max-width: 480px) {
      .header-center {
        .participant-info {
          gap: 8px;

          .avatar-container {
            .avatar {
              width: 32px;
              height: 32px;
              font-size: 12px;
            }
          }

          .participant-details {
            .participant-name {
              font-size: 13px;
            }

            .participant-status {
              font-size: 10px;
            }
          }
        }
      }

      .header-right {
        .call-actions {
          display: none; // Hide call buttons on small screens
        }
      }
    }
  `]
})
export class ChatHeaderComponent implements OnInit, OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // Input Properties
  // ═══════════════════════════════════════════════════════════════

  @Input() participant: ChatParticipant = {
    id: 0,
    name: 'Unknown',
    email: '',
    avatar: ''
  };

  @Input() showCallButtons = true;
  @Input() showSubtitle = false;

  // ═══════════════════════════════════════════════════════════════
  // Output Events
  // ═══════════════════════════════════════════════════════════════

  @Output() backClicked = new EventEmitter<void>();
  @Output() videoCallRequested = new EventEmitter<void>();
  @Output() audioCallRequested = new EventEmitter<void>();

  // ═══════════════════════════════════════════════════════════════
  // Component State
  // ═══════════════════════════════════════════════════════════════

  public onlineStatus: OnlineStatus = OnlineStatus.OFFLINE;
  public lastSeenTime: string = '';
  public isConnected = true;
  public connectionState: 'connected' | 'disconnected' | 'reconnecting' = 'connected';
  public isTyping$!: Observable<boolean>;

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private presenceService: PresenceService,
    private typingIndicatorService: TypingIndicatorService,
    private connectionManager: ConnectionManagerService
  ) {}

  ngOnInit(): void {
    this.subscribeToPresence();
    this.subscribeToTypingIndicator();
    this.subscribeToConnectionStatus();
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Subscriptions
  // ═══════════════════════════════════════════════════════════════

  /**
   * Subscribe to participant presence updates
   */
  private subscribeToPresence(): void {
    this.presenceService.onlineIndicator$(this.participant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(indicator => {
        this.lastSeenTime = indicator;
      });

    this.presenceService.isUserOnline$(this.participant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOnline => {
        this.onlineStatus = isOnline ? OnlineStatus.ONLINE : OnlineStatus.OFFLINE;
      });

    this.presenceService.userPresenceStatus$(this.participant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        switch (status) {
          case 'online':
            this.onlineStatus = OnlineStatus.ONLINE;
            break;
          case 'away':
            this.onlineStatus = OnlineStatus.AWAY;
            break;
          case 'idle':
            this.onlineStatus = OnlineStatus.IDLE;
            break;
          case 'offline':
          default:
            this.onlineStatus = OnlineStatus.OFFLINE;
            break;
        }
      });
  }

  /**
   * Subscribe to typing indicator for this conversation
   */
  private subscribeToTypingIndicator(): void {
    // Check if participant is typing (from their perspective)
    this.isTyping$ = this.typingIndicatorService.isUserTyping$(this.participant.id);
  }

  /**
   * Subscribe to connection status
   */
  private subscribeToConnectionStatus(): void {
    this.connectionManager.connectionState
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        const { ConnectionState } = require('../../../services/messaging/models');

        this.isConnected = state === ConnectionState.CONNECTED;

        if (state === ConnectionState.RECONNECTING) {
          this.connectionState = 'reconnecting';
        } else if (state === ConnectionState.CONNECTED) {
          this.connectionState = 'connected';
        } else {
          this.connectionState = 'disconnected';
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Event Handlers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle back button click
   */
  public onBack(): void {
    this.backClicked.emit();
  }

  /**
   * Handle video call button
   */
  public onVideoCall(): void {
    if (this.isConnected) {
      this.videoCallRequested.emit();
    }
  }

  /**
   * Handle audio call button
   */
  public onAudioCall(): void {
    if (this.isConnected) {
      this.audioCallRequested.emit();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Utilities
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get initials from participant name
   */
  public getInitials(): string {
    const names = this.participant.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return this.participant.name.substring(0, 2).toUpperCase();
  }

  /**
   * Get avatar background color based on participant ID
   */
  public getAvatarColor(): string {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#00f2fe', '#43e97b', '#fa709a', '#fee140'
    ];
    const index = this.participant.id % colors.length;
    return colors[index];
  }

  /**
   * Get human-readable status text
   */
  public getStatusText(): string {
    switch (this.onlineStatus) {
      case OnlineStatus.ONLINE:
        return 'Online now';
      case OnlineStatus.AWAY:
        return 'Away';
      case OnlineStatus.IDLE:
        return 'Idle';
      case OnlineStatus.OFFLINE:
        return this.lastSeenTime || 'Offline';
      default:
        return 'Unknown';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
