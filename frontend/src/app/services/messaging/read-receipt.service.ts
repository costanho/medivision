/**
 * Read Receipt Service
 * Handles message read receipt tracking and emission
 *
 * Features:
 * - Track which messages have been read
 * - Detect visible messages in viewport
 * - Auto-mark messages as read when visible
 * - Emit read receipt events
 * - Manage read receipt timestamps
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ReadReceiptEvent } from './models';

/**
 * Read Status
 * Tracks read status for a single message
 */
export interface MessageReadStatus {
  messageId: number;
  conversationId: number;
  isRead: boolean;
  readAt?: Date;
  readBy?: number;  // User ID who read it
  readByName?: string;
}

/**
 * Read Receipt
 * Complete read receipt information
 */
export interface ReadReceipt {
  messageId: number;
  conversationId: number;
  readerId: number;
  readerName: string;
  readAt: Date;
}

/**
 * Message Visibility
 * Tracks visibility state of a message
 */
export interface MessageVisibility {
  messageId: number;
  conversationId: number;
  isVisible: boolean;
  visibleAt?: Date;
  lastVisibleAt?: Date;
  visibilityDuration?: number;  // milliseconds
}

/**
 * Unread Message Batch
 * Groups unread messages for batch processing
 */
export interface UnreadMessageBatch {
  conversationId: number;
  messageIds: number[];
  detectedAt: Date;
  sentAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ReadReceiptService implements OnDestroy {
  // Configuration
  private readonly VISIBILITY_THRESHOLD = 0.5;  // 50% visible
  private readonly AUTO_MARK_DELAY = 500;  // ms before auto-marking
  private readonly BATCH_SIZE = 50;  // Max messages per batch

  // Read receipt tracking
  private readReceipts = new Map<number, ReadReceipt>();  // messageId -> ReadReceipt
  private messageReadStatus = new Map<number, MessageReadStatus>();  // messageId -> status
  private messageVisibility = new Map<number, MessageVisibility>();  // messageId -> visibility

  // Batch processing
  private unreadBatch: UnreadMessageBatch | null = null;
  private batchTimer: any;
  private currentConversationId: number | null = null;
  private currentUserId: number = 0;
  private currentUserName: string = '';

  // Observable streams
  private readReceiptSubject = new Subject<ReadReceipt>();
  public readReceipt$ = this.readReceiptSubject.asObservable();

  private messageReadSubject = new Subject<MessageReadStatus>();
  public messageRead$ = this.messageReadSubject.asObservable();

  private visibilityChangedSubject = new Subject<MessageVisibility>();
  public visibilityChanged$ = this.visibilityChangedSubject.asObservable();

  private batchReadySubject = new Subject<UnreadMessageBatch>();
  public batchReady$ = this.batchReadySubject.asObservable();

  private readReceiptsMapSubject = new BehaviorSubject<Map<number, ReadReceipt>>(new Map());
  public readReceiptsMap$ = this.readReceiptsMapSubject.asObservable();

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor() {
    console.log('[ReadReceipt] Service initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: User Context
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set current user context
   */
  public setCurrentUser(userId: number, userName: string): void {
    this.currentUserId = userId;
    this.currentUserName = userName;

    console.log('[ReadReceipt] Current user set:', userId, userName);
  }

  /**
   * Set current conversation context
   */
  public setCurrentConversation(conversationId: number | null): void {
    // Flush any pending batch before switching conversations
    if (this.unreadBatch && this.unreadBatch.conversationId !== conversationId) {
      this.flushBatch();
    }

    this.currentConversationId = conversationId;
    console.log('[ReadReceipt] Current conversation set:', conversationId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Message Visibility & Auto-Marking
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark message visibility
   * Call when message becomes visible in viewport
   */
  public markMessageVisible(messageId: number, conversationId: number): void {
    const visibility: MessageVisibility = {
      messageId,
      conversationId,
      isVisible: true,
      visibleAt: new Date()
    };

    const existing = this.messageVisibility.get(messageId);
    if (existing) {
      visibility.lastVisibleAt = existing.lastVisibleAt;
    }

    this.messageVisibility.set(messageId, visibility);

    console.log('[ReadReceipt] Message visible:', messageId);

    // Auto-mark as read after delay
    this.scheduleAutoMark(messageId, conversationId);
  }

  /**
   * Mark message as no longer visible
   * Call when message leaves viewport
   */
  public markMessageNotVisible(messageId: number): void {
    const visibility = this.messageVisibility.get(messageId);

    if (visibility) {
      visibility.isVisible = false;
      visibility.lastVisibleAt = new Date();

      if (visibility.visibleAt) {
        const duration = visibility.lastVisibleAt.getTime() - visibility.visibleAt.getTime();
        visibility.visibilityDuration = duration;
      }

      this.messageVisibility.set(messageId, visibility);

      console.log('[ReadReceipt] Message not visible:', messageId);
    }
  }

  /**
   * Manually mark message as read
   */
  public markMessageAsRead(messageId: number, conversationId: number, readAt?: Date): void {
    const now = readAt || new Date();

    const status: MessageReadStatus = {
      messageId,
      conversationId,
      isRead: true,
      readAt: now,
      readBy: this.currentUserId,
      readByName: this.currentUserName
    };

    this.messageReadStatus.set(messageId, status);

    console.log('[ReadReceipt] Message marked as read:', messageId);

    // Emit event
    this.messageReadSubject.next(status);

    // Add to batch
    this.addToBatch(messageId, conversationId);
  }

  /**
   * Batch mark multiple messages as read
   */
  public markMessagesAsRead(messageIds: number[], conversationId: number, readAt?: Date): void {
    console.log('[ReadReceipt] Marking', messageIds.length, 'messages as read');

    messageIds.forEach(messageId => {
      this.markMessageAsRead(messageId, conversationId, readAt);
    });
  }

  /**
   * Mark all visible messages in conversation as read
   */
  public markAllVisibleAsRead(conversationId: number, readAt?: Date): void {
    const visibleMessages = Array.from(this.messageVisibility.values())
      .filter(m => m.conversationId === conversationId && m.isVisible)
      .map(m => m.messageId);

    console.log('[ReadReceipt] Marking', visibleMessages.length, 'visible messages as read');

    this.markMessagesAsRead(visibleMessages, conversationId, readAt);
  }

  /**
   * Mark all messages in conversation as read
   */
  public markAllConversationAsRead(conversationId: number, messageIds: number[], readAt?: Date): void {
    console.log('[ReadReceipt] Marking all', messageIds.length, 'conversation messages as read');

    this.markMessagesAsRead(messageIds, conversationId, readAt);
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Incoming Read Receipts
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle incoming read receipt from other user
   */
  public handleReadReceipt(event: ReadReceiptEvent): void {
    console.log('[ReadReceipt] Incoming read receipt:', {
      messageId: event.messageId,
      readerId: event.readerId,
      readerName: event.readerName,
      timestamp: event.timestamp
    });

    const receipt: ReadReceipt = {
      messageId: event.messageId,
      conversationId: event.conversationId,
      readerId: event.readerId,
      readerName: event.readerName,
      readAt: event.timestamp
    };

    // Store receipt
    this.readReceipts.set(event.messageId, receipt);

    // Update map observable
    const newMap = new Map(this.readReceipts);
    this.readReceiptsMapSubject.next(newMap);

    // Emit event
    this.readReceiptSubject.next(receipt);
  }

  /**
   * Handle batch read receipts
   */
  public handleBatchReadReceipts(receipts: ReadReceiptEvent[]): void {
    console.log('[ReadReceipt] Handling batch of', receipts.length, 'read receipts');

    receipts.forEach(receipt => {
      this.handleReadReceipt(receipt);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Status & Query
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get read receipt for message
   */
  public getReadReceipt(messageId: number): ReadReceipt | undefined {
    return this.readReceipts.get(messageId);
  }

  /**
   * Get all read receipts
   */
  public getAllReadReceipts(): ReadReceipt[] {
    return Array.from(this.readReceipts.values());
  }

  /**
   * Get read receipts for conversation
   */
  public getConversationReadReceipts(conversationId: number): ReadReceipt[] {
    return Array.from(this.readReceipts.values()).filter(
      r => r.conversationId === conversationId
    );
  }

  /**
   * Check if message is read
   */
  public isMessageRead(messageId: number): boolean {
    return this.readReceipts.has(messageId);
  }

  /**
   * Get read status for message
   */
  public getMessageReadStatus(messageId: number): MessageReadStatus | undefined {
    return this.messageReadStatus.get(messageId);
  }

  /**
   * Get visibility status for message
   */
  public getMessageVisibility(messageId: number): MessageVisibility | undefined {
    return this.messageVisibility.get(messageId);
  }

  /**
   * Get all unread message IDs in conversation
   */
  public getUnreadMessageIds(conversationId: number, allMessageIds: number[]): number[] {
    return allMessageIds.filter(messageId => !this.isMessageRead(messageId));
  }

  /**
   * Get unread count in conversation
   */
  public getUnreadCount(conversationId: number, allMessageIds: number[]): number {
    return this.getUnreadMessageIds(conversationId, allMessageIds).length;
  }

  /**
   * Clear all read receipts
   */
  public clearReadReceipts(): void {
    console.log('[ReadReceipt] Clearing all read receipts');

    this.readReceipts.clear();
    this.messageReadStatus.clear();
    this.messageVisibility.clear();

    this.readReceiptsMapSubject.next(new Map());
  }

  /**
   * Clear read receipts for conversation
   */
  public clearConversationReceipts(conversationId: number): void {
    console.log('[ReadReceipt] Clearing receipts for conversation:', conversationId);

    // Remove read receipts
    for (const [messageId, receipt] of this.readReceipts) {
      if (receipt.conversationId === conversationId) {
        this.readReceipts.delete(messageId);
      }
    }

    // Remove status
    for (const [messageId, status] of this.messageReadStatus) {
      if (status.conversationId === conversationId) {
        this.messageReadStatus.delete(messageId);
      }
    }

    // Remove visibility
    for (const [messageId, visibility] of this.messageVisibility) {
      if (visibility.conversationId === conversationId) {
        this.messageVisibility.delete(messageId);
      }
    }

    const newMap = new Map(this.readReceipts);
    this.readReceiptsMapSubject.next(newMap);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Batch Processing
  // ═══════════════════════════════════════════════════════════════

  /**
   * Add message to read batch
   */
  private addToBatch(messageId: number, conversationId: number): void {
    if (!this.unreadBatch || this.unreadBatch.conversationId !== conversationId) {
      this.unreadBatch = {
        conversationId,
        messageIds: [messageId],
        detectedAt: new Date()
      };
    } else {
      // Add to existing batch
      if (!this.unreadBatch.messageIds.includes(messageId)) {
        this.unreadBatch.messageIds.push(messageId);
      }
    }

    // Check if batch is full
    if (this.unreadBatch.messageIds.length >= this.BATCH_SIZE) {
      this.flushBatch();
    } else {
      // Schedule flush
      this.scheduleBatchFlush();
    }
  }

  /**
   * Schedule batch flush after delay
   */
  private scheduleBatchFlush(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, this.AUTO_MARK_DELAY);
  }

  /**
   * Flush pending batch
   */
  private flushBatch(): void {
    if (!this.unreadBatch || this.unreadBatch.messageIds.length === 0) {
      return;
    }

    console.log('[ReadReceipt] Flushing batch:', {
      conversationId: this.unreadBatch.conversationId,
      messageCount: this.unreadBatch.messageIds.length
    });

    // Emit batch ready event
    this.unreadBatch.sentAt = new Date();
    this.batchReadySubject.next(this.unreadBatch);

    // Reset batch
    this.unreadBatch = null;

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Auto-Marking
  // ═══════════════════════════════════════════════════════════════

  /**
   * Schedule auto-mark for message
   */
  private scheduleAutoMark(messageId: number, conversationId: number): void {
    setTimeout(() => {
      const visibility = this.messageVisibility.get(messageId);

      // Only auto-mark if still visible
      if (visibility && visibility.isVisible && !this.isMessageRead(messageId)) {
        console.log('[ReadReceipt] Auto-marking visible message:', messageId);

        this.markMessageAsRead(messageId, conversationId);
      }
    }, this.AUTO_MARK_DELAY);
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    console.log('[ReadReceipt] Destroying service');

    // Flush any pending batch
    this.flushBatch();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }
}
