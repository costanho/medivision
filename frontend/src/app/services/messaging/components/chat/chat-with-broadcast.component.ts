/**
 * Chat Component with Message Broadcasting Integration
 * Enhanced version of ChatComponent that integrates WebSocket broadcasting
 *
 * Features:
 * - Display message list with real-time updates
 * - Send messages via WebSocket with confirmation tracking
 * - Show delivery status indicators (sending, sent, delivered, read)
 * - Handle offline message queueing
 * - Retry failed messages
 * - Track message statistics
 * - Auto-scroll to latest message
 * - Show typing indicators and presence
 */

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ChatService } from '../../chat.service';
import { AuthIntegrationService } from '../../auth-integration.service';
import { AutoScrollService } from '../../auto-scroll.service';
import { WebSocketService } from '../../websocket.service';
import { BroadcastIntegrationService, MessageStatusWithConfirmation } from '../../broadcast-integration.service';

import { Message, Conversation } from '../../models';

@Component({
  selector: 'app-chat-broadcast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-with-broadcast.component.html',
  styleUrls: ['./chat-with-broadcast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatWithBroadcastComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Inputs
  // ═══════════════════════════════════════════════════════════════

  @Input() conversation: Conversation | null = null;

  // ═══════════════════════════════════════════════════════════════
  // Outputs
  // ═══════════════════════════════════════════════════════════════

  @Output() messageAdded = new EventEmitter<Message>();
  @Output() conversationClosed = new EventEmitter<void>();
  @Output() messageStatusChanged = new EventEmitter<MessageStatusWithConfirmation>();

  // ═══════════════════════════════════════════════════════════════
  // ViewChildren
  // ═══════════════════════════════════════════════════════════════

  @ViewChild('messagesContainer', { static: false }) messagesContainer: ElementRef | null = null;

  // ═══════════════════════════════════════════════════════════════
  // State: Messages & Chat
  // ═══════════════════════════════════════════════════════════════

  messages: Message[] = [];
  messageStatusMap = new Map<string, MessageStatusWithConfirmation>();
  isLoading = false;
  isSending = false;
  error: string | null = null;
  typingUsers: Set<number> = new Set();

  // ═══════════════════════════════════════════════════════════════
  // State: Broadcasting & Confirmation
  // ═══════════════════════════════════════════════════════════════

  isConnected = false;
  queuedMessageCount = 0;
  failedMessageCount = 0;
  pendingConfirmationCount = 0;

  // Statistics
  messageDeliveryRate = 0;
  averageDeliveryTime = 0;

  // ═══════════════════════════════════════════════════════════════
  // State: UI
  // ═══════════════════════════════════════════════════════════════

  showLoadMore = false;
  isAtBottom = true;
  showConnectionStatus = false;
  showMessageRetry = false;

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private chatService: ChatService,
    public authIntegration: AuthIntegrationService,
    private autoScrollService: AutoScrollService,
    private webSocketService: WebSocketService,
    private broadcastIntegration: BroadcastIntegrationService,
    private cdr: ChangeDetectorRef
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Lifecycle Hooks
  // ═══════════════════════════════════════════════════════════════

  ngOnInit(): void {
    console.log('[ChatBroadcast] Initializing component');
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    console.log('[ChatBroadcast] Destroying component');
    this.chatService.clearChat();
    this.autoScrollService.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversation'] && this.conversation) {
      console.log('[ChatBroadcast] Conversation changed:', this.conversation.id);
      this.initializeChat();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Setup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize chat for conversation
   */
  private initializeChat(): void {
    if (!this.conversation) return;

    console.log('[ChatBroadcast] Initializing chat for conversation:', this.conversation.id);
    this.chatService.initializeChat(this.conversation.id);

    // Clear previous status map
    this.messageStatusMap.clear();
    this.cdr.markForCheck();
  }

  /**
   * Setup subscriptions for messages, broadcasting, and confirmation
   */
  private setupSubscriptions(): void {
    console.log('[ChatBroadcast] Setting up subscriptions');

    // ─────────────────────────────────────────────────────────────
    // Chat Service Subscriptions
    // ─────────────────────────────────────────────────────────────

    // Messages
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        console.log('[ChatBroadcast] Messages updated:', messages.length);
        this.messages = messages;
        this.cdr.markForCheck();

        setTimeout(() => {
          if (this.messagesContainer && this.isAtBottom) {
            this.autoScrollService.scrollToBottom(this.messagesContainer.nativeElement);
          }
        }, 100);
      });

    // Loading state
    this.chatService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        console.log('[ChatBroadcast] Loading state:', isLoading);
        this.isLoading = isLoading;
        this.cdr.markForCheck();
      });

    // Sending state
    this.chatService.isSending$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isSending => {
        console.log('[ChatBroadcast] Sending state:', isSending);
        this.isSending = isSending;
        this.cdr.markForCheck();
      });

    // Error
    this.chatService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error) {
          console.error('[ChatBroadcast] Error:', error);
          this.error = error;
          this.cdr.markForCheck();
        }
      });

    // Message received
    this.chatService.messageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('[ChatBroadcast] Message received:', message);
        this.messageAdded.emit(message);

        setTimeout(() => {
          if (this.messagesContainer) {
            this.autoScrollService.autoScrollIfAtBottom(this.messagesContainer.nativeElement);
          }
        }, 50);
      });

    // Typing status
    this.chatService.typingStatusChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ userId, isTyping }) => {
        console.log('[ChatBroadcast] Typing status changed:', userId, isTyping);
        if (isTyping) {
          this.typingUsers.add(userId);
        } else {
          this.typingUsers.delete(userId);
        }
        this.cdr.markForCheck();
      });

    // Auto-scroll position
    this.autoScrollService.scrollPosition$
      .pipe(takeUntil(this.destroy$))
      .subscribe(position => {
        this.isAtBottom = position.isAtBottom;
        this.cdr.markForCheck();
      });

    // ─────────────────────────────────────────────────────────────
    // WebSocket Connection Subscriptions
    // ─────────────────────────────────────────────────────────────

    this.webSocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        console.log('[ChatBroadcast] Connection status:', status.isConnected);
        this.isConnected = status.isConnected;
        this.cdr.markForCheck();
      });

    // ─────────────────────────────────────────────────────────────
    // Broadcasting & Confirmation Subscriptions
    // ─────────────────────────────────────────────────────────────

    // Message status updates
    this.broadcastIntegration.messageStatusUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        console.log('[ChatBroadcast] Message status updated:', {
          clientMessageId: status.messageId,
          status: status.userFacingStatus
        });

        this.messageStatusMap.set(status.messageId, status);
        this.messageStatusChanged.emit(status);
        this.updateMessageStats();
        this.cdr.markForCheck();
      });

    // Broadcast statistics
    this.broadcastIntegration.broadcastStatistics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        console.log('[ChatBroadcast] Statistics updated:', stats);

        this.queuedMessageCount = stats.queuedMessages;
        this.failedMessageCount = stats.totalFailed;
        this.pendingConfirmationCount = stats.totalPending;
        this.messageDeliveryRate = Math.round(stats.deliveryRate);
        this.averageDeliveryTime = Math.round(stats.averageDeliveryTime);

        this.showMessageRetry = this.failedMessageCount > 0;

        this.cdr.markForCheck();
      });

    // Queue changes
    this.broadcastIntegration.broadcastIntegration = this.broadcastIntegration;
  }

  // ═══════════════════════════════════════════════════════════════
  // User Actions: Send Message
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send message via WebSocket with confirmation
   * Waits for both sender and recipient confirmation
   */
  public async sendMessage(
    recipientId: number,
    content: string
  ): Promise<void> {
    if (!this.conversation || !content.trim()) {
      console.warn('[ChatBroadcast] Cannot send message: missing required data');
      return;
    }

    const senderId = this.authIntegration.getCurrentUserId();
    const senderName = this.authIntegration.getCurrentUserName();

    console.log('[ChatBroadcast] Sending message:', {
      conversationId: this.conversation.id,
      recipientId,
      contentLength: content.length
    });

    try {
      const status = await this.broadcastIntegration.sendMessageWithConfirmation(
        recipientId,
        this.conversation.id,
        content,
        senderId,
        senderName
      );

      console.log('[ChatBroadcast] Message confirmed:', status);
      this.messageStatusChanged.emit(status);

    } catch (error) {
      console.error('[ChatBroadcast] Message send error:', error);
      this.error = 'Failed to send message. Please retry.';
      this.cdr.markForCheck();
    }
  }

  /**
   * Send message asynchronously
   * Completes immediately, confirmation happens in background
   */
  public sendMessageAsync(
    recipientId: number,
    content: string
  ): string {
    if (!this.conversation || !content.trim()) {
      throw new Error('Cannot send message: missing required data');
    }

    const senderId = this.authIntegration.getCurrentUserId();
    const senderName = this.authIntegration.getCurrentUserName();

    return this.broadcastIntegration.sendMessageAsync(
      recipientId,
      this.conversation.id,
      content,
      senderId,
      senderName
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // User Actions: Message Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get user-facing status for a message
   */
  public getMessageStatus(clientMessageId: string): string {
    const status = this.messageStatusMap.get(clientMessageId);
    return status?.userFacingStatus || 'sending';
  }

  /**
   * Check if message is failed and can be retried
   */
  public isMessageFailed(clientMessageId: string): boolean {
    const status = this.messageStatusMap.get(clientMessageId);
    return status?.userFacingStatus === 'failed';
  }

  /**
   * Retry a failed message
   */
  public retryMessage(clientMessageId: string): void {
    console.log('[ChatBroadcast] Retrying message:', clientMessageId);
    this.broadcastIntegration.retryMessage(clientMessageId);
  }

  /**
   * Retry all failed messages
   */
  public retryAllFailed(): void {
    console.log('[ChatBroadcast] Retrying all failed messages');
    this.broadcastIntegration.retryAllFailed();
  }

  /**
   * Load more messages
   */
  public loadMoreMessages(): void {
    if (!this.conversation) return;

    console.log('[ChatBroadcast] Loading more messages');
    this.chatService.loadMoreMessages(this.conversation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * Mark message as read
   */
  public markAsRead(message: Message): void {
    if (!message.isRead) {
      console.log('[ChatBroadcast] Marking message as read:', message.id);
      this.chatService.markMessageAsRead(message.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  /**
   * Clear all messages and reset
   */
  public clearChat(): void {
    console.log('[ChatBroadcast] Clearing chat');
    this.chatService.clearChat();
    this.broadcastIntegration.clearAllMessages();
    this.messageStatusMap.clear();
    this.cdr.markForCheck();
  }

  /**
   * Handle scroll event
   */
  public onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    this.autoScrollService.handleScroll(element);
  }

  /**
   * Close conversation
   */
  public closeChatConversation(): void {
    console.log('[ChatBroadcast] Closing conversation');
    this.conversationClosed.emit();
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Utilities
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update message statistics
   */
  private updateMessageStats(): void {
    const stats = this.broadcastIntegration.getStatistics();
    this.queuedMessageCount = stats.queuedMessages;
    this.failedMessageCount = stats.totalFailed;
    this.pendingConfirmationCount = stats.totalPending;
  }

  /**
   * Get queued message count
   */
  public getQueuedCount(): number {
    return this.queuedMessageCount;
  }

  /**
   * Get failed message count
   */
  public getFailedCount(): number {
    return this.failedMessageCount;
  }

  /**
   * Check if any messages are queued
   */
  public hasQueuedMessages(): boolean {
    return this.queuedMessageCount > 0;
  }

  /**
   * Check if any messages have failed
   */
  public hasFailedMessages(): boolean {
    return this.failedMessageCount > 0;
  }

  /**
   * Check if connection is lost
   */
  public isOffline(): boolean {
    return !this.isConnected;
  }
}
