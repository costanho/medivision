/**
 * Typing Indicator Broadcaster Service
 * Sends typing indicator events via WebSocket
 *
 * Features:
 * - Broadcasts typing indicators to backend
 * - Tracks broadcast status
 * - Automatic retry on failure
 * - Confirmation handling
 * - Observable streams for reactive updates
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';

import { TypingIndicatorStatus } from './models';
import { WebSocketService } from './websocket.service';

/**
 * Configuration for typing indicator broadcasting
 */
interface BroadcasterConfig {
  destination: string;
  maxRetries: number;
  retryDelay: number;
  confirmationTimeout: number;
}

/**
 * Broadcast request wrapper
 */
interface BroadcastRequest {
  destination: string;
  payload: {
    conversationId: number;
    typistId: number;
    typistName: string;
    messageType: 'typing' | 'stopped_typing';
    timestamp: Date;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TypingIndicatorBroadcasterService implements OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  private config: BroadcasterConfig = {
    destination: '/app/typing-indicator',
    maxRetries: 3,
    retryDelay: 2000,
    confirmationTimeout: 10000
  };

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  private broadcastStatuses = new Map<string, TypingIndicatorStatus>();

  // ═══════════════════════════════════════════════════════════════
  // Subjects & Observables
  // ═══════════════════════════════════════════════════════════════

  // When broadcast is sent
  private broadcastSent$ = new Subject<TypingIndicatorStatus>();

  // When broadcast fails
  private broadcastFailed$ = new Subject<TypingIndicatorStatus>();

  // When broadcast is confirmed by server
  private broadcastConfirmed$ = new Subject<TypingIndicatorStatus>();

  // Map of all broadcast statuses
  private broadcastStatus$ = new BehaviorSubject<Map<string, TypingIndicatorStatus>>(
    new Map()
  );

  // ═══════════════════════════════════════════════════════════════
  // Public Observable Streams
  // ═══════════════════════════════════════════════════════════════

  public broadcastSent = this.broadcastSent$.asObservable();
  public broadcastFailed = this.broadcastFailed$.asObservable();
  public broadcastConfirmed = this.broadcastConfirmed$.asObservable();
  public broadcastStatus = this.broadcastStatus$.asObservable();

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(private webSocket: WebSocketService) {}

  // ═══════════════════════════════════════════════════════════════
  // Public: Configuration
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set custom configuration
   */
  public setConfig(config: Partial<BroadcasterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): BroadcasterConfig {
    return { ...this.config };
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Broadcasting
  // ═══════════════════════════════════════════════════════════════

  /**
   * Broadcast typing indicator
   * Returns batch ID for tracking
   */
  public broadcastTyping(
    conversationId: number,
    typistId: number,
    typistName: string
  ): string {
    return this.broadcast(conversationId, typistId, typistName, 'typing');
  }

  /**
   * Broadcast stopped typing
   * Returns batch ID for tracking
   */
  public broadcastStoppedTyping(
    conversationId: number,
    typistId: number,
    typistName: string
  ): string {
    return this.broadcast(conversationId, typistId, typistName, 'stopped_typing');
  }

  /**
   * Internal broadcast method
   */
  private broadcast(
    conversationId: number,
    typistId: number,
    typistName: string,
    messageType: 'typing' | 'stopped_typing'
  ): string {
    const batchId = this.generateBatchId(messageType);

    // Create status entry
    const status: TypingIndicatorStatus = {
      batchId,
      conversationId,
      typistId,
      typistName,
      status: 'pending',
      messageType,
      sentAt: new Date(),
      retries: 0
    };

    this.broadcastStatuses.set(batchId, status);

    try {
      // Check connection
      if (!this.webSocket.isConnected()) {
        status.status = 'pending';
        console.log('[TypingBroadcaster] Not connected, queuing broadcast:', batchId);
      } else {
        // Send via WebSocket
        const request: BroadcastRequest = {
          destination: this.config.destination,
          payload: {
            conversationId,
            typistId,
            typistName,
            messageType,
            timestamp: new Date()
          }
        };

        this.webSocket.send(request.destination, request.payload);
        status.status = 'sent';

        console.log('[TypingBroadcaster] Broadcast sent:', {
          batchId,
          conversationId,
          messageType
        });
      }

      // Emit event
      this.broadcastSent$.next(status);
      this.broadcastStatus$.next(new Map(this.broadcastStatuses));

      return batchId;
    } catch (error) {
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';

      console.error('[TypingBroadcaster] Broadcast failed:', error);
      this.broadcastFailed$.next(status);
      this.broadcastStatus$.next(new Map(this.broadcastStatuses));

      return batchId;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Retry
  // ═══════════════════════════════════════════════════════════════

  /**
   * Retry a failed broadcast
   */
  public retryBroadcast(batchId: string): boolean {
    const status = this.broadcastStatuses.get(batchId);

    if (!status) {
      console.warn('[TypingBroadcaster] Batch not found:', batchId);
      return false;
    }

    // Don't retry confirmed broadcasts
    if (status.status === 'confirmed') {
      console.warn('[TypingBroadcaster] Cannot retry confirmed broadcast:', batchId);
      return false;
    }

    // Check max retries
    if (status.retries >= this.config.maxRetries) {
      console.warn('[TypingBroadcaster] Max retries exceeded:', batchId);
      return false;
    }

    try {
      status.retries++;
      status.status = 'pending';

      const request: BroadcastRequest = {
        destination: this.config.destination,
        payload: {
          conversationId: status.conversationId,
          typistId: status.typistId,
          typistName: status.typistName,
          messageType: status.messageType,
          timestamp: new Date()
        }
      };

      this.webSocket.send(request.destination, request.payload);
      status.status = 'sent';

      console.log('[TypingBroadcaster] Retry sent:', {
        batchId,
        attempt: status.retries
      });

      this.broadcastSent$.next(status);
      this.broadcastStatus$.next(new Map(this.broadcastStatuses));

      return true;
    } catch (error) {
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';

      console.error('[TypingBroadcaster] Retry failed:', error);
      this.broadcastFailed$.next(status);
      this.broadcastStatus$.next(new Map(this.broadcastStatuses));

      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Status & Query
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get broadcast status
   */
  public getBroadcastStatus(batchId: string): TypingIndicatorStatus | undefined {
    return this.broadcastStatuses.get(batchId);
  }

  /**
   * Get all broadcast statuses
   */
  public getAllBroadcastStatuses(): TypingIndicatorStatus[] {
    return Array.from(this.broadcastStatuses.values());
  }

  /**
   * Get pending broadcasts
   */
  public getPendingBroadcasts(): TypingIndicatorStatus[] {
    return Array.from(this.broadcastStatuses.values()).filter(
      status => status.status === 'pending'
    );
  }

  /**
   * Get failed broadcasts
   */
  public getFailedBroadcasts(): TypingIndicatorStatus[] {
    return Array.from(this.broadcastStatuses.values()).filter(
      status => status.status === 'failed'
    );
  }

  /**
   * Get broadcasts for a conversation
   */
  public getConversationBroadcasts(conversationId: number): TypingIndicatorStatus[] {
    return Array.from(this.broadcastStatuses.values()).filter(
      status => status.conversationId === conversationId
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Confirmation
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark broadcast as confirmed by server
   */
  public confirmBroadcast(batchId: string): void {
    const status = this.broadcastStatuses.get(batchId);

    if (!status) {
      console.warn('[TypingBroadcaster] Batch not found:', batchId);
      return;
    }

    status.status = 'confirmed';
    status.confirmedAt = new Date();

    console.log('[TypingBroadcaster] Broadcast confirmed:', batchId);

    this.broadcastConfirmed$.next(status);
    this.broadcastStatus$.next(new Map(this.broadcastStatuses));
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Clear & Reset
  // ═══════════════════════════════════════════════════════════════

  /**
   * Clear broadcast history
   */
  public clearBroadcastHistory(): void {
    this.broadcastStatuses.clear();
    this.broadcastStatus$.next(new Map());

    console.log('[TypingBroadcaster] Broadcast history cleared');
  }

  /**
   * Clear broadcasts for a conversation
   */
  public clearConversationBroadcasts(conversationId: number): void {
    const batchIds = Array.from(this.broadcastStatuses.keys()).filter(
      batchId => this.broadcastStatuses.get(batchId)?.conversationId === conversationId
    );

    batchIds.forEach(batchId => {
      this.broadcastStatuses.delete(batchId);
    });

    this.broadcastStatus$.next(new Map(this.broadcastStatuses));

    console.log('[TypingBroadcaster] Cleared broadcasts for conversation:', conversationId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate unique batch ID
   */
  private generateBatchId(messageType: string): string {
    return `typing-${messageType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    this.broadcastStatuses.clear();
    this.destroy$.next();
    this.destroy$.complete();
    this.broadcastSent$.complete();
    this.broadcastFailed$.complete();
    this.broadcastConfirmed$.complete();
  }
}
