/**
 * Connection Manager Service
 * Centralized management of WebSocket connection state and recovery
 *
 * Features:
 * - Centralized connection state tracking
 * - Advanced reconnection strategies
 * - Exponential backoff with jitter
 * - Connection metrics and monitoring
 * - Network quality detection
 * - Graceful degradation
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable, interval } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import {
  ConnectionState,
  ConnectionEvent,
  ConnectionMetrics,
  ReconnectionStrategy,
  NetworkQuality,
  ReconnectionStatus,
  ConnectionStatusExtended
} from './models';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class ConnectionManagerService implements OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  private defaultReconnectionStrategy: ReconnectionStrategy = {
    enabled: true,
    initialDelay: 1000,      // 1 second
    maxDelay: 30000,         // 30 seconds
    backoffMultiplier: 2,    // Double delay each attempt
    maxAttempts: 20,         // Keep trying for a while
    resetAttemptsAfter: 30000 // Reset counter if connected for 30s
  };

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  private currentState: ConnectionState = ConnectionState.DISCONNECTED;
  private previousState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectionStrategy: ReconnectionStrategy = { ...this.defaultReconnectionStrategy };

  private metrics: ConnectionMetrics = {
    isConnected: false,
    connectionDuration: 0,
    totalDowntime: 0,
    reconnectAttempts: 0,
    successfulReconnects: 0,
    failedReconnects: 0,
    averageReconnectionTime: 0,
    messageQueueSize: 0,
    unsentMessages: 0
  };

  private reconnectTimer: number | undefined;
  private metricsTimer: number | undefined;
  private connectionStartTime: number | undefined;
  private lastDisconnectTime: number | undefined;
  private reconnectStartTime: number | undefined;
  private reconnectAttempts = 0;

  // ═══════════════════════════════════════════════════════════════
  // Subjects & Observables
  // ═══════════════════════════════════════════════════════════════

  // Current connection state
  private connectionState$ = new BehaviorSubject<ConnectionState>(this.currentState);

  // Connection events stream
  private connectionEvent$ = new Subject<ConnectionEvent>();

  // Connection metrics
  private connectionMetrics$ = new BehaviorSubject<ConnectionMetrics>(this.metrics);

  // Reconnection status
  private reconnectionStatus$ = new BehaviorSubject<ReconnectionStatus>(
    this.getEmptyReconnectionStatus()
  );

  // Network quality
  private networkQuality$ = new BehaviorSubject<NetworkQuality>(NetworkQuality.OFFLINE);

  // Connection state changes
  private stateChanged$ = this.connectionState$.pipe(
    filter((state, index) => index === 0 || state !== this.previousState)
  );

  // ═══════════════════════════════════════════════════════════════
  // Public Observables
  // ═══════════════════════════════════════════════════════════════

  public connectionState = this.connectionState$.asObservable();
  public connectionEvent = this.connectionEvent$.asObservable();
  public connectionMetrics = this.connectionMetrics$.asObservable();
  public reconnectionStatus = this.reconnectionStatus$.asObservable();
  public networkQuality = this.networkQuality$.asObservable();
  public stateChanged = this.stateChanged$.asObservable();

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(private webSocketService: WebSocketService) {
    this.initializeService();
  }

  /**
   * Initialize service and start monitoring
   */
  private initializeService(): void {
    console.log('[ConnectionManager] Initializing service');

    // Subscribe to WebSocket connection status
    this.webSocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.handleConnectionStatusChange(status);
      });

    // Start metrics tracking
    this.startMetricsTracking();
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Configuration
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set reconnection strategy
   */
  public setReconnectionStrategy(strategy: Partial<ReconnectionStrategy>): void {
    this.reconnectionStrategy = {
      ...this.reconnectionStrategy,
      ...strategy
    };

    console.log('[ConnectionManager] Reconnection strategy updated:', this.reconnectionStrategy);
  }

  /**
   * Get current reconnection strategy
   */
  public getReconnectionStrategy(): ReconnectionStrategy {
    return { ...this.reconnectionStrategy };
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Connection State
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.currentState;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.currentState === ConnectionState.CONNECTED;
  }

  /**
   * Check if reconnecting
   */
  public isReconnecting(): boolean {
    return this.currentState === ConnectionState.RECONNECTING;
  }

  /**
   * Check if connection is degraded
   */
  public isDegraded(): boolean {
    return this.currentState === ConnectionState.DEGRADED;
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Metrics
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current metrics
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection uptime in milliseconds
   */
  public getConnectionUptime(): number {
    if (!this.connectionStartTime) return 0;

    if (this.currentState === ConnectionState.CONNECTED) {
      return Date.now() - this.connectionStartTime;
    }

    return this.metrics.connectionDuration;
  }

  /**
   * Get total downtime in milliseconds
   */
  public getTotalDowntime(): number {
    return this.metrics.totalDowntime;
  }

  /**
   * Get reconnection attempts count
   */
  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Get average reconnection time
   */
  public getAverageReconnectionTime(): number {
    return this.metrics.averageReconnectionTime;
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Reconnection Control
  // ═══════════════════════════════════════════════════════════════

  /**
   * Manually trigger reconnection
   */
  public reconnect(): void {
    console.log('[ConnectionManager] Manual reconnection requested');

    if (this.currentState === ConnectionState.CONNECTED) {
      console.log('[ConnectionManager] Already connected, ignoring reconnect request');
      return;
    }

    this.scheduleReconnect();
  }

  /**
   * Cancel scheduled reconnection
   */
  public cancelReconnect(): void {
    console.log('[ConnectionManager] Cancelling reconnection');
    this.clearReconnectTimer();
    this.updateState(ConnectionState.DISCONNECTED);
  }

  /**
   * Force reset reconnection attempts
   */
  public resetReconnectAttempts(): void {
    console.log('[ConnectionManager] Resetting reconnection attempts');
    this.reconnectAttempts = 0;
    this.updateReconnectionStatus();
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Connection State Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle connection status change from WebSocket
   */
  private handleConnectionStatusChange(status: any): void {
    const isConnected = status.isConnected;

    if (isConnected) {
      this.handleConnectionEstablished();
    } else {
      this.handleConnectionLost();
    }
  }

  /**
   * Handle successful connection
   */
  private handleConnectionEstablished(): void {
    console.log('[ConnectionManager] Connection established');

    this.connectionStartTime = Date.now();
    this.updateState(ConnectionState.CONNECTED);
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    // Update metrics
    this.metrics.successfulReconnects++;
    if (this.reconnectStartTime) {
      const reconnectTime = Date.now() - this.reconnectStartTime;
      this.metrics.averageReconnectionTime =
        (this.metrics.averageReconnectionTime + reconnectTime) / 2;
    }

    this.emitConnectionEvent({
      state: ConnectionState.CONNECTED,
      timestamp: new Date()
    });

    this.updateReconnectionStatus();
  }

  /**
   * Handle connection loss
   */
  private handleConnectionLost(): void {
    console.log('[ConnectionManager] Connection lost');

    if (this.currentState === ConnectionState.DISCONNECTED) {
      return;
    }

    // Update downtime tracking
    if (this.connectionStartTime) {
      this.metrics.connectionDuration = Date.now() - this.connectionStartTime;
      this.metrics.totalDowntime += this.metrics.connectionDuration;
    }

    this.lastDisconnectTime = Date.now();
    this.updateState(ConnectionState.DISCONNECTED);

    this.emitConnectionEvent({
      state: ConnectionState.DISCONNECTED,
      timestamp: new Date(),
      previousState: this.previousState
    });

    // Schedule reconnection
    if (this.reconnectionStrategy.enabled) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.reconnectionStrategy.enabled) {
      console.log('[ConnectionManager] Reconnection disabled');
      return;
    }

    if (this.reconnectAttempts >= this.reconnectionStrategy.maxAttempts) {
      console.error('[ConnectionManager] Max reconnection attempts reached');
      this.updateState(ConnectionState.RECONNECTION_FAILED);
      this.emitConnectionEvent({
        state: ConnectionState.RECONNECTION_FAILED,
        timestamp: new Date(),
        attemptNumber: this.reconnectAttempts
      });
      return;
    }

    this.updateState(ConnectionState.RECONNECTING);
    this.reconnectAttempts++;
    this.reconnectStartTime = Date.now();

    // Calculate delay with exponential backoff
    const exponentialDelay = Math.min(
      this.reconnectionStrategy.initialDelay *
        Math.pow(this.reconnectionStrategy.backoffMultiplier, this.reconnectAttempts - 1),
      this.reconnectionStrategy.maxDelay
    );

    // Add jitter (±10%)
    const jitter = exponentialDelay * 0.1 * (Math.random() - 0.5);
    const delay = Math.round(exponentialDelay + jitter);

    console.log('[ConnectionManager] Scheduling reconnect:', {
      attempt: this.reconnectAttempts,
      delay,
      maxAttempts: this.reconnectionStrategy.maxAttempts
    });

    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => {
      console.log('[ConnectionManager] Attempting to reconnect...');
      this.webSocketService.connect('', 0); // Connection details should come from auth
      this.emitConnectionEvent({
        state: ConnectionState.RECONNECTING,
        timestamp: new Date(),
        attemptNumber: this.reconnectAttempts,
        nextRetryIn: delay
      });
    }, delay);

    this.updateReconnectionStatus();
  }

  /**
   * Update connection state
   */
  private updateState(newState: ConnectionState): void {
    if (newState === this.currentState) {
      return;
    }

    this.previousState = this.currentState;
    this.currentState = newState;
    this.connectionState$.next(newState);

    console.log('[ConnectionManager] State changed:', {
      from: this.previousState,
      to: this.currentState
    });
  }

  /**
   * Emit connection event
   */
  private emitConnectionEvent(event: Partial<ConnectionEvent>): void {
    const fullEvent: ConnectionEvent = {
      state: event.state || this.currentState,
      timestamp: event.timestamp || new Date(),
      previousState: event.previousState,
      attemptNumber: event.attemptNumber,
      nextRetryIn: event.nextRetryIn,
      error: event.error,
      reason: event.reason
    };

    this.connectionEvent$.next(fullEvent);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Metrics Tracking
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start metrics tracking
   */
  private startMetricsTracking(): void {
    this.metricsTimer = window.setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update every 10 seconds
  }

  /**
   * Stop metrics tracking
   */
  private stopMetricsTracking(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    if (this.currentState === ConnectionState.CONNECTED && this.connectionStartTime) {
      this.metrics.connectionDuration = Date.now() - this.connectionStartTime;
    }

    this.connectionMetrics$.next({ ...this.metrics });
  }

  /**
   * Update reconnection status
   */
  private updateReconnectionStatus(): void {
    const nextRetryDelay = this.calculateNextRetryDelay();

    const status: ReconnectionStatus = {
      isReconnecting: this.currentState === ConnectionState.RECONNECTING,
      currentAttempt: this.reconnectAttempts,
      maxAttempts: this.reconnectionStrategy.maxAttempts,
      nextRetryIn: nextRetryDelay,
      backoffDelay: this.reconnectionStrategy.initialDelay,
      estimatedTimeToReconnect: this.estimateTimeToReconnect()
    };

    this.reconnectionStatus$.next(status);
  }

  /**
   * Calculate next retry delay
   */
  private calculateNextRetryDelay(): number {
    const exponentialDelay = Math.min(
      this.reconnectionStrategy.initialDelay *
        Math.pow(this.reconnectionStrategy.backoffMultiplier, this.reconnectAttempts),
      this.reconnectionStrategy.maxDelay
    );
    return exponentialDelay;
  }

  /**
   * Estimate time to reconnect
   */
  private estimateTimeToReconnect(): number {
    if (this.currentState === ConnectionState.CONNECTED) {
      return 0;
    }

    let totalTime = 0;
    for (let i = this.reconnectAttempts; i < this.reconnectionStrategy.maxAttempts; i++) {
      const delay = Math.min(
        this.reconnectionStrategy.initialDelay *
          Math.pow(this.reconnectionStrategy.backoffMultiplier, i),
        this.reconnectionStrategy.maxDelay
      );
      totalTime += delay;
    }

    return totalTime;
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  /**
   * Get empty reconnection status
   */
  private getEmptyReconnectionStatus(): ReconnectionStatus {
    return {
      isReconnecting: false,
      currentAttempt: 0,
      maxAttempts: this.reconnectionStrategy.maxAttempts,
      nextRetryIn: 0,
      backoffDelay: this.reconnectionStrategy.initialDelay,
      estimatedTimeToReconnect: 0
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    this.clearReconnectTimer();
    this.stopMetricsTracking();
    this.destroy$.next();
    this.destroy$.complete();
    this.connectionState$.complete();
    this.connectionEvent$.complete();
    this.connectionMetrics$.complete();
    this.reconnectionStatus$.complete();
    this.networkQuality$.complete();
  }
}
