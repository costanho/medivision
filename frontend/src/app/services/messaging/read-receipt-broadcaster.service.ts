/**
 * Read Receipt Broadcaster Service
 * Sends read receipt events through WebSocket
 *
 * Features:
 * - Send read receipts via WebSocket to /app/read-receipt
 * - Batch send multiple read receipts
 * - Retry on failure
 * - Track broadcast status
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { WebSocketService } from './websocket.service';
import { ReadReceiptEvent } from './models';

/**
 * Broadcast Status
 * Tracks status of a read receipt broadcast
 */
export interface ReadReceiptBroadcastStatus {
  batchId: string;
  conversationId: number;
  messageIds: number[];
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
  error?: string;
  sentAt?: Date;
  confirmedAt?: Date;
  retries: number;
}

/**
 * Broadcast Confirmation
 * Confirmation that read receipt was received by server
 */
export interface BroadcastConfirmation {
  batchId: string;
  conversationId: number;
  messageCount: number;
  confirmedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ReadReceiptBroadcasterService implements OnDestroy {
  // Configuration
  private readonly BROADCAST_DESTINATION = '/app/read-receipt';
  private readonly CONFIRMATION_TIMEOUT = 10000;  // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;  // ms

  // Broadcast tracking
  private broadcasts = new Map<string, ReadReceiptBroadcastStatus>();  // batchId -> status
  private pendingBatches: ReadReceiptBroadcastStatus[] = [];

  // Observable streams
  private broadcastSentSubject = new Subject<ReadReceiptBroadcastStatus>();
  public broadcastSent$ = this.broadcastSentSubject.asObservable();

  private broadcastConfirmedSubject = new Subject<BroadcastConfirmation>();
  public broadcastConfirmed$ = this.broadcastConfirmedSubject.asObservable();

  private broadcastFailedSubject = new Subject<ReadReceiptBroadcastStatus>();
  public broadcastFailed$ = this.broadcastFailedSubject.asObservable();

  private broadcastStatusSubject = new BehaviorSubject<Map<string, ReadReceiptBroadcastStatus>>(new Map());
  public broadcastStatus$ = this.broadcastStatusSubject.asObservable();

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(private webSocket: WebSocketService) {
    console.log('[ReadReceiptBroadcaster] Service initialized');

    // Listen for confirmations
    this.setupConfirmationListener();
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Broadcasting
  // ═══════════════════════════════════════════════════════════════

  /**
   * Broadcast single read receipt
   */
  public broadcastReadReceipt(
    messageId: number,
    conversationId: number,
    readerId: number,
    readerName: string
  ): string {
    const batchId = this.generateBatchId();

    console.log('[ReadReceiptBroadcaster] Broadcasting read receipt:', {
      messageId,
      conversationId,
      readerId,
      batchId
    });

    const readReceiptEvent: ReadReceiptEvent = {
      eventType: 'read',
      messageId,
      conversationId,
      readerId,
      readerName,
      timestamp: new Date()
    };

    return this.sendBroadcast(batchId, [readReceiptEvent], conversationId);
  }

  /**
   * Broadcast batch of read receipts
   */
  public broadcastReadReceiptBatch(
    messageIds: number[],
    conversationId: number,
    readerId: number,
    readerName: string
  ): string {
    const batchId = this.generateBatchId();

    console.log('[ReadReceiptBroadcaster] Broadcasting batch:', {
      conversationId,
      messageCount: messageIds.length,
      batchId
    });

    const events: ReadReceiptEvent[] = messageIds.map(messageId => ({
      eventType: 'read' as const,
      messageId,
      conversationId,
      readerId,
      readerName,
      timestamp: new Date()
    }));

    return this.sendBroadcast(batchId, events, conversationId);
  }

  /**
   * Retry failed broadcast
   */
  public retryBroadcast(batchId: string): boolean {
    const broadcast = this.broadcasts.get(batchId);

    if (!broadcast || broadcast.status === 'confirmed') {
      return false;
    }

    if (broadcast.retries >= this.MAX_RETRIES) {
      console.error('[ReadReceiptBroadcaster] Max retries reached for batch:', batchId);
      return false;
    }

    console.log('[ReadReceiptBroadcaster] Retrying broadcast:', batchId);

    broadcast.retries++;

    // Resend events
    const events: ReadReceiptEvent[] = broadcast.messageIds.map(messageId => ({
      eventType: 'read' as const,
      messageId,
      conversationId: broadcast.conversationId,
      readerId: 0,  // Set by receiver
      readerName: '',  // Set by receiver
      timestamp: new Date()
    }));

    this.sendBroadcast(batchId, events, broadcast.conversationId);

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Status & Query
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get broadcast status
   */
  public getBroadcastStatus(batchId: string): ReadReceiptBroadcastStatus | undefined {
    return this.broadcasts.get(batchId);
  }

  /**
   * Get all broadcast statuses
   */
  public getAllBroadcastStatuses(): ReadReceiptBroadcastStatus[] {
    return Array.from(this.broadcasts.values());
  }

  /**
   * Get pending broadcasts
   */
  public getPendingBroadcasts(): ReadReceiptBroadcastStatus[] {
    return this.pendingBatches;
  }

  /**
   * Get failed broadcasts
   */
  public getFailedBroadcasts(): ReadReceiptBroadcastStatus[] {
    return Array.from(this.broadcasts.values()).filter(b => b.status === 'failed');
  }

  /**
   * Clear broadcast history
   */
  public clearBroadcastHistory(): void {
    console.log('[ReadReceiptBroadcaster] Clearing broadcast history');

    this.broadcasts.clear();
    this.pendingBatches = [];

    this.broadcastStatusSubject.next(new Map());
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Sending
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send broadcast
   */
  private sendBroadcast(
    batchId: string,
    events: ReadReceiptEvent[],
    conversationId: number
  ): string {
    if (!this.webSocket || !this.webSocket.isConnected()) {
      console.warn('[ReadReceiptBroadcaster] WebSocket not connected, queueing broadcast');

      // Queue for later
      const status: ReadReceiptBroadcastStatus = {
        batchId,
        conversationId,
        messageIds: events.map(e => e.messageId),
        status: 'pending',
        retries: 0
      };

      this.broadcasts.set(batchId, status);
      this.pendingBatches.push(status);

      return batchId;
    }

    // Track status
    const status: ReadReceiptBroadcastStatus = {
      batchId,
      conversationId,
      messageIds: events.map(e => e.messageId),
      status: 'sent',
      sentAt: new Date(),
      retries: 0
    };

    this.broadcasts.set(batchId, status);
    this.broadcastStatusSubject.next(new Map(this.broadcasts));

    // Send via WebSocket
    try {
      events.forEach(event => {
        this.webSocket.send(this.BROADCAST_DESTINATION, event);
      });

      console.log('[ReadReceiptBroadcaster] Broadcast sent:', {
        batchId,
        messageCount: events.length
      });

      this.broadcastSentSubject.next(status);

      // Setup confirmation timeout
      this.setupConfirmationTimeout(batchId);

    } catch (error) {
      console.error('[ReadReceiptBroadcaster] Error sending broadcast:', error);

      status.status = 'failed';
      status.error = String(error);

      this.broadcasts.set(batchId, status);
      this.broadcastStatusSubject.next(new Map(this.broadcasts));
      this.broadcastFailedSubject.next(status);
    }

    return batchId;
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Confirmation
  // ═══════════════════════════════════════════════════════════════

  /**
   * Setup confirmation listener
   */
  private setupConfirmationListener(): void {
    // TODO: Listen for read receipt confirmation events from server
    // this.webSocket.readReceiptConfirmation$
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(confirmation => {
    //     this.handleConfirmation(confirmation);
    //   });
  }

  /**
   * Handle confirmation
   */
  private handleConfirmation(batchId: string): void {
    const status = this.broadcasts.get(batchId);

    if (!status) {
      return;
    }

    console.log('[ReadReceiptBroadcaster] Broadcast confirmed:', batchId);

    status.status = 'confirmed';
    status.confirmedAt = new Date();

    // Remove from pending
    const index = this.pendingBatches.findIndex(b => b.batchId === batchId);
    if (index > -1) {
      this.pendingBatches.splice(index, 1);
    }

    this.broadcasts.set(batchId, status);
    this.broadcastStatusSubject.next(new Map(this.broadcasts));

    const confirmation: BroadcastConfirmation = {
      batchId,
      conversationId: status.conversationId,
      messageCount: status.messageIds.length,
      confirmedAt: status.confirmedAt
    };

    this.broadcastConfirmedSubject.next(confirmation);
  }

  /**
   * Setup confirmation timeout
   */
  private setupConfirmationTimeout(batchId: string): void {
    setTimeout(() => {
      const status = this.broadcasts.get(batchId);

      if (!status || status.status !== 'sent') {
        return;
      }

      // Timeout - mark as failed
      console.warn('[ReadReceiptBroadcaster] Confirmation timeout for batch:', batchId);

      status.status = 'failed';
      status.error = 'Confirmation timeout';

      this.broadcasts.set(batchId, status);
      this.broadcastStatusSubject.next(new Map(this.broadcasts));
      this.broadcastFailedSubject.next(status);

      // Retry
      this.retryBroadcast(batchId);

    }, this.CONFIRMATION_TIMEOUT);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Utilities
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate batch ID
   */
  private generateBatchId(): string {
    return `read-receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup service
   */
  ngOnDestroy(): void {
    console.log('[ReadReceiptBroadcaster] Destroying service');

    this.destroy$.next();
    this.destroy$.complete();
  }
}
