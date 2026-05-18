/**
 * Real-Time Updates Service
 * Handles WebSocket messages and updates conversation state in real-time
 *
 * Features:
 * - Listen to incoming messages
 * - Update conversation in list
 * - Move conversation to top
 * - Update last message preview
 * - Update timestamp
 * - Increase unread count
 * - Emit events for UI updates
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  Conversation,
  Message,
  ChatMessageEvent,
  TypingIndicatorEvent,
  PresenceUpdateEvent
} from './models';
import { ConversationService } from './conversation.service';
import { MessagingService } from './messaging.service';
import { AuthIntegrationService } from './auth-integration.service';

/**
 * Real-time update event interface
 */
export interface RealtimeUpdateEvent {
  type: 'message' | 'typing' | 'presence' | 'read' | 'deleted';
  conversationId: number;
  timestamp: Date;
  data: any;
}

/**
 * Conversation update result interface
 */
export interface ConversationUpdateResult {
  success: boolean;
  conversation: Conversation | null;
  previousPosition: number;
  newPosition: number;
  changes: {
    messageUpdated: boolean;
    movedToTop: boolean;
    unreadCountIncreased: boolean;
    timestampUpdated: boolean;
  };
}

/**
 * Real-Time Updates Service
 * Handles WebSocket events and updates conversations
 */
@Injectable({
  providedIn: 'root'
})
export class RealTimeUpdatesService {
  // ═══════════════════════════════════════════════════════════════
  // Observables for UI updates
  // ═══════════════════════════════════════════════════════════════

  private conversationMovedToTop = new Subject<Conversation>();
  public conversationMovedToTop$ = this.conversationMovedToTop.asObservable();

  private conversationMessageUpdated = new Subject<Conversation>();
  public conversationMessageUpdated$ = this.conversationMessageUpdated.asObservable();

  private conversationUnreadCountUpdated = new Subject<{ conversation: Conversation; previousCount: number }>();
  public conversationUnreadCountUpdated$ = this.conversationUnreadCountUpdated.asObservable();

  private realtimeUpdateOccurred = new Subject<RealtimeUpdateEvent>();
  public realtimeUpdateOccurred$ = this.realtimeUpdateOccurred.asObservable();

  private updateResult = new Subject<ConversationUpdateResult>();
  public updateResult$ = this.updateResult.asObservable();

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  private isListening = false;
  private currentUserId: number | null = null;
  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private conversationService: ConversationService,
    private messagingService: MessagingService,
    private authIntegration: AuthIntegrationService
  ) {
    console.log('[RealTimeUpdatesService] Service initialized');
    this.initializeCurrentUser();
  }

  // ═══════════════════════════════════════════════════════════════
  // Initialize
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize current user ID
   */
  private initializeCurrentUser(): void {
    const user = this.authIntegration.getAuthenticatedUser();
    this.currentUserId = user?.id || null;
    console.log('[RealTimeUpdatesService] Current user ID:', this.currentUserId);
  }

  /**
   * Start listening to WebSocket messages
   */
  startListening(): void {
    if (this.isListening) {
      console.warn('[RealTimeUpdatesService] Already listening to WebSocket messages');
      return;
    }

    console.log('[RealTimeUpdatesService] Starting to listen to WebSocket messages');

    // Listen to chat messages
    this.messagingService.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        console.log('[RealTimeUpdatesService] New chat message received:', event);
        this.handleChatMessage(event);
      });

    // Listen to typing indicators
    this.messagingService.typingIndicators$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        console.log('[RealTimeUpdatesService] Typing indicator received:', event);
        this.handleTypingIndicator(event);
      });

    // Listen to presence updates
    this.messagingService.presenceUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        console.log('[RealTimeUpdatesService] Presence update received:', event);
        this.handlePresenceUpdate(event);
      });

    this.isListening = true;
  }

  /**
   * Stop listening to WebSocket messages
   */
  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    console.log('[RealTimeUpdatesService] Stopping to listen to WebSocket messages');
    this.destroy$.next();
    this.isListening = false;
  }

  /**
   * Check if listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // ═══════════════════════════════════════════════════════════════
  // Chat Message Handler
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle incoming chat message
   * Updates conversation list with:
   * - New last message
   * - Updated timestamp
   * - Moved to top
   * - Increased unread count
   */
  private handleChatMessage(event: ChatMessageEvent): void {
    console.log('[RealTimeUpdatesService] Processing chat message:', event);

    if (!event || !event.conversationId) {
      console.warn('[RealTimeUpdatesService] Invalid chat message event');
      return;
    }

    // Skip if message is from current user
    if (event.senderId === this.currentUserId) {
      console.log('[RealTimeUpdatesService] Skipping message from current user');
      return;
    }

    // Get current conversation
    const conversation = this.conversationService.getConversationById(event.conversationId);

    if (!conversation) {
      console.warn('[RealTimeUpdatesService] Conversation not found:', event.conversationId);
      return;
    }

    // Update conversation
    const result = this.updateConversationWithMessage(conversation, event);

    if (result.success) {
      console.log('[RealTimeUpdatesService] Conversation updated successfully');

      // Emit specific events
      if (result.changes.messageUpdated) {
        this.conversationMessageUpdated.next(result.conversation!);
      }

      if (result.changes.movedToTop) {
        this.conversationMovedToTop.next(result.conversation!);
      }

      if (result.changes.unreadCountIncreased) {
        this.conversationUnreadCountUpdated.next({
          conversation: result.conversation!,
          previousCount: conversation.unreadCountForCurrentUser || 0
        });
      }

      // Emit update result
      this.updateResult.next(result);

      // Emit generic update event
      this.realtimeUpdateOccurred.next({
        type: 'message',
        conversationId: event.conversationId,
        timestamp: new Date(event.timestamp),
        data: event
      });
    }
  }

  /**
   * Update conversation with new message
   */
  private updateConversationWithMessage(
    conversation: Conversation,
    event: ChatMessageEvent
  ): ConversationUpdateResult {
    const previousPosition = this.getConversationPosition(conversation.id);

    // Create updated last message
    const updatedLastMessage: Message = {
      id: event.messageId,
      senderId: event.senderId,
      senderName: event.senderName,
      content: event.content,
      timestamp: new Date(event.timestamp),
      isRead: false,
      recipientId: this.currentUserId || 0,
      recipientName: '',
      recipientEmail: ''
    };

    // Create updated conversation
    const updatedConversation: Conversation = {
      ...conversation,
      lastMessage: updatedLastMessage,
      lastMessageTime: new Date(event.timestamp),
      unreadCountForCurrentUser: (conversation.unreadCountForCurrentUser || 0) + 1,
      updatedAt: new Date(event.timestamp)
    };

    // Update conversation service
    this.conversationService.handleNewMessage(updatedConversation);

    const newPosition = this.getConversationPosition(conversation.id);

    return {
      success: true,
      conversation: updatedConversation,
      previousPosition,
      newPosition,
      changes: {
        messageUpdated: true,
        movedToTop: previousPosition > 0,
        unreadCountIncreased: true,
        timestampUpdated: true
      }
    };
  }

  /**
   * Get conversation position in list
   */
  private getConversationPosition(conversationId: number): number {
    const conversations = this.conversationService.getConversations();
    return conversations.findIndex(c => c.id === conversationId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Typing Indicator Handler
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle typing indicator
   */
  private handleTypingIndicator(event: TypingIndicatorEvent): void {
    console.log('[RealTimeUpdatesService] Processing typing indicator:', event);

    this.realtimeUpdateOccurred.next({
      type: 'typing',
      conversationId: event.conversationId,
      timestamp: new Date(),
      data: event
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Presence Update Handler
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(event: PresenceUpdateEvent): void {
    console.log('[RealTimeUpdatesService] Processing presence update:', event);

    this.realtimeUpdateOccurred.next({
      type: 'presence',
      conversationId: 0,
      timestamp: new Date(),
      data: event
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Manual Update Methods (for testing or special cases)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Manually update conversation with message
   * (useful for testing or special cases)
   */
  manuallyUpdateConversation(
    conversationId: number,
    lastMessage: Message,
    timestamp: Date
  ): ConversationUpdateResult {
    const conversation = this.conversationService.getConversationById(conversationId);

    if (!conversation) {
      console.warn('[RealTimeUpdatesService] Conversation not found:', conversationId);
      return {
        success: false,
        conversation: null,
        previousPosition: -1,
        newPosition: -1,
        changes: {
          messageUpdated: false,
          movedToTop: false,
          unreadCountIncreased: false,
          timestampUpdated: false
        }
      };
    }

    const previousPosition = this.getConversationPosition(conversationId);

    const updatedConversation: Conversation = {
      ...conversation,
      lastMessage,
      lastMessageTime: timestamp,
      unreadCountForCurrentUser: (conversation.unreadCountForCurrentUser || 0) + 1,
      updatedAt: timestamp
    };

    this.conversationService.handleNewMessage(updatedConversation);

    const newPosition = this.getConversationPosition(conversationId);

    return {
      success: true,
      conversation: updatedConversation,
      previousPosition,
      newPosition,
      changes: {
        messageUpdated: true,
        movedToTop: previousPosition > 0,
        unreadCountIncreased: true,
        timestampUpdated: true
      }
    };
  }

  /**
   * Mark conversation as read
   */
  markConversationAsRead(conversationId: number): void {
    const conversation = this.conversationService.getConversationById(conversationId);

    if (!conversation) {
      console.warn('[RealTimeUpdatesService] Conversation not found:', conversationId);
      return;
    }

    const updatedConversation: Conversation = {
      ...conversation,
      unreadCountForCurrentUser: 0,
      updatedAt: new Date()
    };

    this.conversationService.updateConversationLocally(updatedConversation);

    this.realtimeUpdateOccurred.next({
      type: 'read',
      conversationId,
      timestamp: new Date(),
      data: { unreadCount: 0 }
    });
  }

  /**
   * Handle conversation deleted
   */
  handleConversationDeleted(conversationId: number): void {
    console.log('[RealTimeUpdatesService] Handling conversation deleted:', conversationId);

    this.conversationService.handleConversationDeleted(conversationId);

    this.realtimeUpdateOccurred.next({
      type: 'deleted',
      conversationId,
      timestamp: new Date(),
      data: { deleted: true }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format timestamp as relative time
   */
  getRelativeTime(date: Date | string): string {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return messageDate.toLocaleDateString();
  }

  /**
   * Get conversations sorted by update time
   */
  getSortedConversations(): Conversation[] {
    const conversations = this.conversationService.getConversations();
    return [...conversations].sort((a, b) => {
      const timeA = new Date(a.lastMessageTime).getTime();
      const timeB = new Date(b.lastMessageTime).getTime();
      return timeB - timeA;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Destroy service
   */
  destroy(): void {
    console.log('[RealTimeUpdatesService] Destroying service');
    this.stopListening();
  }
}
