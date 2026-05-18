/**
 * Presence Broadcaster Service
 * Sends presence updates via WebSocket
 *
 * Features:
 * - Broadcasts user online/offline status
 * - Heartbeat mechanism to keep user online
 * - Automatic retry on failure
 * - Broadcast status tracking
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PresenceStatus, PresenceBroadcastStatus } from './models';
import { WebSocketService } from './websocket.service';

/**
 * Configuration for presence broadcaster
 */
interface BroadcasterConfig {
  destination: string;
  heartbeatInterval: number;
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
    userId: number;
    status: PresenceStatus;
    timestamp: Date;
    isHeartbeat?: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PresenceBroadcasterService implements OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  private config: BroadcasterConfig = {
    destination: '/app/presence',
    heartbeatInterval: 30000,      // Heartbeat every 30 seconds
    maxRetries: 3,
    retryDelay: 2000,
    confirmationTimeout: 10000
  };

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  private broadcastStatuses = new Map<string, PresenceBroadcastStatus>();
  private heartbeatTimer: number | undefined;

  // ═══════════════════════════════════════════════════════════════
  // Subjects & Observables
  // ═══════════════════════════════════════════════════════════════

  // When broadcast is sent
  private broadcastSent$ = new Subject<PresenceBroadcastStatus>();

  // When broadcast fails
  private broadcastFailed$ = new Subject<PresenceBroadcastStatus>();

  // When broadcast is confirmed
  private broadcastConfirmed$ = new Subject<PresenceBroadcastStatus>();

  // Map of all broadcast statuses
  private broadcastStatus$ = new BehaviorSubject<Map<string, PresenceBroadcastStatus>>(
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
   * Broadcast user online status
   */
  public broadcastUserOnline(userId: number): string {
    return this.broadcast(userId, 'online');
  }

  /**
   * Broadcast user offline status
   */
  public broadcastUserOffline(userId: number): string {
    return this.broadcast(userId, 'offline');
  }

  /**
   * Broadcast custom presence status
   */
  public broadcastPresenceStatus(userId: number, status: PresenceStatus): string {
    return this.broadcast(userId, status);
  }

  /**
   * Internal broadcast method
   */
  private broadcast(userId: number, status: PresenceStatus): string {
    const batchId = this.generateBatchId(status);

    // Create status entry
    const broadcastStatus: PresenceBroadcastStatus = {
      batchId,
      userId,
      status,
      broadcastStatus: 'pending',
      sentAt: new Date(),
      retries: 0
    };

    this.broadcastStatuses.set(batchId, broadcastStatus);

    try {
      // Check connection
      if (!this.webSocket.isConnected()) {
        broadcastStatus.broadcastStatus = 'pending';
        console.log('[PresenceBroadcaster] Not connected, queuing broadcast:', batchId);
      } else {
        // Send via WebSocket
        const request: BroadcastRequest = {
          destination: this.config.destination,
          payload: {
            userId,
            status,
            timestamp: new Date()
          }
        };

        this.webSocket.send(request.destination, request.payload);
        broadcastStatus.broadcastStatus = 'sent';

        console.log('[PresenceBroadcaster] Broadcast sent:', {
          batchId,
          userId,
          status
        });
      }

      // Emit event
      this.broadcastSent$.next(broadcastStatus);
      this.broadcastStatus$.next(new Map(this.broadcastStatuses));

      return batchId;
    } catch (error) {
      broadcastStatus.broadcastStatus = 'failed';
      broadcastStatus.error = error instanceof Error ? error.message : 'Unknown error';

      console.error('[PresenceBroadcaster] Broadcast failed:', error);
      this.broadcastFailed$.next(broadcastStatus);
      this.broadcastStatus$.next(new Map(this.broadcastStatuses));

      return batchId;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Heartbeat
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start heartbeat to keep user online
   */
  public startHeartbeat(userId: number): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = window.setInterval(() => {
      const request: BroadcastRequest = {
        destination: this.config.destination,
        payload: {
          userId,
          status: 'online',
          timestamp: new Date(),
          isHeartbeat: true
        }
      };

      try {
        if (this.webSocket.isConnected()) {
          this.webSocket.send(request.destination, request.payload);
          console.log('[PresenceBroadcaster] Heartbeat sent for user:', userId);
        }
      } catch (error) {
        console.error('[PresenceBroadcaster] Heartbeat failed:', error);
      }
    }, this.config.heartbeatInterval);

    console.log('[PresenceBroadcaster] Heartbeat started for user:', userId);
  }

  /**
   * Stop heartbeat
   */
  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      console.log('[PresenceBroadcaster] Heartbeat stopped');
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
      console.warn('[PresenceBroadcaster] Batch not found:', batchId);
      return false;
    }

    // Don't retry confirmed broadcasts
    if (status.broadcastStatus === 'confirmed') {
      console.warn('[PresenceBroadcaster] Cannot retry confirmed broadcast:', batchId);
      return false;
    }

    // Check max retries
    if (status.retries >= this.config.maxRetries) {
      console.warn('[PresenceBroadcaster] Max retries exceeded:', batchId);
      return false;
    }

    try {
      status.retries++;
      status.broadcastStatus = 'pending';

      const request: BroadcastRequest = {
        destination: this.config.destination,
        payload: {
          userId: status.userId,
          status: status.status,
          timestamp: new Date()
        }
      };

      this.webSocket.send(request.destination, request.payload);
      status.broadcastStatus = 'sent';

      console.log('[PresenceBroadcaster] Retry sent:', {
        batchId,
        attempt: status.retries
      });

      this.broadcastSent$.next(status);
      this.broadcastStatus$.next(new Map(this.broadcastStatuses));

      return true;
    } catch (error) {
      status.broadcastStatus = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';

      console.error('[PresenceBroadcaster] Retry failed:', error);
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
  public getBroadcastStatus(batchId: string): PresenceBroadcastStatus | undefined {
    return this.broadcastStatuses.get(batchId);
  }

  /**
   * Get all broadcast statuses
   */
  public getAllBroadcastStatuses(): PresenceBroadcastStatus[] {
    return Array.from(this.broadcastStatuses.values());
  }

  /**
   * Get pending broadcasts
   */
  public getPendingBroadcasts(): PresenceBroadcastStatus[] {
    return Array.from(this.broadcastStatuses.values()).filter(
      status => status.broadcastStatus === 'pending'
    );
  }

  /**
   * Get failed broadcasts
   */
  public getFailedBroadcasts(): PresenceBroadcastStatus[] {
    return Array.from(this.broadcastStatuses.values()).filter(
      status => status.broadcastStatus === 'failed'
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
      console.warn('[PresenceBroadcaster] Batch not found:', batchId);
      return;
    }

    status.broadcastStatus = 'confirmed';
    status.confirmedAt = new Date();

    console.log('[PresenceBroadcaster] Broadcast confirmed:', batchId);

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

    console.log('[PresenceBroadcaster] Broadcast history cleared');
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate unique batch ID
   */
  private generateBatchId(status: PresenceStatus): string {
    return `presence-${status}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    this.stopHeartbeat();
    this.broadcastStatuses.clear();
    this.destroy$.next();
    this.destroy$.complete();
    this.broadcastSent$.complete();
    this.broadcastFailed$.complete();
    this.broadcastConfirmed$.complete();
  }
}
