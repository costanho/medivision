/**
 * Chat Component with Typing Indicators Integration Example
 * Demonstrates complete typing indicator functionality
 */

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';

import { TypingIndicatorService } from '../../services/messaging/typing-indicator.service';
import { TypingIndicatorBroadcasterService } from '../../services/messaging/typing-indicator-broadcaster.service';
import { AuthIntegrationService } from '../../../core/services/auth-integration.service';
import { WebSocketService } from '../../services/messaging/websocket.service';
import { MessagesService } from '../../services/messaging/messages.service';

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-messages-typing-indicators',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <!-- Messages Container -->
    <div #messagesContainer class="messages-container">
      <div class="message" *ngFor="let msg of messages; trackBy: trackByMessageId">
        <strong>{{ msg.senderName }}</strong>
        <p>{{ msg.content }}</p>
        <small>{{ formatTime(msg.timestamp) }}</small>
      </div>
    </div>

    <!-- Typing Indicator -->
    <div class="typing-indicator" *ngIf="getTypingMessage()">
      <span>{{ getTypingMessage() }}</span>
      <span class="typing-dots">
        <span></span><span></span><span></span>
      </span>
    </div>

    <!-- Message Input -->
    <div class="message-input-container">
      <ion-item>
        <ion-input
          [(ngModel)]="messageContent"
          (input)="onMessageInput()"
          placeholder="Type a message..."
        ></ion-input>
        <ion-button
          (click)="onSendMessage()"
          [disabled]="!messageContent.trim()"
          color="primary"
          slot="end"
        >
          <ion-icon name="send"></ion-icon>
        </ion-button>
      </ion-item>
    </div>
  `,
  styles: [`
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .message {
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: #f5f5f5;
      border-radius: 8px;

      strong {
        display: block;
        margin-bottom: 0.25rem;
      }

      p {
        margin: 0.5rem 0;
      }

      small {
        color: #999;
      }
    }

    .typing-indicator {
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      color: #999;
      font-style: italic;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f9f9f9;
      border-top: 1px solid #e0e0e0;

      .typing-dots {
        display: flex;
        gap: 0.25rem;

        span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #999;
          animation: typing 1.4s infinite;

          &:nth-child(2) {
            animation-delay: 0.2s;
          }

          &:nth-child(3) {
            animation-delay: 0.4s;
          }
        }
      }
    }

    @keyframes typing {
      0%, 60%, 100% {
        opacity: 0.3;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-4px);
      }
    }

    .message-input-container {
      padding: 0.5rem 1rem;
      background: #fff;
      border-top: 1px solid #e0e0e0;

      ion-item {
        --padding-start: 0;
        --padding-end: 0;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagesTypingIndicatorsExampleComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  messages: Message[] = [];
  messageContent: string = '';
  conversationId: number = 1;

  private destroy$ = new Subject<void>();

  constructor(
    private typingIndicator: TypingIndicatorService,
    private typingBroadcaster: TypingIndicatorBroadcasterService,
    private auth: AuthIntegrationService,
    private webSocket: WebSocketService,
    private messagesService: MessagesService
  ) {}

  ngOnInit(): void {
    this.initializeTypingIndicators();
    this.setupBroadcasting();
    this.setupIncomingEvents();
    this.loadMessages();
  }

  /**
   * Initialize typing indicator service
   */
  private initializeTypingIndicators(): void {
    const userId = this.auth.getCurrentUserId();
    const userName = this.auth.getCurrentUserName();

    if (!userId || !userName) {
      console.error('User not authenticated');
      return;
    }

    this.typingIndicator.setCurrentUser(userId, userName);
    this.typingIndicator.setCurrentConversation(this.conversationId);

    console.log('[Chat] Typing indicators initialized');
  }

  /**
   * Setup broadcasting of typing events
   */
  private setupBroadcasting(): void {
    // Broadcast when user starts typing
    this.typingIndicator.sendTyping$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        console.log('[Chat] Broadcasting typing event:', event);

        this.typingBroadcaster.broadcastTyping(
          event.conversationId,
          event.typistId,
          event.typistName
        );
      });

    // Broadcast when user stops typing
    this.typingIndicator.sendStoppedTyping$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        console.log('[Chat] Broadcasting stopped typing event:', event);

        this.typingBroadcaster.broadcastStoppedTyping(
          event.conversationId,
          event.typistId,
          event.typistName
        );
      });
  }

  /**
   * Setup incoming typing events
   */
  private setupIncomingEvents(): void {
    this.webSocket.typingEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        console.log('[Chat] Received typing event:', event);

        if (event.eventType === 'typing') {
          this.typingIndicator.handleTypingEvent(event);
        } else if (event.eventType === 'stopped_typing') {
          this.typingIndicator.handleStoppedTypingEvent(event);
        }
      });
  }

  /**
   * Load messages
   */
  private loadMessages(): void {
    this.messagesService.getMessages(this.conversationId, 0, 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.messages = response.messages;
        this.scrollToBottom();
      });
  }

  /**
   * Handle message input - mark user as typing
   */
  onMessageInput(): void {
    // Mark user is typing (debounced automatically to 500ms)
    this.typingIndicator.markUserTyping(this.conversationId);
  }

  /**
   * Send message
   */
  onSendMessage(): void {
    if (!this.messageContent.trim()) {
      return;
    }

    this.messagesService.sendMessage(this.conversationId, this.messageContent)
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        // Add to messages
        this.messages.push(message);

        // Clear input
        this.messageContent = '';

        // Stop typing
        this.typingIndicator.markUserStoppedTyping(this.conversationId);

        // Scroll to bottom
        this.scrollToBottom();
      });
  }

  /**
   * Get typing message for display
   */
  getTypingMessage(): string {
    return this.typingIndicator.getTypingMessage(this.conversationId);
  }

  /**
   * Format timestamp
   */
  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString();
  }

  /**
   * Track by message ID for *ngFor
   */
  trackByMessageId(index: number, message: Message): number {
    return message.id;
  }

  /**
   * Scroll to bottom of messages
   */
  private scrollToBottom(): void {
    if (!this.messagesContainer) return;

    setTimeout(() => {
      const container = this.messagesContainer!.nativeElement;
      container.scrollTop = container.scrollHeight;
    }, 0);
  }

  ngOnDestroy(): void {
    // Stop typing in current conversation
    this.typingIndicator.markUserStoppedTyping(this.conversationId);

    // Clear all typing states
    this.typingIndicator.clearAllTypingStates();

    // Complete subjects
    this.destroy$.next();
    this.destroy$.complete();
  }
}
