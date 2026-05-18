/**
 * Broadcast Confirmation Service
 * Handles message delivery confirmations from both sender and recipient
 *
 * Features:
 * - Track sender confirmations (message sent to server)
 * - Track recipient confirmations (message delivered to recipient)
 * - Dual confirmation workflow
 * - Timeout handling for lost confirmations
 * - Confirmation retry logic
 * - Event notifications on confirmation states
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable, timer } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';

import { WebSocketService } from './websocket.service';
import { MessageBroadcasterService } from './message-broadcaster.service';
import { ChatMessageEvent } from './models';

/**
 * Dual Confirmation State
 * Tracks both sender and recipient confirmations
 */
export interface DualConfirmationState {
  clientMessageId: string;
  serverMessageId?: number;
  senderId: number;
  recipientId: number;
  conversationId: number;
  senderConfirmed: boolean;           // Sender received acknowledgment
  senderConfirmedAt?: Date;
  recipientConfirmed: boolean;        // Recipient received message
  recipientConfirmedAt?: Date;
  bothConfirmed: boolean;             // Both sender and recipient confirmed
  confirmationStatus: 'pending' | 'sender-confirmed' | 'recipient-confirmed' | 'both-confirmed' | 'timeout';
  timeoutAt?: Date;
  retryCount: number;
}

/**
 * Confirmation Timeout Event
 * Emitted when confirmation times out
 */
export interface ConfirmationTimeout {
  clientMessageId: string;
  conversationId: number;
  missingConfirmations: ('sender' | 'recipient')[];
  lastAttemptTime: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BroadcastConfirmationService implements OnDestroy {
  // Configuration
  private readonly CONFIRMATION_TIMEOUT = 30000;  // 30 seconds
  private readonly RETRY_INTERVAL = 5000;         // 5 seconds
  private readonly MAX_CONFIRMATION_RETRIES = 3;

  // Confirmation tracking
  private confirmationStatesMap = new Map<string, DualConfirmationState>();
  private confirmationTimeouts = new Map<string, any>();
  private retryTimers = new Map<string, any>();

  // Observable streams
  private confirmationStateSubject = new BehaviorSubject<Map<string, DualConfirmationState>>(
    new Map()
  );
  public confirmationState$ = this.confirmationStateSubject.asObservable();

  private senderConfirmedSubject = new Subject<DualConfirmationState>();
  public senderConfirmed$ = this.senderConfirmedSubject.asObservable();

  private recipientConfirmedSubject = new Subject<DualConfirmationState>();
  public recipientConfirmed$ = this.recipientConfirmedSubject.asObservable();

  private bothConfirmedSubject = new Subject<DualConfirmationState>();
  public bothConfirmed$ = this.bothConfirmedSubject.asObservable();

  private confirmationTimeoutSubject = new Subject<ConfirmationTimeout>();
  public confirmationTimeout$ = this.confirmationTimeoutSubject.asObservable();

  private confirmationProgressSubject = new BehaviorSubject<number>(0);
  public confirmationProgress$ = this.confirmationProgressSubject.asObservable();

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private webSocketService: WebSocketService,
    private broadcasterService: MessageBroadcasterService
  ) {
    this.initializeConfirmationListeners();
  }

  /**
   * Initialize listeners for broadcast confirmations
   */
  private initializeConfirmationListeners(): void {
    // Listen for broadcast confirmations from the broadcaster service
    this.broadcasterService.broadcastConfirmations$
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmation => {
        this.handleConfirmation(confirmation);
      });

    // Listen for chat messages (which act as confirmations)
    this.webSocketService.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.handleIncomingMessage(message);
      });

    // Monitor broadcaster status
    this.broadcasterService.messageSent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.trackMessageForConfirmation(
          status.messageId,
          status.serverMessageId || 0,
          status.senderId,
          status.recipientId,
          status.conversationId
        );
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Confirmation Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Track a message for dual confirmation
   */
  public trackMessageForConfirmation(
    clientMessageId: string,
    serverMessageId: number,
    senderId: number,
    recipientId: number,
    conversationId: number
  ): void {
    const state: DualConfirmationState = {
      clientMessageId,
      serverMessageId,
      senderId,
      recipientId,
      conversationId,
      senderConfirmed: false,
      recipientConfirmed: false,
      bothConfirmed: false,
      confirmationStatus: 'pending',
      retryCount: 0
    };

    this.confirmationStatesMap.set(clientMessageId, state);
    this.updateConfirmationState();

    // Set timeout for confirmation
    this.setConfirmationTimeout(clientMessageId);

    console.log('[BroadcastConfirmation] Tracking message for confirmation:', {
      clientMessageId,
      conversationId,
      timeout: this.CONFIRMATION_TIMEOUT
    });
  }

  /**
   * Get confirmation state for a message
   */
  public getConfirmationState(clientMessageId: string): DualConfirmationState | undefined {
    return this.confirmationStatesMap.get(clientMessageId);
  }

  /**
   * Get all confirmation states
   */
  public getAllConfirmationStates(): DualConfirmationState[] {
    return Array.from(this.confirmationStatesMap.values());
  }

  /**
   * Get pending confirmations
   */
  public getPendingConfirmations(): DualConfirmationState[] {
    return Array.from(this.confirmationStatesMap.values()).filter(
      state => !state.bothConfirmed
    );
  }

  /**
   * Get confirmation progress (percentage of messages confirmed)
   */
  public getConfirmationProgress(): number {
    const total = this.confirmationStatesMap.size;
    if (total === 0) return 100;

    const confirmed = Array.from(this.confirmationStatesMap.values()).filter(
      state => state.bothConfirmed
    ).length;

    return Math.round((confirmed / total) * 100);
  }

  /**
   * Clear a confirmation state
   */
  public clearConfirmation(clientMessageId: string): void {
    this.cancelConfirmationTimeout(clientMessageId);
    this.cancelRetryTimer(clientMessageId);
    this.confirmationStatesMap.delete(clientMessageId);
    this.updateConfirmationState();
  }

  /**
   * Clear all confirmations
   */
  public clearAllConfirmations(): void {
    this.confirmationStatesMap.forEach((_, id) => {
      this.cancelConfirmationTimeout(id);
      this.cancelRetryTimer(id);
    });
    this.confirmationStatesMap.clear();
    this.updateConfirmationState();
  }

  /**
   * Wait for confirmation to complete
   */
  public waitForConfirmation(clientMessageId: string, timeout = this.CONFIRMATION_TIMEOUT): Observable<DualConfirmationState> {
    return new Observable(subscriber => {
      const state = this.getConfirmationState(clientMessageId);

      if (!state) {
        subscriber.error(new Error('Message not found'));
        return;
      }

      if (state.bothConfirmed) {
        subscriber.next(state);
        subscriber.complete();
        return;
      }

      const subscription = this.bothConfirmed$
        .pipe(takeUntil(this.destroy$))
        .subscribe(confirmedState => {
          if (confirmedState.clientMessageId === clientMessageId) {
            subscriber.next(confirmedState);
            subscriber.complete();
            subscription.unsubscribe();
          }
        });

      // Timeout
      const timeoutHandle = setTimeout(() => {
        subscriber.error(new Error('Confirmation timeout'));
        subscription.unsubscribe();
      }, timeout);

      return () => {
        clearTimeout(timeoutHandle);
        subscription.unsubscribe();
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Confirmation Handling
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle confirmation from broadcaster service
   */
  private handleConfirmation(confirmation: any): void {
    const state = this.confirmationStatesMap.get(confirmation.clientMessageId);

    if (!state) {
      console.warn('[BroadcastConfirmation] Confirmation for unknown message:', {
        clientMessageId: confirmation.clientMessageId
      });
      return;
    }

    console.log('[BroadcastConfirmation] Received confirmation:', {
      clientMessageId: confirmation.clientMessageId,
      confirmedBy: confirmation.confirmedBy
    });

    // Mark appropriate confirmation
    if (confirmation.confirmedBy === 'sender') {
      state.senderConfirmed = true;
      state.senderConfirmedAt = new Date();
      this.senderConfirmedSubject.next(state);
    } else if (confirmation.confirmedBy === 'recipient') {
      state.recipientConfirmed = true;
      state.recipientConfirmedAt = new Date();
      this.recipientConfirmedSubject.next(state);
    }

    // Check if both confirmed
    this.checkBothConfirmed(state);
    this.updateConfirmationState();
  }

  /**
   * Handle incoming message (acts as confirmation)
   */
  private handleIncomingMessage(message: ChatMessageEvent): void {
    // Incoming message from recipient means message was delivered
    // We need to check if this is a confirmation or a new message

    // In a real implementation, the backend would include metadata
    // indicating whether this is a confirmation or a new message

    console.log('[BroadcastConfirmation] Incoming message:', {
      conversationId: message.conversationId,
      senderId: message.senderId
    });

    // Search for any messages awaiting recipient confirmation
    for (const [, state] of this.confirmationStatesMap) {
      if (
        state.conversationId === message.conversationId &&
        message.senderId === state.recipientId &&  // Message from recipient
        !state.recipientConfirmed
      ) {
        // This indicates the recipient received our message
        state.recipientConfirmed = true;
        state.recipientConfirmedAt = new Date();
        this.recipientConfirmedSubject.next(state);
        this.checkBothConfirmed(state);
        this.updateConfirmationState();
        break;
      }
    }
  }

  /**
   * Check if both sender and recipient confirmed
   */
  private checkBothConfirmed(state: DualConfirmationState): void {
    if (state.senderConfirmed && state.recipientConfirmed && !state.bothConfirmed) {
      state.bothConfirmed = true;
      state.confirmationStatus = 'both-confirmed';

      // Cancel timeout
      this.cancelConfirmationTimeout(state.clientMessageId);

      this.bothConfirmedSubject.next(state);

      console.log('[BroadcastConfirmation] Both sender and recipient confirmed:', {
        clientMessageId: state.clientMessageId,
        conversationId: state.conversationId
      });
    } else if (state.senderConfirmed && !state.recipientConfirmed) {
      state.confirmationStatus = 'sender-confirmed';
    } else if (state.recipientConfirmed && !state.senderConfirmed) {
      state.confirmationStatus = 'recipient-confirmed';
    }
  }

  /**
   * Set timeout for confirmation
   */
  private setConfirmationTimeout(clientMessageId: string): void {
    const timeout = setTimeout(() => {
      this.handleConfirmationTimeout(clientMessageId);
    }, this.CONFIRMATION_TIMEOUT);

    this.confirmationTimeouts.set(clientMessageId, timeout);
  }

  /**
   * Handle confirmation timeout
   */
  private handleConfirmationTimeout(clientMessageId: string): void {
    const state = this.confirmationStatesMap.get(clientMessageId);

    if (!state || state.bothConfirmed) {
      return;
    }

    state.confirmationStatus = 'timeout';
    state.timeoutAt = new Date();

    const missingConfirmations: ('sender' | 'recipient')[] = [];
    if (!state.senderConfirmed) missingConfirmations.push('sender');
    if (!state.recipientConfirmed) missingConfirmations.push('recipient');

    const timeoutEvent: ConfirmationTimeout = {
      clientMessageId,
      conversationId: state.conversationId,
      missingConfirmations,
      lastAttemptTime: new Date()
    };

    this.confirmationTimeoutSubject.next(timeoutEvent);

    console.warn('[BroadcastConfirmation] Confirmation timeout:', {
      clientMessageId,
      missingConfirmations,
      conversationId: state.conversationId
    });

    // Attempt retry if within limit
    if (state.retryCount < this.MAX_CONFIRMATION_RETRIES) {
      this.retryConfirmation(clientMessageId);
    }

    this.updateConfirmationState();
  }

  /**
   * Retry confirmation request
   */
  private retryConfirmation(clientMessageId: string): void {
    const state = this.confirmationStatesMap.get(clientMessageId);

    if (!state) return;

    state.retryCount++;

    console.log('[BroadcastConfirmation] Retrying confirmation:', {
      clientMessageId,
      attempt: state.retryCount,
      maxAttempts: this.MAX_CONFIRMATION_RETRIES
    });

    // Send retry request to backend
    // In a real implementation, this would be a dedicated endpoint
    // For now, we'll just reset the timeout

    const timer = setTimeout(() => {
      this.setConfirmationTimeout(clientMessageId);
    }, this.RETRY_INTERVAL);

    this.retryTimers.set(clientMessageId, timer);
  }

  /**
   * Cancel confirmation timeout
   */
  private cancelConfirmationTimeout(clientMessageId: string): void {
    const timeout = this.confirmationTimeouts.get(clientMessageId);
    if (timeout) {
      clearTimeout(timeout);
      this.confirmationTimeouts.delete(clientMessageId);
    }
  }

  /**
   * Cancel retry timer
   */
  private cancelRetryTimer(clientMessageId: string): void {
    const timer = this.retryTimers.get(clientMessageId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(clientMessageId);
    }
  }

  /**
   * Update confirmation state observable
   */
  private updateConfirmationState(): void {
    const mapCopy = new Map(this.confirmationStatesMap);
    this.confirmationStateSubject.next(mapCopy);

    // Update progress
    const progress = this.getConfirmationProgress();
    this.confirmationProgressSubject.next(progress);
  }

  /**
   * Cleanup service
   */
  ngOnDestroy(): void {
    console.log('[BroadcastConfirmation] Destroying service');

    // Clear all timeouts and timers
    this.confirmationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.confirmationTimeouts.clear();

    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();

    // Clean up subjects
    this.destroy$.next();
    this.destroy$.complete();
  }
}
