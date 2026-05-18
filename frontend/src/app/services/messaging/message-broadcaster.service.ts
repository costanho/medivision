/**
 * Message Broadcaster Service
 * Handles message broadcasting through WebSocket with confirmation tracking
 *
 * Features:
 * - Send messages via WebSocket /app/chat destination
 * - Track sent messages with unique IDs
 * - Receive broadcast confirmations for sender and recipient
 * - Handle message delivery status
 * - Queue messages when offline
 * - Retry failed messages
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { WebSocketService } from './websocket.service';
import { ChatMessageEvent, Message } from './models';

/**
 * Message Broadcast Status
 * Tracks the status of sent messages
 */
export interface MessageBroadcastStatus {
  messageId: string;              // Unique client-side message ID (UUID)
  senderId: number;               // Sender user ID
  recipientId: number;            // Recipient user ID
  conversationId: number;         // Conversation ID
  content: string;                // Message content
  timestamp: Date;                // When message was sent
  status: 'pending' | 'sent' | 'delivered' | 'failed';  // Delivery status
  senderConfirmed?: boolean;      // Sender received confirmation
  recipientConfirmed?: boolean;   // Recipient received confirmation
  serverMessageId?: number;       // Server-assigned message ID (from confirmation)
  error?: string;                 // Error message if failed
  retryCount: number;             // Number of retry attempts
}

/**
 * Message Broadcast Confirmation
 * Confirmation from server when message is broadcasted
 */
export interface MessageBroadcastConfirmation {
  clientMessageId: string;        // Original client message ID
  serverMessageId: number;        // Server-assigned ID
  status: 'delivered' | 'failed'; // Delivery status
  confirmedAt: Date;              // When confirmation was received
  confirmedBy: 'sender' | 'recipient';  // Who confirmed
  message?: ChatMessageEvent;     // Full message if included
}

@Injectable({
  providedIn: 'root'
})
export class MessageBroadcasterService implements OnDestroy {
  // Configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // milliseconds
  private readonly OFFLINE_QUEUE_SIZE = 100; // max queued messages

  // Message tracking
  private sentMessagesMap = new Map<string, MessageBroadcastStatus>();
  private messageQueue: MessageBroadcastStatus[] = [];

  // Observable streams
  private messageStatusSubject = new BehaviorSubject<Map<string, MessageBroadcastStatus>>(
    new Map()
  );
  public messageStatus$ = this.messageStatusSubject.asObservable();

  private broadcastConfirmationsSubject = new Subject<MessageBroadcastConfirmation>();
  public broadcastConfirmations$ = this.broadcastConfirmationsSubject.asObservable();

  private messageSentSubject = new Subject<MessageBroadcastStatus>();
  public messageSent$ = this.messageSentSubject.asObservable();

  private messageDeliveredSubject = new Subject<MessageBroadcastStatus>();
  public messageDelivered$ = this.messageDeliveredSubject.asObservable();

  private messageFailedSubject = new Subject<MessageBroadcastStatus>();
  public messageFailed$ = this.messageFailedSubject.asObservable();

  private queueChangedSubject = new BehaviorSubject<number>(0);
  public queueChanged$ = this.queueChangedSubject.asObservable();

  // Cleanup
  private destroy$ = new Subject<void>();

  // Retry timers
  private retryTimers = new Map<string, any>();

  constructor(private webSocketService: WebSocketService) {
    this.initializeMessageListeners();
  }

  /**
   * Initialize listeners for incoming broadcast confirmations
   */
  private initializeMessageListeners(): void {
    // Listen for chat messages (confirmations from backend)
    this.webSocketService.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.handleBroadcastConfirmation(message);
      });

    // Listen for connection status changes
    this.webSocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        if (status.isConnected) {
          this.processQueuedMessages();
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Send Messages
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send a message via WebSocket
   * Message is sent to backend via /app/chat destination
   *
   * @param recipientId - ID of message recipient
   * @param conversationId - ID of conversation
   * @param content - Message text content
   * @param senderId - ID of message sender
   * @param senderName - Name of message sender
   * @returns Client-side message ID for tracking
   */
  public sendMessage(
    recipientId: number,
    conversationId: number,
    content: string,
    senderId: number,
    senderName: string
  ): string {
    // Generate unique client message ID
    const clientMessageId = this.generateMessageId();

    // Create broadcast status
    const status: MessageBroadcastStatus = {
      messageId: clientMessageId,
      senderId,
      recipientId,
      conversationId,
      content,
      timestamp: new Date(),
      status: 'pending',
      senderConfirmed: false,
      recipientConfirmed: false,
      retryCount: 0
    };

    // Track message
    this.sentMessagesMap.set(clientMessageId, status);
    this.updateMessageStatus();

    console.log('[MessageBroadcaster] Sending message:', {
      clientMessageId,
      conversationId,
      recipientId
    });

    // Attempt to send
    if (this.webSocketService.isConnected()) {
      this.attemptSend(status);
    } else {
      // Queue message if offline
      this.queueMessage(status);
    }

    return clientMessageId;
  }

  /**
   * Send a batch of messages
   */
  public sendMessages(
    recipientId: number,
    conversationId: number,
    messages: Array<{ content: string; senderId: number; senderName: string }>
  ): string[] {
    return messages.map(msg =>
      this.sendMessage(
        recipientId,
        conversationId,
        msg.content,
        msg.senderId,
        msg.senderName
      )
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Status Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get status of a specific sent message
   */
  public getMessageStatus(clientMessageId: string): MessageBroadcastStatus | undefined {
    return this.sentMessagesMap.get(clientMessageId);
  }

  /**
   * Get all sent messages
   */
  public getSentMessages(): MessageBroadcastStatus[] {
    return Array.from(this.sentMessagesMap.values());
  }

  /**
   * Get messages pending confirmation
   */
  public getPendingMessages(): MessageBroadcastStatus[] {
    return Array.from(this.sentMessagesMap.values()).filter(
      msg => msg.status === 'pending' || msg.status === 'sent'
    );
  }

  /**
   * Get failed messages
   */
  public getFailedMessages(): MessageBroadcastStatus[] {
    return Array.from(this.sentMessagesMap.values()).filter(
      msg => msg.status === 'failed'
    );
  }

  /**
   * Get queued (offline) messages
   */
  public getQueuedMessages(): MessageBroadcastStatus[] {
    return [...this.messageQueue];
  }

  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.messageQueue.length;
  }

  /**
   * Clear a specific message from tracking
   */
  public clearMessage(clientMessageId: string): void {
    this.sentMessagesMap.delete(clientMessageId);
    this.updateMessageStatus();
  }

  /**
   * Clear all messages
   */
  public clearAllMessages(): void {
    this.sentMessagesMap.clear();
    this.updateMessageStatus();
  }

  // ═══════════════════════════════════════════════════════════════
  // Queue Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Queue a message for sending when online
   */
  private queueMessage(status: MessageBroadcastStatus): void {
    if (this.messageQueue.length >= this.OFFLINE_QUEUE_SIZE) {
      console.warn('[MessageBroadcaster] Queue full, dropping oldest message');
      this.messageQueue.shift();
    }

    status.status = 'pending';
    this.messageQueue.push(status);
    this.queueChangedSubject.next(this.messageQueue.length);

    console.log('[MessageBroadcaster] Message queued:', {
      clientMessageId: status.messageId,
      queueSize: this.messageQueue.length
    });
  }

  /**
   * Process all queued messages when connection is restored
   */
  private processQueuedMessages(): void {
    console.log('[MessageBroadcaster] Processing queued messages:', {
      queueSize: this.messageQueue.length
    });

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(status => {
      this.attemptSend(status);
    });

    this.queueChangedSubject.next(0);
  }

  /**
   * Clear the message queue
   */
  public clearQueue(): void {
    this.messageQueue = [];
    this.queueChangedSubject.next(0);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Message Sending
  // ═══════════════════════════════════════════════════════════════

  /**
   * Attempt to send a message via WebSocket
   */
  private attemptSend(status: MessageBroadcastStatus): void {
    if (!this.webSocketService.isConnected()) {
      console.warn('[MessageBroadcaster] Not connected, cannot send:', status.messageId);
      this.queueMessage(status);
      return;
    }

    try {
      // Send via WebSocket to /app/chat destination
      this.webSocketService.sendMessage(
        status.conversationId,
        status.recipientId,
        status.content,
        status.senderId,
        status.senderId.toString() // senderName (would normally come from auth service)
      );

      // Update status
      status.status = 'sent';
      status.timestamp = new Date();
      this.updateMessageStatus();

      // Emit sent event
      this.messageSentSubject.next({ ...status });

      console.log('[MessageBroadcaster] Message sent:', {
        clientMessageId: status.messageId,
        conversationId: status.conversationId
      });
    } catch (error) {
      console.error('[MessageBroadcaster] Send error:', error);
      this.handleSendError(status);
    }
  }

  /**
   * Handle send error and retry
   */
  private handleSendError(status: MessageBroadcastStatus): void {
    status.retryCount++;

    if (status.retryCount < this.MAX_RETRY_ATTEMPTS) {
      // Schedule retry
      const delay = this.RETRY_DELAY * Math.pow(2, status.retryCount - 1);

      console.log('[MessageBroadcaster] Scheduling retry:', {
        clientMessageId: status.messageId,
        attempt: status.retryCount,
        delay
      });

      const timer = setTimeout(() => {
        this.attemptSend(status);
      }, delay);

      this.retryTimers.set(status.messageId, timer);
    } else {
      // Max retries exceeded
      status.status = 'failed';
      status.error = 'Max retry attempts exceeded';
      this.updateMessageStatus();
      this.messageFailedSubject.next({ ...status });

      console.error('[MessageBroadcaster] Message failed:', {
        clientMessageId: status.messageId,
        error: status.error
      });
    }
  }

  /**
   * Retry a failed message
   */
  public retryMessage(clientMessageId: string): void {
    const status = this.sentMessagesMap.get(clientMessageId);
    if (!status) {
      console.warn('[MessageBroadcaster] Message not found:', clientMessageId);
      return;
    }

    console.log('[MessageBroadcaster] Retrying message:', clientMessageId);

    status.retryCount = 0;
    this.attemptSend(status);
  }

  /**
   * Retry all failed messages
   */
  public retryAllFailed(): void {
    const failed = this.getFailedMessages();
    console.log('[MessageBroadcaster] Retrying all failed messages:', {
      count: failed.length
    });

    failed.forEach(status => {
      this.retryMessage(status.messageId);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Confirmation Handling
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle broadcast confirmation from backend
   * Confirms message was received by server and/or recipient
   */
  private handleBroadcastConfirmation(message: ChatMessageEvent): void {
    // Extract client message ID from message
    // This assumes backend includes clientMessageId in response
    // Or we match based on content/timestamp

    // For now, we'll track based on the fact that we sent it
    // In real implementation, backend would echo back clientMessageId

    console.log('[MessageBroadcaster] Received broadcast confirmation:', {
      conversationId: message.conversationId,
      senderName: message.senderName,
      timestamp: message.timestamp
    });

    // Find matching sent message by content and timestamp similarity
    let matchedStatus: MessageBroadcastStatus | undefined;

    for (const [, status] of this.sentMessagesMap) {
      if (
        status.conversationId === message.conversationId &&
        status.senderId === message.senderId
      ) {
        // Potential match - in real implementation, use clientMessageId
        matchedStatus = status;
        break;
      }
    }

    if (matchedStatus) {
      // Determine who confirmed
      // If we're the sender, recipient confirmed
      // If we're not the sender, sender confirmed

      matchedStatus.senderConfirmed = true;
      matchedStatus.recipientConfirmed = message.senderId !== matchedStatus.senderId;
      matchedStatus.status = 'delivered';
      matchedStatus.serverMessageId = message.messageId;

      this.updateMessageStatus();

      // Emit confirmation event
      const confirmation: MessageBroadcastConfirmation = {
        clientMessageId: matchedStatus.messageId,
        serverMessageId: message.messageId,
        status: 'delivered',
        confirmedAt: new Date(),
        confirmedBy: message.senderId === matchedStatus.senderId ? 'sender' : 'recipient',
        message
      };

      this.broadcastConfirmationsSubject.next(confirmation);
      this.messageDeliveredSubject.next(matchedStatus);

      console.log('[MessageBroadcaster] Message confirmed:', {
        clientMessageId: matchedStatus.messageId,
        serverMessageId: message.messageId,
        confirmedBy: confirmation.confirmedBy
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Utilities
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update message status observable
   */
  private updateMessageStatus(): void {
    const mapCopy = new Map(this.sentMessagesMap);
    this.messageStatusSubject.next(mapCopy);
  }

  /**
   * Cleanup service
   */
  ngOnDestroy(): void {
    console.log('[MessageBroadcaster] Destroying service');

    // Clear all retry timers
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();

    // Clean up subjects
    this.destroy$.next();
    this.destroy$.complete();
  }
}
