/**
 * User Presence Service
 * Manages user presence state, online/offline tracking, and event broadcasting
 *
 * Features:
 * - Tracks user online/offline status
 * - Shows "Online now" or "Last seen X hours ago"
 * - Subscription to WebSocket presence updates
 * - Observable streams for reactive updates
 * - Last seen timestamp management
 * - Query methods for presence state
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable, interval } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  takeUntil,
  filter,
  switchMap
} from 'rxjs/operators';

import {
  UserPresenceEvent,
  UserOnlineEvent,
  UserOfflineEvent,
  PresenceEvent,
  UserPresenceState,
  ConversationPresenceState,
  PresenceStatus
} from './models';

/**
 * Configuration for presence service behavior
 */
interface PresenceServiceConfig {
  presenceCheckInterval: number;  // Check presence every 60s
  presenceHeartbeat: number;      // Send heartbeat every 30s
  offlineTimeout: number;         // Mark offline after 2 minutes
  formatType: 'relative' | 'absolute'; // Relative: "2 hours ago", Absolute: "3:30 PM"
}

/**
 * Internal presence state tracker
 */
interface InternalPresenceState {
  userId: number;
  userName: string;
  email?: string;
  status: PresenceStatus;
  isOnline: boolean;
  lastSeenAt: Date;
  comingOnlineAt?: Date;
  updatedAt: Date;
  lastHeartbeat?: Date;
  heartbeatTimer?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PresenceService implements OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  private config: PresenceServiceConfig = {
    presenceCheckInterval: 60000,    // Check every 60 seconds
    presenceHeartbeat: 30000,        // Heartbeat every 30 seconds
    offlineTimeout: 120000,          // Mark offline after 2 minutes
    formatType: 'relative'           // Relative time format
  };

  // ═══════════════════════════════════════════════════════════════
  // Current State
  // ═══════════════════════════════════════════════════════════════

  private currentUserId: number | null = null;
  private currentUserName: string | null = null;
  private currentUserEmail: string | null = null;

  // Track presence state per user
  private presenceStates = new Map<number, InternalPresenceState>();

  // Track presence per conversation
  private conversationPresence = new Map<number, Map<number, InternalPresenceState>>();

  // ═══════════════════════════════════════════════════════════════
  // Subjects & Observables
  // ═══════════════════════════════════════════════════════════════

  // When presence status changes
  private presenceChanged$ = new Subject<PresenceEvent>();

  // When user comes online
  private userOnline$ = new Subject<{
    userId: number;
    userName: string;
    comingOnlineAt: Date;
  }>();

  // When user goes offline
  private userOffline$ = new Subject<{
    userId: number;
    userName: string;
    lastSeenAt: Date;
  }>();

  // Map of all presence states
  private presenceStatesMap$ = new BehaviorSubject<Map<number, UserPresenceState>>(
    new Map()
  );

  // ═══════════════════════════════════════════════════════════════
  // Public Observable Streams
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emitted when presence status changes (online/offline)
   */
  public presenceEvent$ = this.presenceChanged$.asObservable();

  /**
   * Emitted when user comes online
   */
  public userOnline = this.userOnline$.asObservable();

  /**
   * Emitted when user goes offline
   */
  public userOffline = this.userOffline$.asObservable();

  /**
   * Current presence states map for all users
   */
  public presenceStates = this.presenceStatesMap$.asObservable();

  /**
   * Observable for user presence status
   */
  public userPresenceStatus$ = (userId: number): Observable<PresenceStatus> => {
    return this.presenceStatesMap$.pipe(
      map(statesMap => statesMap.get(userId)?.status ?? 'offline'),
      distinctUntilChanged()
    );
  };

  /**
   * Observable for online/offline status
   */
  public isUserOnline$ = (userId: number): Observable<boolean> => {
    return this.presenceStatesMap$.pipe(
      map(statesMap => statesMap.get(userId)?.isOnline ?? false),
      distinctUntilChanged()
    );
  };

  /**
   * Observable for formatted online indicator
   * Returns "Online now" or "Last seen X hours ago"
   */
  public onlineIndicator$ = (userId: number): Observable<string> => {
    return this.presenceStatesMap$.pipe(
      map(statesMap => {
        const state = statesMap.get(userId);
        if (!state) return 'Offline';
        return this.formatPresenceStatus(state);
      }),
      distinctUntilChanged()
    );
  };

  /**
   * Observable for presence in specific conversation
   */
  public conversationPresence$ = (
    conversationId: number,
    participantId: number
  ): Observable<ConversationPresenceState | null> => {
    return this.presenceStatesMap$.pipe(
      map(statesMap => {
        const state = statesMap.get(participantId);
        if (!state) return null;

        return {
          conversationId,
          participantId: state.userId,
          participantName: state.userName,
          status: state.status,
          isOnline: state.isOnline,
          lastSeenAt: state.lastSeenAt,
          onlineIndicator: this.formatPresenceStatus(state)
        };
      }),
      filter(state => state !== null)
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
    this.setupPresenceCheck();
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Configuration
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set custom configuration
   */
  public setConfig(config: Partial<PresenceServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): PresenceServiceConfig {
    return { ...this.config };
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: User Context
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set current user context for presence
   */
  public setCurrentUser(userId: number, userName: string, email?: string): void {
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.currentUserEmail = email;

    console.log('[Presence] User context set:', { userId, userName });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Presence Updates
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark current user as online
   */
  public markUserOnline(): void {
    if (!this.currentUserId || !this.currentUserName) {
      console.warn('[Presence] User not set');
      return;
    }

    const now = new Date();
    const state: InternalPresenceState = {
      userId: this.currentUserId,
      userName: this.currentUserName,
      email: this.currentUserEmail,
      status: 'online',
      isOnline: true,
      lastSeenAt: now,
      comingOnlineAt: now,
      updatedAt: now
    };

    this.presenceStates.set(this.currentUserId, state);
    this.updatePresenceMap();

    // Emit event
    this.userOnline$.next({
      userId: this.currentUserId,
      userName: this.currentUserName,
      comingOnlineAt: now
    });

    console.log('[Presence] User marked online:', this.currentUserId);
  }

  /**
   * Mark current user as offline
   */
  public markUserOffline(): void {
    if (!this.currentUserId) {
      return;
    }

    const state = this.presenceStates.get(this.currentUserId);
    if (!state) {
      return;
    }

    const now = new Date();
    state.status = 'offline';
    state.isOnline = false;
    state.lastSeenAt = now;
    state.updatedAt = now;

    this.updatePresenceMap();

    // Emit event
    this.userOffline$.next({
      userId: this.currentUserId,
      userName: this.currentUserName!,
      lastSeenAt: now
    });

    console.log('[Presence] User marked offline:', this.currentUserId);
  }

  /**
   * Send heartbeat to keep online status
   */
  public sendHeartbeat(): void {
    if (!this.currentUserId) {
      return;
    }

    const state = this.presenceStates.get(this.currentUserId);
    if (state) {
      state.lastHeartbeat = new Date();
    }

    console.log('[Presence] Heartbeat sent for user:', this.currentUserId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Incoming Presence Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle incoming presence event from WebSocket
   */
  public handlePresenceEvent(event: UserPresenceEvent): void {
    // Don't process own presence events
    if (event.userId === this.currentUserId) {
      return;
    }

    const state: InternalPresenceState = {
      userId: event.userId,
      userName: event.userName,
      email: event.email,
      status: event.status,
      isOnline: event.status === 'online',
      lastSeenAt: event.lastSeenAt,
      comingOnlineAt: event.comingOnlineAt,
      updatedAt: event.timestamp
    };

    this.presenceStates.set(event.userId, state);
    this.updatePresenceMap();

    // Emit event
    this.presenceChanged$.next(event);

    console.log('[Presence] Received presence event:', {
      userId: event.userId,
      status: event.status
    });
  }

  /**
   * Handle incoming user online event
   */
  public handleUserOnlineEvent(event: UserOnlineEvent): void {
    if (event.userId === this.currentUserId) {
      return;
    }

    const state = this.presenceStates.get(event.userId) || {
      userId: event.userId,
      userName: event.userName,
      email: event.email,
      status: 'online' as PresenceStatus,
      isOnline: true,
      lastSeenAt: event.timestamp,
      comingOnlineAt: event.comingOnlineAt,
      updatedAt: event.timestamp
    };

    state.status = 'online';
    state.isOnline = true;
    state.comingOnlineAt = event.comingOnlineAt;
    state.updatedAt = event.timestamp;

    this.presenceStates.set(event.userId, state);
    this.updatePresenceMap();

    // Emit events
    this.presenceChanged$.next(event);
    this.userOnline$.next({
      userId: event.userId,
      userName: event.userName,
      comingOnlineAt: event.comingOnlineAt
    });

    console.log('[Presence] User came online:', {
      userId: event.userId,
      userName: event.userName
    });
  }

  /**
   * Handle incoming user offline event
   */
  public handleUserOfflineEvent(event: UserOfflineEvent): void {
    if (event.userId === this.currentUserId) {
      return;
    }

    const state = this.presenceStates.get(event.userId) || {
      userId: event.userId,
      userName: event.userName,
      email: event.email,
      status: 'offline' as PresenceStatus,
      isOnline: false,
      lastSeenAt: event.lastSeenAt,
      updatedAt: event.timestamp
    };

    state.status = 'offline';
    state.isOnline = false;
    state.lastSeenAt = event.lastSeenAt;
    state.updatedAt = event.timestamp;

    this.presenceStates.set(event.userId, state);
    this.updatePresenceMap();

    // Emit events
    this.presenceChanged$.next(event);
    this.userOffline$.next({
      userId: event.userId,
      userName: event.userName,
      lastSeenAt: event.lastSeenAt
    });

    console.log('[Presence] User went offline:', {
      userId: event.userId,
      userName: event.userName
    });
  }

  /**
   * Handle batch presence events
   */
  public handleBatchPresenceEvents(events: PresenceEvent[]): void {
    events.forEach(event => {
      if (event.eventType === 'presence') {
        this.handlePresenceEvent(event as UserPresenceEvent);
      } else if (event.eventType === 'user_online') {
        this.handleUserOnlineEvent(event as UserOnlineEvent);
      } else if (event.eventType === 'user_offline') {
        this.handleUserOfflineEvent(event as UserOfflineEvent);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Queries
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if user is online
   */
  public isUserOnline(userId: number): boolean {
    const state = this.presenceStates.get(userId);
    return state?.isOnline ?? false;
  }

  /**
   * Get user presence status
   */
  public getUserPresenceStatus(userId: number): PresenceStatus {
    const state = this.presenceStates.get(userId);
    return state?.status ?? 'offline';
  }

  /**
   * Get last seen timestamp for user
   */
  public getUserLastSeen(userId: number): Date | undefined {
    const state = this.presenceStates.get(userId);
    return state?.lastSeenAt;
  }

  /**
   * Get formatted presence status
   * Returns "Online now" or "Last seen 2 hours ago"
   */
  public getFormattedPresenceStatus(userId: number): string {
    const state = this.presenceStates.get(userId);
    if (!state) {
      return 'Offline';
    }

    return this.formatPresenceStatus(state);
  }

  /**
   * Get all presence states
   */
  public getAllPresenceStates(): UserPresenceState[] {
    return Array.from(this.presenceStates.values()).map(state => ({
      userId: state.userId,
      userName: state.userName,
      email: state.email,
      status: state.status,
      isOnline: state.isOnline,
      lastSeenAt: state.lastSeenAt,
      comingOnlineAt: state.comingOnlineAt,
      updatedAt: state.updatedAt
    }));
  }

  /**
   * Get online users count
   */
  public getOnlineUsersCount(): number {
    return Array.from(this.presenceStates.values()).filter(s => s.isOnline).length;
  }

  /**
   * Get presence state for user
   */
  public getUserPresenceState(userId: number): UserPresenceState | undefined {
    const state = this.presenceStates.get(userId);
    if (!state) {
      return undefined;
    }

    return {
      userId: state.userId,
      userName: state.userName,
      email: state.email,
      status: state.status,
      isOnline: state.isOnline,
      lastSeenAt: state.lastSeenAt,
      comingOnlineAt: state.comingOnlineAt,
      updatedAt: state.updatedAt
    };
  }

  /**
   * Clear presence data for user
   */
  public clearUserPresence(userId: number): void {
    this.presenceStates.delete(userId);
    this.updatePresenceMap();
  }

  /**
   * Clear all presence data
   */
  public clearAllPresence(): void {
    this.presenceStates.clear();
    this.presenceStatesMap$.next(new Map());
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Formatting
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format presence status for display
   */
  private formatPresenceStatus(state: InternalPresenceState): string {
    if (state.status === 'online') {
      return 'Online now';
    }

    if (this.config.formatType === 'relative') {
      return this.formatRelativeTime(state.lastSeenAt);
    } else {
      return this.formatAbsoluteTime(state.lastSeenAt);
    }
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (seconds < 60) {
      return 'Last seen just now';
    } else if (minutes < 60) {
      return `Last seen ${minutes}m ago`;
    } else if (hours < 24) {
      return `Last seen ${hours}h ago`;
    } else if (days < 7) {
      return `Last seen ${days}d ago`;
    } else if (weeks < 4) {
      return `Last seen ${weeks}w ago`;
    } else {
      return `Last seen ${new Date(date).toLocaleDateString()}`;
    }
  }

  /**
   * Format absolute time (e.g., "3:30 PM")
   */
  private formatAbsoluteTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: State Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update the presence states map and emit new value
   */
  private updatePresenceMap(): void {
    const statesMap = new Map<number, UserPresenceState>();

    this.presenceStates.forEach((state, userId) => {
      statesMap.set(userId, {
        userId: state.userId,
        userName: state.userName,
        email: state.email,
        status: state.status,
        isOnline: state.isOnline,
        lastSeenAt: state.lastSeenAt,
        comingOnlineAt: state.comingOnlineAt,
        updatedAt: state.updatedAt
      });
    });

    this.presenceStatesMap$.next(statesMap);
  }

  /**
   * Setup periodic presence check
   */
  private setupPresenceCheck(): void {
    interval(this.config.presenceCheckInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkPresenceStatus();
      });
  }

  /**
   * Check if any users should be marked offline due to timeout
   */
  private checkPresenceStatus(): void {
    const now = new Date().getTime();

    this.presenceStates.forEach((state, userId) => {
      if (state.isOnline) {
        const lastUpdate = new Date(state.updatedAt).getTime();
        const timeSinceUpdate = now - lastUpdate;

        // Mark offline if no update for timeout period
        if (timeSinceUpdate > this.config.offlineTimeout) {
          state.status = 'offline';
          state.isOnline = false;
          this.updatePresenceMap();

          console.log('[Presence] User marked offline due to timeout:', userId);
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    // Clear all timers and states
    this.presenceStates.forEach(state => {
      if (state.heartbeatTimer) {
        clearTimeout(state.heartbeatTimer);
      }
    });

    this.presenceStates.clear();

    // Complete subjects
    this.destroy$.next();
    this.destroy$.complete();
    this.presenceChanged$.complete();
    this.userOnline$.complete();
    this.userOffline$.complete();
  }
}
