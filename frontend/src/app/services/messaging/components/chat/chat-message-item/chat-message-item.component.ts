/**
 * Chat Message Item Component
 * Displays a single message in the chat
 *
 * Features:
 * - Show sender avatar and name
 * - Show message content
 * - Show timestamp
 * - Differentiate sent vs received
 * - Show read status
 * - Responsive design
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../../models';

@Component({
  selector: 'app-chat-message-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Message Wrapper -->
    <div
      class="message-wrapper"
      [class.sent]="isSent"
      [class.received]="!isSent"
    >
      <!-- Received Message (left side) -->
      <div *ngIf="!isSent" class="message-content">
        <!-- Avatar -->
        <div class="avatar-container">
          <div class="avatar">
            <span class="initials">{{ getInitials(message.senderName) }}</span>
          </div>
        </div>

        <!-- Message Bubble -->
        <div class="message-bubble">
          <!-- Sender Name -->
          <div class="sender-name">{{ message.senderName || 'Unknown' }}</div>

          <!-- Message Text -->
          <div class="message-text">{{ message.content }}</div>

          <!-- Timestamp -->
          <div class="message-time">{{ getTimeAgo(message.timestamp) }}</div>
        </div>
      </div>

      <!-- Sent Message (right side) -->
      <div *ngIf="isSent" class="message-content sent">
        <!-- Message Bubble -->
        <div class="message-bubble">
          <!-- Message Text -->
          <div class="message-text">{{ message.content }}</div>

          <!-- Timestamp & Read Status -->
          <div class="message-footer">
            <span class="message-time">{{ getTimeAgo(message.timestamp) }}</span>
            <span class="read-status" [title]="message.isRead ? 'Read' : 'Unread'">
              {{ message.isRead ? '✓✓' : '✓' }}
            </span>
          </div>
        </div>

        <!-- Avatar -->
        <div class="avatar-container">
          <div class="avatar">
            <span class="initials">{{ getInitials(message.senderName) }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .message-wrapper {
      display: flex;
      margin-bottom: 16px;
      animation: slideIn 0.3s ease;

      &.received {
        justify-content: flex-start;
      }

      &.sent {
        justify-content: flex-end;
      }
    }

    .message-content {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      max-width: 70%;

      &.sent {
        flex-direction: row-reverse;
      }
    }

    .avatar-container {
      flex-shrink: 0;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

      .initials {
        text-transform: uppercase;
      }
    }

    .message-bubble {
      background-color: #f0f0f0;
      border-radius: 12px;
      padding: 12px 16px;
      word-wrap: break-word;
      word-break: break-word;

      .received & {
        background-color: #f0f0f0;
        border-bottom-left-radius: 4px;
      }

      .sent & {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        color: white;
        border-bottom-right-radius: 4px;
      }
    }

    .sender-name {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      margin-bottom: 4px;
    }

    .message-text {
      font-size: 14px;
      line-height: 1.4;
      margin-bottom: 4px;
    }

    .message-time {
      font-size: 12px;
      color: #999;

      .sent & {
        color: rgba(255, 255, 255, 0.7);
      }
    }

    .message-footer {
      display: flex;
      align-items: center;
      gap: 4px;
      justify-content: flex-end;
    }

    .read-status {
      font-size: 10px;
      font-weight: bold;
      color: rgba(255, 255, 255, 0.8);
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

    @media (prefers-color-scheme: dark) {
      .message-bubble {
        background-color: #34495e;
        color: white;
        border-color: #445;
      }

      .sender-name {
        color: #95a5a6;
      }

      .message-time {
        color: #7f8c8d;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatMessageItemComponent {
  @Input() message!: Message;
  @Input() isSent = false;
  @Output() messageViewed = new EventEmitter<number>();

  /**
   * Get avatar initials
   */
  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'U';
  }

  /**
   * Get time ago string
   */
  getTimeAgo(date: Date | string): string {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    const month = messageDate.toLocaleString('default', { month: 'short' });
    const day = messageDate.getDate();
    return `${month} ${day}`;
  }
}
