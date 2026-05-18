/**
 * Message Timestamps Integration Example Component
 *
 * This example demonstrates how to integrate message timestamps with:
 * - Date separators
 * - Relative time display
 * - Smart timestamp visibility
 * - Real-time updates
 * - Mobile responsive design
 * - Message grouping
 *
 * Features:
 * - Load messages with timestamps
 * - Group messages by date
 * - Display intelligent separators
 * - Show/hide timestamps based on logic
 * - Responsive layout
 * - Error handling
 * - Loading states
 */

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Services
import { MessageTimestampService, MessageWithTimestamp } from '../../../shared/services/message-timestamp.service';
import { ApiService } from '../../../core/services/api.service';

// Components
import { MessageTimestampComponent } from '../../../shared/components/message-timestamp/message-timestamp.component';
import { MessageDateSeparatorComponent } from '../../../shared/components/message-date-separator/message-date-separator.component';

// Pipes
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { MessageDateSeparatorPipe } from '../../../shared/pipes/message-date-separator.pipe';

/**
 * Message with additional metadata
 */
interface Message extends MessageWithTimestamp {
  content: string;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  isOwn?: boolean;
  isRead?: boolean;
}

/**
 * Integration Example Component
 */
@Component({
  selector: 'app-messages-with-timestamps',
  standalone: true,
  imports: [
    CommonModule,
    MessageTimestampComponent,
    MessageDateSeparatorComponent,
    RelativeTimePipe,
    MessageDateSeparatorPipe
  ],
  template: `
    <div class="messages-page">
      <!-- Header -->
      <div class="messages-header">
        <h2>Messages</h2>
        <button (click)="refreshMessages()" [disabled]="isLoading" class="refresh-btn">
          {{ isLoading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <!-- Messages Container -->
      <div class="messages-container" #messagesContainer>
        <!-- Loading State -->
        <div *ngIf="isLoading && messages.length === 0" class="loading-state">
          <div class="spinner"></div>
          <p>Loading messages...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="error-state">
          <p>{{ error }}</p>
          <button (click)="retryLoadMessages()">Retry</button>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading && messages.length === 0 && !error" class="empty-state">
          <p>No messages yet</p>
        </div>

        <!-- Messages with Timestamps and Separators -->
        <div *ngIf="messages.length > 0" class="messages-list">
          <div *ngFor="let message of processedMessages; let last = last">
            <!-- Date Separator -->
            <app-message-date-separator
              *ngIf="message.showSeparator"
              [timestamp]="message.timestamp"
              class="separator">
            </app-message-date-separator>

            <!-- Message Item -->
            <div class="message-item"
                 [class.own-message]="message.isOwn"
                 [class.other-message]="!message.isOwn"
                 [class.show-timestamp]="message.showTimestamp">

              <!-- Avatar -->
              <div class="message-avatar" *ngIf="!message.isOwn">
                <img [src]="message.senderAvatar || getDefaultAvatar(message.senderName)"
                     [alt]="message.senderName"
                     class="avatar-img">
              </div>

              <!-- Message Content -->
              <div class="message-body">
                <!-- Sender Name (for other messages) -->
                <div *ngIf="!message.isOwn && shouldShowSenderName(message)" class="sender-name">
                  {{ message.senderName }}
                </div>

                <!-- Message Content -->
                <div class="message-content">
                  <p>{{ message.content }}</p>

                  <!-- Timestamp -->
                  <app-message-timestamp
                    *ngIf="message.showTimestamp"
                    [timestamp]="message.timestamp"
                    [format]="'short'"
                    class="message-time">
                  </app-message-timestamp>
                </div>

                <!-- Read Receipt (for own messages) -->
                <div *ngIf="message.isOwn && message.isRead" class="read-receipt">
                  ✓✓ Read
                </div>
              </div>
            </div>

            <!-- Load More Button -->
            <div *ngIf="last && hasMoreMessages && !isLoadingMore" class="load-more-container">
              <button (click)="loadMoreMessages()" class="load-more-btn">
                Load Earlier Messages
              </button>
            </div>

            <!-- Loading More Indicator -->
            <div *ngIf="isLoadingMore" class="loading-more">
              <div class="spinner-small"></div>
              <span>Loading more messages...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Debug Info (Development Only) -->
      <div *ngIf="showDebugInfo" class="debug-info">
        <h4>Debug Information</h4>
        <p>Total Messages: {{ messages.length }}</p>
        <p>Processed Messages: {{ processedMessages.length }}</p>
        <p>Show Timestamps: {{ processedMessages.filter(m => m.showTimestamp).length }}</p>
        <p>Show Separators: {{ processedMessages.filter(m => m.showSeparator).length }}</p>
      </div>
    </div>
  `,
  styles: [`
    .messages-page {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background-color: #f8fafc;
    }

    /* Header */
    .messages-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      h2 {
        margin: 0;
        font-size: 20px;
        color: #1f2937;
      }

      .refresh-btn {
        padding: 8px 16px;
        background-color: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;

        &:hover:not(:disabled) {
          background-color: #5568d3;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    /* Messages Container */
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
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
        margin: 0;
        font-size: 16px;
      }

      button {
        padding: 8px 16px;
        background-color: #dc2626;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background-color: #b91c1c;
        }
      }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: #9ca3af;
      font-size: 16px;
    }

    /* Messages List */
    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Separator */
    ::ng-deep .separator {
      margin: 8px 0;
    }

    /* Message Item */
    .message-item {
      display: flex;
      gap: 12px;
      animation: slideIn 0.3s ease-out;

      &.own-message {
        flex-direction: row-reverse;
      }

      &.other-message {
        flex-direction: row;
      }
    }

    /* Avatar */
    .message-avatar {
      flex-shrink: 0;

      .avatar-img {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
      }
    }

    /* Message Body */
    .message-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      max-width: 70%;
    }

    .sender-name {
      font-size: 13px;
      font-weight: 600;
      color: #4b5563;
      padding: 0 8px;
    }

    /* Message Content */
    .message-content {
      background: white;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

      p {
        margin: 0;
        color: #1f2937;
        word-wrap: break-word;
      }

      .message-time {
        margin-top: 6px;
        display: block;
      }
    }

    .message-item.own-message .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      p {
        color: white;
      }

      ::ng-deep .message-timestamp {
        color: rgba(255, 255, 255, 0.7);

        &:hover {
          color: white;
        }
      }
    }

    /* Read Receipt */
    .read-receipt {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      padding: 0 8px;
    }

    /* Load More */
    .load-more-container {
      display: flex;
      justify-content: center;
      padding: 16px 0;

      .load-more-btn {
        padding: 8px 16px;
        background-color: #e5e7eb;
        color: #374151;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;

        &:hover {
          background-color: #d1d5db;
        }
      }
    }

    /* Loading More */
    .loading-more {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 12px;
      color: #64748b;
      font-size: 13px;

      .spinner-small {
        width: 16px;
        height: 16px;
        border: 2px solid #e2e8f0;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    /* Debug Info */
    .debug-info {
      padding: 12px;
      background-color: #fef3c7;
      border-top: 1px solid #fde68a;
      color: #92400e;
      font-size: 12px;

      h4 {
        margin: 0 0 8px;
        font-size: 13px;
      }

      p {
        margin: 4px 0;
      }
    }

    /* Animations */
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .message-body {
        max-width: 85%;
      }
    }

    @media (max-width: 480px) {
      .messages-header {
        padding: 12px;

        h2 {
          font-size: 18px;
        }
      }

      .messages-container {
        padding: 12px;
      }

      .message-item {
        gap: 8px;
      }

      .message-body {
        max-width: 100%;
      }

      .message-content {
        padding: 10px;
        font-size: 14px;
      }

      .message-avatar .avatar-img {
        width: 32px;
        height: 32px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageTimestampsIntegrationExampleComponent implements OnInit, OnDestroy {
  // Data
  messages: Message[] = [];
  processedMessages: Message[] = [];

  // State
  isLoading = false;
  isLoadingMore = false;
  error: string | null = null;
  hasMoreMessages = true;
  showDebugInfo = false;

  // Pagination
  currentPage = 0;
  pageSize = 20;

  // Private
  private destroy$ = new Subject<void>();

  constructor(
    private timestampService: MessageTimestampService,
    private apiService: ApiService
  ) {}

  /**
   * Initialize component
   */
  ngOnInit(): void {
    this.loadMessages();
  }

  /**
   * Load initial messages
   */
  private loadMessages(): void {
    this.isLoading = true;
    this.error = null;
    this.currentPage = 0;

    // Simulate API call
    this.apiService.getMessages(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.messages = this.mapMessagesToTimestampFormat(response.content || []);
          this.hasMoreMessages = response.hasMore || response.totalPages > 0;
          this.processMessages();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading messages:', err);
          this.error = 'Failed to load messages. Please try again.';
          this.isLoading = false;
        }
      });
  }

  /**
   * Refresh messages
   */
  refreshMessages(): void {
    this.loadMessages();
  }

  /**
   * Load more messages (pagination)
   */
  loadMoreMessages(): void {
    if (this.isLoadingMore || !this.hasMoreMessages) return;

    this.isLoadingMore = true;
    this.currentPage++;

    this.apiService.getMessages(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const newMessages = this.mapMessagesToTimestampFormat(response.content || []);

          // Add to messages and reprocess with previous context
          this.messages = [...this.messages, ...newMessages];
          this.processMessages();

          this.hasMoreMessages = response.hasMore || (this.currentPage + 1) < response.totalPages;
          this.isLoadingMore = false;
        },
        error: (err) => {
          console.error('Error loading more messages:', err);
          this.isLoadingMore = false;
        }
      });
  }

  /**
   * Retry loading messages after error
   */
  retryLoadMessages(): void {
    this.loadMessages();
  }

  /**
   * Process messages with timestamps and separators
   */
  private processMessages(): void {
    this.processedMessages = this.timestampService.groupMessagesByDate(this.messages);
  }

  /**
   * Map API response to timestamp format
   */
  private mapMessagesToTimestampFormat(messages: any[]): Message[] {
    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      senderName: msg.senderName || 'Unknown',
      senderAvatar: msg.senderAvatar,
      timestamp: new Date(msg.timestamp),
      isOwn: msg.isOwn || false,
      isRead: msg.isRead || false,
      showTimestamp: false, // Will be set by service
      showSeparator: false  // Will be set by service
    }));
  }

  /**
   * Determine if sender name should be shown
   * Show if message is from someone else and it's the first from that sender
   * or sender changed from previous message
   */
  shouldShowSenderName(message: Message, index?: number): boolean {
    if (message.isOwn) return false;
    if (index === undefined) return true;

    if (index === 0) return true;

    const prevMessage = this.processedMessages[index - 1];
    return prevMessage?.senderId !== message.senderId;
  }

  /**
   * Get default avatar for sender
   */
  getDefaultAvatar(senderName: string): string {
    // Generate avatar URL based on name or initials
    const initials = senderName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=667eea&color=fff`;
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
