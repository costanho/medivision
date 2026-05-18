/**
 * Broadcast Integration Service
 * High-level service integrating message broadcasting, confirmation, and chat features
 *
 * Provides unified API for:
 * - Sending messages via WebSocket
 * - Tracking delivery status
 * - Handling confirmations
 * - Offline queueing
 * - Retry logic
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil, map, filter } from 'rxjs/operators';

import { WebSocketService } from './websocket.service';
import { MessageBroadcasterService, MessageBroadcastStatus } from './message-broadcaster.service';
import { BroadcastConfirmationService, DualConfirmationState } from './broadcast-confirmation.service';
import { ChatService } from './chat.service';
import { Message, ChatMessageEvent } from './models';

/**
 * Message Status with Confirmation
 * Complete message status including broadcast and confirmation data
 */
export interface MessageStatusWithConfirmation extends MessageBroadcastStatus {
  confirmationState?: DualConfirmationState;
  isDisplayable: boolean;  // Ready to display in UI
  userFacingStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

/**
 * Broadcast Statistics
 * Statistics about message broadcasting
 */
export interface BroadcastStatistics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalPending: number;
  averageDeliveryTime: number;  // milliseconds
  queuedMessages: number;
  deliveryRate: number;  // percentage
}

@Injectable({
  providedIn: 'root'
})
export class BroadcastIntegrationService implements OnDestroy {
  // Observable streams
  private messageStatusUpdatedSubject = new Subject<MessageStatusWithConfirmation>();
  public messageStatusUpdated$ = this.messageStatusUpdatedSubject.asObservable();

  private messageReadyForDisplaySubject = new Subject<Message>();
  public messageReadyForDisplay$ = this.messageReadyForDisplaySubject.asObservable();

  private broadcastStatisticsSubject = new Subject<BroadcastStatistics>();
  public broadcastStatistics$ = this.broadcastStatisticsSubject.asObservable();

  // Cleanup
  private destroy$ = new Subject<void>();

  // Statistics tracking
  private deliveryTimes = new Map<string, number>();

  constructor(
    private webSocketService: WebSocketService,
    private broadcasterService: MessageBroadcasterService,
    private confirmationService: BroadcastConfirmationService,
    private chatService: ChatService
  ) {
    this.initializeIntegration();
  }

  /**
   * Initialize integration between services
   */
  private initializeIntegration(): void {
    // Monitor broadcaster status changes
    this.broadcasterService.messageStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateStatistics();
      });

    // Monitor confirmation state changes
    this.confirmationService.confirmationState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateStatistics();
      });

    // Monitor message sent events
    this.broadcasterService.messageSent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.handleMessageSent(status);
      });

    // Monitor message delivered events
    this.broadcasterService.messageDelivered$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.handleMessageDelivered(status);
      });

    // Monitor both confirmed events
    this.confirmationService.bothConfirmed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmationState => {
        this.handleBothConfirmed(confirmationState);
      });

    // Monitor failed messages
    this.broadcasterService.messageFailed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.handleMessageFailed(status);
      });

    console.log('[BroadcastIntegration] Integration initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Send Messages
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send a message via WebSocket with full tracking
   * This is the main entry point for sending messages from UI
   *
   * @param recipientId - Recipient user ID
   * @param conversationId - Conversation ID
   * @param content - Message content
   * @param senderId - Sender user ID
   * @param senderName - Sender user name
   * @returns Promise that resolves when both sender and recipient confirm
   */
  public async sendMessageWithConfirmation(
    recipientId: number,
    conversationId: number,
    content: string,
    senderId: number,
    senderName: string
  ): Promise<MessageStatusWithConfirmation> {
    console.log('[BroadcastIntegration] Sending message with confirmation:', {
      conversationId,
      recipientId,
      contentLength: content.length
    });

    // Send via broadcaster
    const clientMessageId = this.broadcasterService.sendMessage(
      recipientId,
      conversationId,
      content,
      senderId,
      senderName
    );

    // Track for confirmation
    this.confirmationService.trackMessageForConfirmation(
      clientMessageId,
      0,  // serverMessageId will be filled later
      senderId,
      recipientId,
      conversationId
    );

    // Wait for confirmation
    const confirmationState = await this.confirmationService.waitForConfirmation(
      clientMessageId,
      30000  // 30 second timeout
    ).toPromise();

    // Get final status
    const broadcastStatus = this.broadcasterService.getMessageStatus(clientMessageId);

    return {
      ...broadcastStatus!,
      confirmationState,
      isDisplayable: true,
      userFacingStatus: 'delivered'
    };
  }

  /**
   * Send message without waiting for confirmation
   * Completes immediately after sending
   *
   * @returns Client message ID for tracking
   */
  public sendMessageAsync(
    recipientId: number,
    conversationId: number,
    content: string,
    senderId: number,
    senderName: string
  ): string {
    const clientMessageId = this.broadcasterService.sendMessage(
      recipientId,
      conversationId,
      content,
      senderId,
      senderName
    );

    this.confirmationService.trackMessageForConfirmation(
      clientMessageId,
      0,
      senderId,
      recipientId,
      conversationId
    );

    return clientMessageId;
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Status Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get comprehensive status for a message
   */
  public getMessageFullStatus(clientMessageId: string): MessageStatusWithConfirmation | undefined {
    const broadcastStatus = this.broadcasterService.getMessageStatus(clientMessageId);
    if (!broadcastStatus) return undefined;

    const confirmationState = this.confirmationService.getConfirmationState(clientMessageId);

    return {
      ...broadcastStatus,
      confirmationState,
      isDisplayable: this.isMessageDisplayable(broadcastStatus, confirmationState),
      userFacingStatus: this.getUserFacingStatus(broadcastStatus, confirmationState)
    };
  }

  /**
   * Get all messages with full status
   */
  public getAllMessagesWithStatus(): MessageStatusWithConfirmation[] {
    return this.broadcasterService.getSentMessages().map(status => ({
      ...status,
      confirmationState: this.confirmationService.getConfirmationState(status.messageId),
      isDisplayable: true,
      userFacingStatus: this.getUserFacingStatus(
        status,
        this.confirmationService.getConfirmationState(status.messageId)
      )
    }));
  }

  /**
   * Get pending messages (not fully confirmed)
   */
  public getPendingMessages(): MessageStatusWithConfirmation[] {
    return this.broadcasterService.getPendingMessages().map(status => ({
      ...status,
      confirmationState: this.confirmationService.getConfirmationState(status.messageId),
      isDisplayable: true,
      userFacingStatus: this.getUserFacingStatus(
        status,
        this.confirmationService.getConfirmationState(status.messageId)
      )
    }));
  }

  /**
   * Get failed messages that can be retried
   */
  public getFailedMessages(): MessageStatusWithConfirmation[] {
    return this.broadcasterService.getFailedMessages().map(status => ({
      ...status,
      confirmationState: this.confirmationService.getConfirmationState(status.messageId),
      isDisplayable: true,
      userFacingStatus: 'failed'
    }));
  }

  /**
   * Get queued messages (offline)
   */
  public getQueuedMessages(): MessageStatusWithConfirmation[] {
    return this.broadcasterService.getQueuedMessages().map(status => ({
      ...status,
      confirmationState: this.confirmationService.getConfirmationState(status.messageId),
      isDisplayable: false,
      userFacingStatus: 'sending'
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Retry & Cleanup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Retry a failed message
   */
  public retryMessage(clientMessageId: string): void {
    this.broadcasterService.retryMessage(clientMessageId);
  }

  /**
   * Retry all failed messages
   */
  public retryAllFailed(): void {
    this.broadcasterService.retryAllFailed();
  }

  /**
   * Clear message from tracking
   */
  public clearMessage(clientMessageId: string): void {
    this.broadcasterService.clearMessage(clientMessageId);
    this.confirmationService.clearConfirmation(clientMessageId);
    this.deliveryTimes.delete(clientMessageId);
  }

  /**
   * Clear all messages
   */
  public clearAllMessages(): void {
    this.broadcasterService.clearAllMessages();
    this.confirmationService.clearAllConfirmations();
    this.deliveryTimes.clear();
  }

  /**
   * Clear message queue
   */
  public clearQueue(): void {
    this.broadcasterService.clearQueue();
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Statistics
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get broadcast statistics
   */
  public getStatistics(): BroadcastStatistics {
    const allMessages = this.broadcasterService.getSentMessages();
    const delivered = allMessages.filter(m => m.status === 'delivered').length;
    const failed = allMessages.filter(m => m.status === 'failed').length;
    const pending = allMessages.filter(m => m.status === 'pending' || m.status === 'sent').length;

    const deliveryTimes = Array.from(this.deliveryTimes.values());
    const avgTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;

    return {
      totalSent: allMessages.length,
      totalDelivered: delivered,
      totalFailed: failed,
      totalPending: pending,
      averageDeliveryTime: avgTime,
      queuedMessages: this.broadcasterService.getQueueSize(),
      deliveryRate: allMessages.length > 0 ? (delivered / allMessages.length) * 100 : 0
    };
  }

  /**
   * Subscribe to statistics updates
   */
  public getStatisticsStream(): Observable<BroadcastStatistics> {
    return this.broadcastStatistics$;
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Event Handlers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle message sent event
   */
  private handleMessageSent(status: MessageBroadcastStatus): void {
    this.deliveryTimes.set(status.messageId, Date.now() - status.timestamp.getTime());

    const fullStatus: MessageStatusWithConfirmation = {
      ...status,
      confirmationState: this.confirmationService.getConfirmationState(status.messageId),
      isDisplayable: true,
      userFacingStatus: 'sent'
    };

    this.messageStatusUpdatedSubject.next(fullStatus);
  }

  /**
   * Handle message delivered event
   */
  private handleMessageDelivered(status: MessageBroadcastStatus): void {
    const confirmationState = this.confirmationService.getConfirmationState(status.messageId);

    const fullStatus: MessageStatusWithConfirmation = {
      ...status,
      confirmationState,
      isDisplayable: true,
      userFacingStatus: 'delivered'
    };

    this.messageStatusUpdatedSubject.next(fullStatus);
  }

  /**
   * Handle both sender and recipient confirmed
   */
  private handleBothConfirmed(confirmationState: DualConfirmationState): void {
    const broadcastStatus = this.broadcasterService.getMessageStatus(confirmationState.clientMessageId);

    if (broadcastStatus) {
      const fullStatus: MessageStatusWithConfirmation = {
        ...broadcastStatus,
        confirmationState,
        isDisplayable: true,
        userFacingStatus: 'read'
      };

      this.messageStatusUpdatedSubject.next(fullStatus);
    }
  }

  /**
   * Handle message failed event
   */
  private handleMessageFailed(status: MessageBroadcastStatus): void {
    const fullStatus: MessageStatusWithConfirmation = {
      ...status,
      confirmationState: this.confirmationService.getConfirmationState(status.messageId),
      isDisplayable: true,
      userFacingStatus: 'failed'
    };

    this.messageStatusUpdatedSubject.next(fullStatus);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Utilities
  // ═══════════════════════════════════════════════════════════════

  /**
   * Determine if message is ready to display in UI
   */
  private isMessageDisplayable(
    broadcastStatus: MessageBroadcastStatus | undefined,
    confirmationState: DualConfirmationState | undefined
  ): boolean {
    if (!broadcastStatus) return false;
    // Message is displayable once sent or delivered
    return broadcastStatus.status !== 'pending';
  }

  /**
   * Get user-facing status string
   */
  private getUserFacingStatus(
    broadcastStatus: MessageBroadcastStatus | undefined,
    confirmationState: DualConfirmationState | undefined
  ): 'sending' | 'sent' | 'delivered' | 'read' | 'failed' {
    if (!broadcastStatus) return 'sending';

    if (broadcastStatus.status === 'failed') {
      return 'failed';
    }

    if (confirmationState?.bothConfirmed) {
      return 'read';
    }

    if (broadcastStatus.status === 'delivered' || confirmationState?.senderConfirmed) {
      return 'delivered';
    }

    if (broadcastStatus.status === 'sent') {
      return 'sent';
    }

    return 'sending';
  }

  /**
   * Update statistics and emit
   */
  private updateStatistics(): void {
    const stats = this.getStatistics();
    this.broadcastStatisticsSubject.next(stats);
  }

  /**
   * Cleanup service
   */
  ngOnDestroy(): void {
    console.log('[BroadcastIntegration] Destroying service');
    this.deliveryTimes.clear();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
