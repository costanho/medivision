/**
 * Incoming Message Service
 * Handles subscription to incoming messages from recipients
 *
 * Features:
 * - Subscribe to /user/{userId}/queue/messages
 * - Track incoming messages
 * - Detect new conversations
 * - Track unread counts
 * - Manage message delivery state
 * - Emit message received events
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { WebSocketService } from './websocket.service';
import { ChatMessageEvent, Message, Conversation } from './models';

/**
 * Incoming Message Metadata
 * Tracks additional info about received messages
 */
export interface IncomingMessageMetadata {
  receivedAt: Date;              // When message was received locally
  wasNotified: boolean;           // Was user notified of this message
  isInCurrentConversation: boolean;  // Is user viewing this conversation
  automatchedToConversation?: number;  // Conversation ID if matched
}

/**
 * Message Received Event
 * Emitted when message is received
 */
export interface MessageReceivedEvent {
  message: ChatMessageEvent;
  metadata: IncomingMessageMetadata;
  isNewConversation: boolean;
  previousUnreadCount: number;
  newUnreadCount: number;
}

/**
 * Conversation Updated Event
 * Emitted when conversation is updated by new message
 */
export interface ConversationUpdatedEvent {
  conversationId: number;
  lastMessage: ChatMessageEvent;
  newUnreadCount: number;
  movedToTop: boolean;
  previousPosition?: number;
}

@Injectable({
  providedIn: 'root'
})
export class IncomingMessageService implements OnDestroy {
  // Configuration
  private readonly SUBSCRIPTION_RETRY_INTERVAL = 5000;  // 5 seconds

  // Incoming messages tracking
  private incomingMessages = new Map<number, ChatMessageEvent>();  // messageId -> message
  private incomingMessageMetadata = new Map<number, IncomingMessageMetadata>();
  private conversationUnreadCounts = new Map<number, number>();  // conversationId -> unread count

  // Current context
  private currentUserId: number = 0;
  private currentConversationId: number | null = null;
  private isSubscribed = false;

  // Observable streams
  private messageReceivedSubject = new Subject<MessageReceivedEvent>();
  public messageReceived$ = this.messageReceivedSubject.asObservable();

  private conversationUpdatedSubject = new Subject<ConversationUpdatedEvent>();
  public conversationUpdated$ = this.conversationUpdatedSubject.asObservable();

  private newConversationSubject = new Subject<ChatMessageEvent>();
  public newConversation$ = this.newConversationSubject.asObservable();

  private unreadCountChangedSubject = new BehaviorSubject<Map<number, number>>(new Map());
  public unreadCountChanged$ = this.unreadCountChangedSubject.asObservable();

  private totalUnreadSubject = new BehaviorSubject<number>(0);
  public totalUnread$ = this.totalUnreadSubject.asObservable();

  private isListeningSubject = new BehaviorSubject<boolean>(false);
  public isListening$ = this.isListeningSubject.asObservable();

  private subscriptionErrorSubject = new Subject<{ error: string; retryIn: number }>();
  public subscriptionError$ = this.subscriptionErrorSubject.asObservable();

  // Cleanup
  private destroy$ = new Subject<void>();
  private retryTimer: any;

  constructor(private webSocketService: WebSocketService) {
    this.initializeListeners();
  }

  /**
   * Initialize WebSocket listeners
   */
  private initializeListeners(): void {
    // Listen for incoming chat messages from WebSocket
    this.webSocketService.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.handleIncomingMessage(message);
      });

    // Monitor connection status
    this.webSocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        if (status.isConnected && !this.isSubscribed) {
          console.log('[IncomingMessage] Connection restored, resubscribing');
          this.subscribe(this.currentUserId);
        }
      });

    console.log('[IncomingMessage] Service initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Subscription Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start listening for incoming messages
   * Subscribes to /user/{userId}/queue/messages
   */
  public subscribe(userId: number): void {
    if (this.isSubscribed && this.currentUserId === userId) {
      console.log('[IncomingMessage] Already subscribed for user:', userId);
      return;
    }

    this.currentUserId = userId;

    console.log('[IncomingMessage] Subscribing to messages for user:', userId);

    // In real implementation, WebSocket service would subscribe to:
    // /user/{userId}/queue/messages
    // This is handled by the backend STOMP configuration

    this.isSubscribed = true;
    this.isListeningSubject.next(true);

    // Clear retry timer if any
    this.clearRetryTimer();
  }

  /**
   * Stop listening for incoming messages
   */
  public unsubscribe(): void {
    console.log('[IncomingMessage] Unsubscribing from messages');

    this.isSubscribed = false;
    this.isListeningSubject.next(false);
    this.currentUserId = 0;

    this.clearRetryTimer();
  }

  /**
   * Set current conversation context
   * Used to determine if message is from current conversation
   */
  public setCurrentConversation(conversationId: number | null): void {
    this.currentConversationId = conversationId;
    console.log('[IncomingMessage] Current conversation set to:', conversationId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Message Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get incoming message
   */
  public getIncomingMessage(messageId: number): ChatMessageEvent | undefined {
    return this.incomingMessages.get(messageId);
  }

  /**
   * Get all incoming messages
   */
  public getAllIncomingMessages(): ChatMessageEvent[] {
    return Array.from(this.incomingMessages.values());
  }

  /**
   * Get metadata for incoming message
   */
  public getMessageMetadata(messageId: number): IncomingMessageMetadata | undefined {
    return this.incomingMessageMetadata.get(messageId);
  }

  /**
   * Get incoming messages for specific conversation
   */
  public getConversationIncomingMessages(conversationId: number): ChatMessageEvent[] {
    return Array.from(this.incomingMessages.values()).filter(
      msg => msg.conversationId === conversationId
    );
  }

  /**
   * Clear incoming messages for conversation
   */
  public clearConversationMessages(conversationId: number): void {
    for (const [messageId, message] of this.incomingMessages) {
      if (message.conversationId === conversationId) {
        this.incomingMessages.delete(messageId);
        this.incomingMessageMetadata.delete(messageId);
      }
    }
  }

  /**
   * Mark conversation as read
   */
  public markConversationAsRead(conversationId: number): void {
    this.conversationUnreadCounts.set(conversationId, 0);
    this.updateUnreadCounts();

    console.log('[IncomingMessage] Conversation marked as read:', conversationId);
  }

  /**
   * Get unread count for conversation
   */
  public getUnreadCount(conversationId: number): number {
    return this.conversationUnreadCounts.get(conversationId) || 0;
  }

  /**
   * Get all unread counts
   */
  public getAllUnreadCounts(): Map<number, number> {
    return new Map(this.conversationUnreadCounts);
  }

  /**
   * Get total unread count across all conversations
   */
  public getTotalUnreadCount(): number {
    let total = 0;
    this.conversationUnreadCounts.forEach(count => {
      total += count;
    });
    return total;
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Message Handling
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle incoming message from WebSocket
   */
  private handleIncomingMessage(message: ChatMessageEvent): void {
    console.log('[IncomingMessage] Message received:', {
      messageId: message.messageId,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.senderName
    });

    // Ignore messages from current user (echoed back)
    if (message.senderId === this.currentUserId) {
      console.log('[IncomingMessage] Ignoring message from self');
      return;
    }

    // Track message
    this.incomingMessages.set(message.messageId, message);

    // Create metadata
    const metadata: IncomingMessageMetadata = {
      receivedAt: new Date(),
      wasNotified: false,
      isInCurrentConversation: message.conversationId === this.currentConversationId
    };

    this.incomingMessageMetadata.set(message.messageId, metadata);

    // Check if new conversation
    const isNewConversation = !this.conversationUnreadCounts.has(message.conversationId);

    // Update unread count
    const previousUnreadCount = this.getUnreadCount(message.conversationId);
    const newUnreadCount = previousUnreadCount + 1;
    this.conversationUnreadCounts.set(message.conversationId, newUnreadCount);

    // Emit message received event
    const receivedEvent: MessageReceivedEvent = {
      message,
      metadata,
      isNewConversation,
      previousUnreadCount,
      newUnreadCount
    };

    this.messageReceivedSubject.next(receivedEvent);

    // Emit conversation updated event
    const conversationUpdated: ConversationUpdatedEvent = {
      conversationId: message.conversationId,
      lastMessage: message,
      newUnreadCount,
      movedToTop: true,
      previousPosition: undefined
    };

    this.conversationUpdatedSubject.next(conversationUpdated);

    // Emit new conversation event if applicable
    if (isNewConversation) {
      this.newConversationSubject.next(message);
    }

    // Update unread counts observable
    this.updateUnreadCounts();

    console.log('[IncomingMessage] Message processed:', {
      messageId: message.messageId,
      isNewConversation,
      newUnreadCount,
      wasInCurrentConversation: metadata.isInCurrentConversation
    });
  }

  /**
   * Update unread counts observables
   */
  private updateUnreadCounts(): void {
    const unreadMap = new Map(this.conversationUnreadCounts);
    this.unreadCountChangedSubject.next(unreadMap);

    const totalUnread = this.getTotalUnreadCount();
    this.totalUnreadSubject.next(totalUnread);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Utilities
  // ═══════════════════════════════════════════════════════════════

  /**
   * Clear retry timer
   */
  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Cleanup service
   */
  ngOnDestroy(): void {
    console.log('[IncomingMessage] Destroying service');
    this.clearRetryTimer();
    this.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
