/**
 * Typing Indicator Service
 * Manages typing state, debouncing, and event broadcasting
 *
 * Features:
 * - Tracks which users are typing in each conversation
 * - Debounces typing events (configurable delay)
 * - Auto-stops typing after inactivity (configurable timeout)
 * - Observable streams for reactive updates
 * - Query methods for typing state
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable, interval, timer } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  takeUntil,
  debounceTime,
  switchMap,
  tap,
  filter
} from 'rxjs/operators';

import {
  TypingIndicatorEvent,
  StoppedTypingEvent,
  TypingUserState,
  ConversationTypingState,
  TypingEvent
} from './models';

/**
 * Configuration for typing indicator behavior
 */
interface TypingIndicatorConfig {
  debounceDelay: number;        // 500ms - delay before sending typing event
  inactivityTimeout: number;    // 3000ms - timeout for auto-stopping
  cleanupInterval: number;      // 5000ms - cleanup old typing states
}

/**
 * Internal typing state tracker
 */
interface InternalTypingState {
  userId: number;
  userName: string;
  email?: string;
  isTyping: boolean;
  startedAt: Date;
  lastUpdateAt: Date;
  debounceTimer?: number;
  inactivityTimer?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TypingIndicatorService implements OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  private config: TypingIndicatorConfig = {
    debounceDelay: 500,           // Send typing event max every 500ms
    inactivityTimeout: 3000,      // Stop after 3 seconds of inactivity
    cleanupInterval: 5000         // Cleanup every 5 seconds
  };

  // ═══════════════════════════════════════════════════════════════
  // Current State
  // ═══════════════════════════════════════════════════════════════

  private currentUserId: number | null = null;
  private currentUserName: string | null = null;
  private currentConversationId: number | null = null;
  private currentUserEmail: string | null = null;

  // Track typing state per conversation
  private typingStates = new Map<number, Map<number, InternalTypingState>>();

  // ═══════════════════════════════════════════════════════════════
  // Subjects & Observables
  // ═══════════════════════════════════════════════════════════════

  // When current user starts typing
  private userStartedTyping$ = new Subject<{
    conversationId: number;
    typistId: number;
    typistName: string;
  }>();

  // When current user stops typing
  private userStoppedTyping$ = new Subject<{
    conversationId: number;
    typistId: number;
    typistName: string;
  }>();

  // When other users' typing status changes
  private typingStatusChanged$ = new Subject<TypingEvent>();

  // Map of all typing states by conversation
  private typingStatesMap$ = new BehaviorSubject<
    Map<number, ConversationTypingState>
  >(new Map());

  // ═══════════════════════════════════════════════════════════════
  // Public Observable Streams
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emitted when a typing event is detected (any user)
   * Includes both typing and stopped typing events
   */
  public typingEvent$ = this.typingStatusChanged$.asObservable();

  /**
   * Emitted when current user should send typing indicator
   * Debounced to 500ms intervals
   */
  public sendTyping$ = this.userStartedTyping$.asObservable();

  /**
   * Emitted when current user should send stopped typing
   * After 3 seconds of inactivity
   */
  public sendStoppedTyping$ = this.userStoppedTyping$.asObservable();

  /**
   * Current typing states map per conversation
   */
  public typingStates$ = this.typingStatesMap$.asObservable();

  /**
   * Observable for specific conversation typing indicators
   */
  public conversationTypingUsers$ = (conversationId: number): Observable<TypingUserState[]> => {
    return this.typingStatesMap$.pipe(
      map(statesMap => {
        const convState = statesMap.get(conversationId);
        return convState?.typingUsers ?? [];
      }),
      distinctUntilChanged((prev, curr) => {
        // Only emit if typing users actually changed
        return JSON.stringify(prev) === JSON.stringify(curr);
      })
    );
  };

  /**
   * Observable for typing status of specific user
   */
  public userTypingStatus$ = (conversationId: number, userId: number): Observable<boolean> => {
    return this.typingStatesMap$.pipe(
      map(statesMap => {
        const convState = statesMap.get(conversationId);
        const userState = convState?.typingUsers.find(u => u.userId === userId);
        return userState?.isTyping ?? false;
      }),
      distinctUntilChanged()
    );
  };

  /**
   * Observable for count of users typing
   */
  public typingCount$ = (conversationId: number): Observable<number> => {
    return this.typingStatesMap$.pipe(
      map(statesMap => {
        const convState = statesMap.get(conversationId);
        return convState?.totalTypingCount ?? 0;
      }),
      distinctUntilChanged()
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor() {
    this.setupCleanupInterval();
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Configuration
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set custom configuration
   */
  public setConfig(config: Partial<TypingIndicatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): TypingIndicatorConfig {
    return { ...this.config };
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: User Context
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set current user context for typing indicators
   */
  public setCurrentUser(userId: number, userName: string, email?: string): void {
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.currentUserEmail = email;

    console.log('[TypingIndicator] User context set:', { userId, userName });
  }

  /**
   * Set current conversation context
   */
  public setCurrentConversation(conversationId: number | null): void {
    // Stop typing in previous conversation
    if (this.currentConversationId && this.currentConversationId !== conversationId) {
      this.markUserStoppedTyping(this.currentConversationId);
    }

    this.currentConversationId = conversationId;

    // Initialize typing state for new conversation if needed
    if (conversationId && !this.typingStates.has(conversationId)) {
      this.typingStates.set(conversationId, new Map());
    }

    console.log('[TypingIndicator] Conversation set:', conversationId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Typing Detection
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark that current user is typing
   * Debounced to send event at most every 500ms
   */
  public markUserTyping(conversationId: number): void {
    if (!this.currentUserId || !this.currentUserName) {
      console.warn('[TypingIndicator] User not set');
      return;
    }

    const typingStatesMap = this.typingStates.get(conversationId) || new Map();

    let userState = typingStatesMap.get(this.currentUserId);

    if (!userState) {
      // First time typing
      userState = {
        userId: this.currentUserId,
        userName: this.currentUserName,
        email: this.currentUserEmail,
        isTyping: true,
        startedAt: new Date(),
        lastUpdateAt: new Date()
      };
      typingStatesMap.set(this.currentUserId, userState);
      this.typingStates.set(conversationId, typingStatesMap);

      // Start debounce timer
      this.setupDebounceTimer(conversationId, this.currentUserId);
    } else {
      // Already typing, just update timestamp
      userState.lastUpdateAt = new Date();

      // Clear and restart inactivity timer
      if (userState.inactivityTimer) {
        clearTimeout(userState.inactivityTimer);
      }

      this.setupInactivityTimer(conversationId, this.currentUserId);
    }

    console.log('[TypingIndicator] User typing:', { conversationId, userId: this.currentUserId });
  }

  /**
   * Mark that current user has stopped typing
   * Called manually or after inactivity timeout
   */
  public markUserStoppedTyping(conversationId: number): void {
    if (!this.currentUserId) {
      return;
    }

    const typingStatesMap = this.typingStates.get(conversationId);
    if (!typingStatesMap) {
      return;
    }

    const userState = typingStatesMap.get(this.currentUserId);
    if (!userState || !userState.isTyping) {
      return;
    }

    // Clear timers
    if (userState.debounceTimer) {
      clearTimeout(userState.debounceTimer);
    }
    if (userState.inactivityTimer) {
      clearTimeout(userState.inactivityTimer);
    }

    // Update state
    userState.isTyping = false;

    // Emit stopped typing event
    this.userStoppedTyping$.next({
      conversationId,
      typistId: this.currentUserId,
      typistName: this.currentUserName!
    });

    console.log('[TypingIndicator] User stopped typing:', { conversationId, userId: this.currentUserId });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Incoming Typing Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle incoming typing indicator event from other users
   */
  public handleTypingEvent(event: TypingIndicatorEvent): void {
    const conversationId = event.conversationId;

    // Don't process own typing events
    if (event.typistId === this.currentUserId) {
      return;
    }

    let typingStatesMap = this.typingStates.get(conversationId);
    if (!typingStatesMap) {
      typingStatesMap = new Map();
      this.typingStates.set(conversationId, typingStatesMap);
    }

    let userState = typingStatesMap.get(event.typistId);

    if (!userState) {
      userState = {
        userId: event.typistId,
        userName: event.typistName,
        email: event.typistEmail,
        isTyping: true,
        startedAt: event.timestamp,
        lastUpdateAt: event.timestamp
      };
      typingStatesMap.set(event.typistId, userState);
    } else {
      userState.isTyping = true;
      userState.lastUpdateAt = event.timestamp;
    }

    // Setup inactivity timer for other users (they'll stop after 3s of no updates)
    this.setupInactivityTimer(conversationId, event.typistId);

    // Emit event
    this.typingStatusChanged$.next(event);

    // Update map
    this.updateTypingStatesMap(conversationId);

    console.log('[TypingIndicator] Received typing event:', {
      conversationId,
      userId: event.typistId,
      userName: event.typistName
    });
  }

  /**
   * Handle incoming stopped typing event
   */
  public handleStoppedTypingEvent(event: StoppedTypingEvent): void {
    const conversationId = event.conversationId;

    // Don't process own events
    if (event.typistId === this.currentUserId) {
      return;
    }

    const typingStatesMap = this.typingStates.get(conversationId);
    if (!typingStatesMap) {
      return;
    }

    const userState = typingStatesMap.get(event.typistId);
    if (!userState) {
      return;
    }

    // Clear inactivity timer
    if (userState.inactivityTimer) {
      clearTimeout(userState.inactivityTimer);
    }

    // Update state
    userState.isTyping = false;

    // Emit event
    this.typingStatusChanged$.next(event);

    // Update map
    this.updateTypingStatesMap(conversationId);

    console.log('[TypingIndicator] Received stopped typing event:', {
      conversationId,
      userId: event.typistId
    });
  }

  /**
   * Handle batch of typing events
   */
  public handleBatchTypingEvents(events: TypingEvent[]): void {
    events.forEach(event => {
      if (event.eventType === 'typing') {
        this.handleTypingEvent(event as TypingIndicatorEvent);
      } else if (event.eventType === 'stopped_typing') {
        this.handleStoppedTypingEvent(event as StoppedTypingEvent);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Queries
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get users typing in a conversation
   */
  public getTypingUsers(conversationId: number): TypingUserState[] {
    const typingStatesMap = this.typingStates.get(conversationId);
    if (!typingStatesMap) {
      return [];
    }

    return Array.from(typingStatesMap.values())
      .filter(state => state.isTyping)
      .map(state => ({
        userId: state.userId,
        userName: state.userName,
        email: state.email,
        isTyping: state.isTyping,
        startedAt: state.startedAt,
        lastUpdateAt: state.lastUpdateAt
      }));
  }

  /**
   * Get count of users typing
   */
  public getTypingCount(conversationId: number): number {
    return this.getTypingUsers(conversationId).length;
  }

  /**
   * Check if specific user is typing
   */
  public isUserTyping(conversationId: number, userId: number): boolean {
    const typingStatesMap = this.typingStates.get(conversationId);
    if (!typingStatesMap) {
      return false;
    }

    const userState = typingStatesMap.get(userId);
    return userState?.isTyping ?? false;
  }

  /**
   * Get typing message for conversation
   * Returns formatted string like "User is typing..." or "User1 and User2 are typing..."
   */
  public getTypingMessage(conversationId: number): string {
    const typingUsers = this.getTypingUsers(conversationId);

    if (typingUsers.length === 0) {
      return '';
    }

    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`;
    }

    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    }

    return `${typingUsers.length} users are typing...`;
  }

  /**
   * Get all typing states for a conversation
   */
  public getConversationTypingState(conversationId: number): ConversationTypingState {
    const typingUsers = this.getTypingUsers(conversationId);

    return {
      conversationId,
      typingUsers,
      totalTypingCount: typingUsers.length
    };
  }

  /**
   * Get all typing states for all conversations
   */
  public getAllTypingStates(): Map<number, ConversationTypingState> {
    const allStates = new Map<number, ConversationTypingState>();

    this.typingStates.forEach((_, conversationId) => {
      allStates.set(conversationId, this.getConversationTypingState(conversationId));
    });

    return allStates;
  }

  /**
   * Clear all typing states for a conversation
   */
  public clearConversationTypingState(conversationId: number): void {
    const typingStatesMap = this.typingStates.get(conversationId);
    if (!typingStatesMap) {
      return;
    }

    // Clear all timers
    typingStatesMap.forEach(userState => {
      if (userState.debounceTimer) {
        clearTimeout(userState.debounceTimer);
      }
      if (userState.inactivityTimer) {
        clearTimeout(userState.inactivityTimer);
      }
    });

    // Clear the state
    this.typingStates.delete(conversationId);
    this.updateTypingStatesMap(conversationId);
  }

  /**
   * Clear all typing states for all conversations
   */
  public clearAllTypingStates(): void {
    this.typingStates.forEach((typingStatesMap, conversationId) => {
      typingStatesMap.forEach(userState => {
        if (userState.debounceTimer) {
          clearTimeout(userState.debounceTimer);
        }
        if (userState.inactivityTimer) {
          clearTimeout(userState.inactivityTimer);
        }
      });
    });

    this.typingStates.clear();
    this.typingStatesMap$.next(new Map());
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Timers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Setup debounce timer for typing event (max send every 500ms)
   */
  private setupDebounceTimer(conversationId: number, userId: number): void {
    const typingStatesMap = this.typingStates.get(conversationId);
    if (!typingStatesMap) {
      return;
    }

    const userState = typingStatesMap.get(userId);
    if (!userState) {
      return;
    }

    // Clear existing timer
    if (userState.debounceTimer) {
      clearTimeout(userState.debounceTimer);
    }

    // Emit typing event immediately on first keystroke
    if (!userState.debounceTimer) {
      this.userStartedTyping$.next({
        conversationId,
        typistId: userId,
        typistName: userState.userName
      });
    }

    // Set timer for next allowed send
    userState.debounceTimer = window.setTimeout(() => {
      // Send again if still typing
      if (userState.isTyping) {
        this.userStartedTyping$.next({
          conversationId,
          typistId: userId,
          typistName: userState.userName
        });

        // Restart debounce timer
        this.setupDebounceTimer(conversationId, userId);
      }
    }, this.config.debounceDelay);

    // Also setup inactivity timer
    this.setupInactivityTimer(conversationId, userId);
  }

  /**
   * Setup inactivity timer (stop after 3s with no updates)
   */
  private setupInactivityTimer(conversationId: number, userId: number): void {
    const typingStatesMap = this.typingStates.get(conversationId);
    if (!typingStatesMap) {
      return;
    }

    const userState = typingStatesMap.get(userId);
    if (!userState) {
      return;
    }

    // Clear existing timer
    if (userState.inactivityTimer) {
      clearTimeout(userState.inactivityTimer);
    }

    // Set new timer
    userState.inactivityTimer = window.setTimeout(() => {
      if (userState.isTyping) {
        // Auto-stop after inactivity timeout
        this.markUserStoppedTyping(conversationId);
      }
    }, this.config.inactivityTimeout);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: State Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update the typing states map and emit new value
   */
  private updateTypingStatesMap(conversationId: number): void {
    const allStates = this.getAllTypingStates();
    this.typingStatesMap$.next(allStates);
  }

  /**
   * Setup periodic cleanup of stale typing states
   */
  private setupCleanupInterval(): void {
    interval(this.config.cleanupInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cleanupStaleTypingStates();
      });
  }

  /**
   * Remove typing states that haven't been updated for a long time
   */
  private cleanupStaleTypingStates(): void {
    const now = new Date().getTime();
    const maxAge = this.config.inactivityTimeout + 5000; // 3s timeout + 5s grace

    this.typingStates.forEach((typingStatesMap, conversationId) => {
      typingStatesMap.forEach((userState, userId) => {
        const age = now - userState.lastUpdateAt.getTime();

        if (age > maxAge && !userState.isTyping) {
          // Remove stale state
          typingStatesMap.delete(userId);
        }
      });

      // Remove empty conversation states
      if (typingStatesMap.size === 0) {
        this.typingStates.delete(conversationId);
      }
    });

    this.updateTypingStatesMap(0);
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    // Clear all timers
    this.clearAllTypingStates();

    // Complete subjects
    this.destroy$.next();
    this.destroy$.complete();
    this.userStartedTyping$.complete();
    this.userStoppedTyping$.complete();
    this.typingStatusChanged$.complete();
  }
}
