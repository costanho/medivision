/**
 * Example Component: Messages with Connection Loss Handling
 *
 * This example demonstrates how to integrate connection loss handling
 * with the messaging system. Shows:
 * - Connection status display
 * - Offline message queuing
 * - Queue processing on reconnect
 * - User notifications
 * - Queue statistics
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, filter, map } from 'rxjs/operators';

import { ConnectionManagerService } from '../../../services/messaging/connection-manager.service';
import { MessageQueueService } from '../../../services/messaging/message-queue.service';
import { ConnectionUiService, ConnectionNotification } from '../../../services/messaging/connection-ui.service';
import { ConnectionState, QueueStats } from '../../../services/messaging/models';

interface MessageItem {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

@Component({
  selector: 'app-messages-connection-loss-example',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Connection Banner -->
    <div class="connection-banner" *ngIf="connectionUI.showBanner | async">
      <div class="banner-content" [ngClass]="(statusDisplay$ | async)?.colorClass">
        <i [class]="(statusDisplay$ | async)?.iconClass"
           [class.animate-spin]="(statusDisplay$ | async)?.isAnimated"></i>
        <div class="banner-text">
          <span class="main-text">{{ (statusDisplay$ | async)?.mainText }}</span>
          <span class="sub-text">{{ (statusDisplay$ | async)?.subText }}</span>
        </div>
        <button *ngIf="(statusDisplay$ | async)?.showRetryButton"
                (click)="retryConnection()"
                class="btn-retry">
          Retry
        </button>
      </div>
    </div>

    <!-- Notifications Container -->
    <div class="notifications-container">
      <div *ngFor="let notification of (connectionUI.activeNotifications | async)"
           class="notification"
           [ngClass]="'notification-' + notification.type"
           role="alert"
           [attr.aria-live]="notification.ariaLive">
        <div class="notification-content">
          <span class="notification-message">{{ notification.message }}</span>
          <span class="notification-description" *ngIf="notification.description">
            {{ notification.description }}
          </span>
        </div>
        <div class="notification-actions">
          <button *ngIf="notification.actionCallback"
                  (click)="notification.actionCallback!()"
                  class="btn-action">
            {{ notification.actionLabel }}
          </button>
          <button *ngIf="notification.dismissible"
                  (click)="connectionUI.dismissNotification(notification.id)"
                  class="btn-close" aria-label="Close">
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- Messages Container -->
    <div class="messages-container">
      <!-- Queue Status -->
      <div class="queue-status" *ngIf="(queueStats$ | async) as stats">
        <span class="queue-indicator" *ngIf="stats.totalQueued > 0">
          {{ stats.totalQueued }} message{{ stats.totalQueued !== 1 ? 's' : '' }} queued
        </span>
        <div class="queue-breakdown" *ngIf="stats.totalQueued > 0">
          <span *ngIf="stats.highPriority > 0" class="priority high">
            🔴 {{ stats.highPriority }} high
          </span>
          <span *ngIf="stats.normalPriority > 0" class="priority normal">
            🟡 {{ stats.normalPriority }} normal
          </span>
          <span *ngIf="stats.lowPriority > 0" class="priority low">
            🟢 {{ stats.lowPriority }} low
          </span>
        </div>
      </div>

      <!-- Messages List -->
      <div class="messages-list">
        <div *ngFor="let message of messages" class="message">
          <div class="message-sender">{{ message.senderName }}</div>
          <div class="message-content">{{ message.content }}</div>
          <div class="message-time">{{ message.timestamp | date:'short' }}</div>
          <span *ngIf="message.isRead" class="read-indicator">✓✓</span>
        </div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="message-input-container">
      <div class="input-wrapper">
        <input
          [(ngModel)]="newMessage"
          (keyup.enter)="sendMessage()"
          placeholder="Type a message..."
          [disabled]="!(isConnected$ | async)"
          class="message-input">

        <button
          (click)="sendMessage()"
          [disabled]="!newMessage || !(isConnected$ | async)"
          class="btn-send">
          Send
        </button>
      </div>

      <!-- Offline Notice -->
      <div *ngIf="!(isConnected$ | async)" class="offline-notice">
        You are offline. Messages will be sent when you reconnect.
      </div>

      <!-- Reconnecting Notice -->
      <div *ngIf="(isReconnecting$ | async)" class="reconnecting-notice">
        Reconnecting... Messages will be sent automatically.
      </div>
    </div>

    <!-- Connection Metrics (Debug/Admin) -->
    <div class="connection-metrics" *ngIf="showMetrics">
      <h3>Connection Metrics</h3>
      <div *ngIf="(metrics$ | async) as metrics" class="metrics-grid">
        <div class="metric">
          <span class="label">Connection Status:</span>
          <span class="value" [ngClass]="metrics.isConnected ? 'status-connected' : 'status-disconnected'">
            {{ metrics.isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
        <div class="metric">
          <span class="label">Reconnect Attempts:</span>
          <span class="value">{{ metrics.reconnectAttempts }}</span>
        </div>
        <div class="metric">
          <span class="label">Successful Reconnects:</span>
          <span class="value">{{ metrics.successfulReconnects }}</span>
        </div>
        <div class="metric">
          <span class="label">Failed Reconnects:</span>
          <span class="value">{{ metrics.failedReconnects }}</span>
        </div>
        <div class="metric">
          <span class="label">Avg Reconnection Time:</span>
          <span class="value">{{ metrics.averageReconnectionTime }}ms</span>
        </div>
        <div class="metric">
          <span class="label">Queued Messages:</span>
          <span class="value">{{ metrics.messageQueueSize }}</span>
        </div>
        <div class="metric">
          <span class="label">Total Downtime:</span>
          <span class="value">{{ metrics.totalDowntime }}ms</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .connection-banner {
      position: sticky;
      top: 0;
      z-index: 1000;
      animation: slideDown 0.3s ease-out;

      .banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        font-weight: 500;

        &.text-warning {
          background-color: #fff3cd;
          color: #856404;
          border-bottom: 2px solid #ffc107;
        }

        &.text-info {
          background-color: #d1ecf1;
          color: #0c5460;
          border-bottom: 2px solid #17a2b8;
        }

        &.text-success {
          background-color: #d4edda;
          color: #155724;
          border-bottom: 2px solid #28a745;
        }

        &.text-danger {
          background-color: #f8d7da;
          color: #721c24;
          border-bottom: 2px solid #dc3545;
        }

        i {
          font-size: 18px;
          flex-shrink: 0;

          &.animate-spin {
            animation: spin 1s linear infinite;
          }
        }

        .banner-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;

          .main-text {
            font-size: 14px;
            font-weight: 600;
          }

          .sub-text {
            font-size: 12px;
            opacity: 0.8;
          }
        }

        .btn-retry {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          background-color: rgba(255, 255, 255, 0.2);
          color: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;

          &:hover {
            background-color: rgba(255, 255, 255, 0.3);
          }
        }
      }
    }

    .notifications-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 16px;
      background-color: #f8f9fa;

      .notification {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-radius: 4px;
        border-left: 4px solid transparent;
        font-size: 14px;
        animation: slideInUp 0.3s ease-out;

        &.notification-info {
          background-color: #d1ecf1;
          border-left-color: #17a2b8;
          color: #0c5460;
        }

        &.notification-warning {
          background-color: #fff3cd;
          border-left-color: #ffc107;
          color: #856404;
        }

        &.notification-error {
          background-color: #f8d7da;
          border-left-color: #dc3545;
          color: #721c24;
        }

        &.notification-success {
          background-color: #d4edda;
          border-left-color: #28a745;
          color: #155724;
        }

        .notification-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;

          .notification-message {
            font-weight: 600;
          }

          .notification-description {
            font-size: 12px;
            opacity: 0.8;
          }
        }

        .notification-actions {
          display: flex;
          gap: 8px;
          margin-left: 12px;

          .btn-action {
            padding: 4px 8px;
            border: none;
            border-radius: 3px;
            background-color: rgba(255, 255, 255, 0.3);
            color: inherit;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;

            &:hover {
              background-color: rgba(255, 255, 255, 0.5);
            }
          }

          .btn-close {
            padding: 2px 8px;
            border: none;
            background: none;
            color: inherit;
            font-size: 18px;
            cursor: pointer;
            opacity: 0.6;

            &:hover {
              opacity: 1;
            }
          }
        }
      }
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;

      .queue-status {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background-color: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 13px;

        .queue-indicator {
          font-weight: 600;
          color: #856404;
        }

        .queue-breakdown {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;

          .priority {
            padding: 2px 8px;
            border-radius: 3px;
            background-color: rgba(0, 0, 0, 0.05);
            font-size: 12px;

            &.high {
              color: #dc3545;
            }

            &.normal {
              color: #ffc107;
            }

            &.low {
              color: #28a745;
            }
          }
        }
      }

      .messages-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .message {
          padding: 12px;
          background-color: #f8f9fa;
          border-radius: 4px;
          border-left: 4px solid #007bff;

          .message-sender {
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
          }

          .message-content {
            color: #666;
            word-break: break-word;
            margin-bottom: 4px;
          }

          .message-time {
            font-size: 12px;
            color: #999;
          }

          .read-indicator {
            display: inline-block;
            margin-left: 4px;
            color: #007bff;
            font-weight: 600;
            font-size: 14px;
          }
        }
      }
    }

    .message-input-container {
      padding: 16px;
      border-top: 1px solid #ddd;
      background-color: #f8f9fa;

      .input-wrapper {
        display: flex;
        gap: 8px;

        .message-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;

          &:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
          }

          &:disabled {
            background-color: #e9ecef;
            color: #666;
            cursor: not-allowed;
          }
        }

        .btn-send {
          padding: 10px 20px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;

          &:hover:not(:disabled) {
            background-color: #0056b3;
          }

          &:disabled {
            background-color: #ccc;
            cursor: not-allowed;
          }
        }
      }

      .offline-notice,
      .reconnecting-notice {
        margin-top: 12px;
        padding: 10px;
        border-radius: 4px;
        font-size: 13px;
        text-align: center;
      }

      .offline-notice {
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffc107;
      }

      .reconnecting-notice {
        background-color: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
      }
    }

    .connection-metrics {
      padding: 16px;
      background-color: #f8f9fa;
      border-top: 1px solid #ddd;
      border-radius: 4px;
      margin-top: 16px;

      h3 {
        margin: 0 0 12px 0;
        color: #333;
        font-size: 14px;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;

        .metric {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background-color: white;
          border-radius: 3px;
          font-size: 12px;

          .label {
            font-weight: 600;
            color: #666;
          }

          .value {
            color: #333;
            font-weight: 600;

            &.status-connected {
              color: #28a745;
            }

            &.status-disconnected {
              color: #dc3545;
            }
          }
        }
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

    @keyframes slideInUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 600px) {
      .connection-banner .banner-content {
        flex-direction: column;
        gap: 8px;

        .banner-text {
          width: 100%;
        }

        .btn-retry {
          width: 100%;
        }
      }

      .messages-container {
        padding: 8px;
      }

      .message-input-container {
        padding: 12px;

        .input-wrapper {
          gap: 6px;
        }
      }
    }
  `]
})
export class MessagesWithConnectionLossExampleComponent implements OnInit, OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // Observables
  // ═══════════════════════════════════════════════════════════════

  public isConnected$ = this.connectionManager.connectionState.pipe(
    map(state => state === ConnectionState.CONNECTED)
  );

  public isReconnecting$ = this.connectionManager.connectionState.pipe(
    map(state => state === ConnectionState.RECONNECTING)
  );

  public statusDisplay$ = this.connectionUI.statusDisplay;
  public metrics$ = this.connectionManager.connectionMetrics;
  public queueStats$ = this.messageQueue.queueStats;

  // ═══════════════════════════════════════════════════════════════
  // Component State
  // ═══════════════════════════════════════════════════════════════

  public messages: MessageItem[] = [];
  public newMessage = '';
  public showMetrics = false; // Set to true to show debug metrics

  private currentUserId = 1;
  private currentUserName = 'Current User';
  private recipientId = 2;
  private conversationId = 1;

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(
    public connectionManager: ConnectionManagerService,
    public messageQueue: MessageQueueService,
    public connectionUI: ConnectionUiService
  ) {
    // Demo messages
    this.messages = [
      {
        id: 1,
        senderId: 2,
        senderName: 'Doctor Smith',
        content: 'Hello! How are you feeling today?',
        timestamp: new Date(Date.now() - 60000),
        isRead: true
      },
      {
        id: 2,
        senderId: 1,
        senderName: 'You',
        content: 'I\'m doing well, thanks for asking!',
        timestamp: new Date(Date.now() - 30000),
        isRead: true
      }
    ];
  }

  ngOnInit(): void {
    console.log('[Example Component] Initializing');

    // Set reconnection strategy
    this.connectionManager.setReconnectionStrategy({
      enabled: true,
      initialDelay: 2000,      // Start at 2 seconds for demo
      maxDelay: 10000,         // Cap at 10 seconds
      backoffMultiplier: 2,
      maxAttempts: 10
    });

    // Configure message queue
    this.messageQueue.setConfig({
      queueMessage: true,
      maxQueueSize: 500,
      persistQueue: true,
      ttl: 24 * 60 * 60 * 1000
    });

    // Subscribe to connection state changes
    this.connectionManager.connectionState
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        console.log('[Example Component] Connection state:', state);
      });

    // Process queued messages when reconnected
    this.connectionManager.connectionState
      .pipe(
        filter(state => state === ConnectionState.CONNECTED),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.processPendingMessages();
      });

    // Monitor queue updates
    this.messageQueue.queueStats
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        console.log('[Example Component] Queue stats:', stats);
      });
  }

  /**
   * Send message or queue if offline
   */
  public sendMessage(): void {
    if (!this.newMessage.trim()) {
      return;
    }

    const content = this.newMessage.trim();

    if (this.connectionManager.isConnected()) {
      // Send immediately
      const message: MessageItem = {
        id: this.messages.length + 1,
        senderId: this.currentUserId,
        senderName: this.currentUserName,
        content,
        timestamp: new Date(),
        isRead: false
      };

      this.messages.push(message);
      console.log('[Example Component] Message sent immediately:', message);
    } else {
      // Queue for later
      this.messageQueue.enqueueMessage(
        'message',
        {
          content,
          conversationId: this.conversationId,
          recipientId: this.recipientId
        },
        'high',
        this.conversationId,
        this.recipientId
      );

      console.log('[Example Component] Message queued (offline)');
      this.connectionUI.addNotification({
        type: 'info',
        message: 'Message queued',
        description: 'Your message will be sent when you reconnect.',
        dismissible: true,
        autoClose: true,
        autoCloseDuration: 3000
      });
    }

    this.newMessage = '';
  }

  /**
   * Process pending messages from queue
   */
  private processPendingMessages(): void {
    const queueSize = this.messageQueue.getQueueSize();
    if (queueSize === 0) {
      return;
    }

    console.log('[Example Component] Processing', queueSize, 'queued messages');

    while (!this.messageQueue.isEmpty()) {
      const message = this.messageQueue.getNextMessage();

      if (message && message.type === 'message') {
        // Simulate sending
        const payload = message.payload as any;
        const newMessage: MessageItem = {
          id: this.messages.length + 1,
          senderId: this.currentUserId,
          senderName: this.currentUserName,
          content: payload.content,
          timestamp: new Date(),
          isRead: false
        };

        this.messages.push(newMessage);
        this.messageQueue.dequeueMessage(message.id);

        console.log('[Example Component] Sent queued message:', newMessage);
      } else {
        break;
      }
    }

    console.log('[Example Component] Finished processing queued messages');
  }

  /**
   * Manually retry connection
   */
  public retryConnection(): void {
    console.log('[Example Component] Manual retry requested');
    this.connectionManager.reconnect();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
