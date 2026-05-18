/**
 * Connection UI Service
 * Manages UI representation and user notifications for connection state
 *
 * Features:
 * - User-friendly status messages
 * - Toast/banner notifications
 * - Connection status display formatting
 * - Retry UI state management
 * - Accessibility support (announcements)
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { ConnectionState, ConnectionStatusExtended } from './models';
import { ConnectionManagerService } from './connection-manager.service';

/**
 * UI notification for display
 */
export interface ConnectionNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  description?: string;
  actionLabel?: string;
  actionCallback?: () => void;
  dismissible: boolean;
  autoClose: boolean;
  autoCloseDuration?: number;
  timestamp: Date;
  ariaLive?: 'polite' | 'assertive';
}

/**
 * Status display text
 */
export interface StatusDisplay {
  state: ConnectionState;
  mainText: string;
  subText: string;
  iconClass: string;
  colorClass: string;
  isAnimated: boolean;
  showRetryButton: boolean;
  showDetails: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionUiService implements OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  private notifications: Map<string, ConnectionNotification> = new Map();
  private displayedState: ConnectionState = ConnectionState.DISCONNECTED;

  // ═══════════════════════════════════════════════════════════════
  // Subjects & Observables
  // ═══════════════════════════════════════════════════════════════

  // New notification to display
  private notificationAdded$ = new Subject<ConnectionNotification>();

  // Notification to dismiss
  private notificationDismissed$ = new Subject<string>();

  // Status display for current state
  private statusDisplay$ = new BehaviorSubject<StatusDisplay>(
    this.getStatusDisplay(ConnectionState.DISCONNECTED)
  );

  // All active notifications
  private activeNotifications$ = new BehaviorSubject<ConnectionNotification[]>([]);

  // Banner visibility
  private showBanner$ = new BehaviorSubject<boolean>(false);

  // ═══════════════════════════════════════════════════════════════
  // Public Observables
  // ═══════════════════════════════════════════════════════════════

  public notificationAdded = this.notificationAdded$.asObservable();
  public notificationDismissed = this.notificationDismissed$.asObservable();
  public statusDisplay = this.statusDisplay$.asObservable();
  public activeNotifications = this.activeNotifications$.asObservable();
  public showBanner = this.showBanner$.asObservable();

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(private connectionManager: ConnectionManagerService) {
    this.initializeService();
  }

  /**
   * Initialize service
   */
  private initializeService(): void {
    console.log('[ConnectionUiService] Initializing service');

    // Subscribe to connection state changes
    this.connectionManager.connectionState.subscribe(state => {
      this.handleStateChange(state);
    });

    // Subscribe to connection events
    this.connectionManager.connectionEvent.subscribe(event => {
      this.handleConnectionEvent(event);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Status Display
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current status display
   */
  public getStatusDisplay(): StatusDisplay {
    return this.statusDisplay$.getValue();
  }

  /**
   * Get status message for state
   */
  public getStatusMessage(state: ConnectionState): string {
    return this.getStatusDisplay(state).mainText;
  }

  /**
   * Get status description for state
   */
  public getStatusDescription(state: ConnectionState): string {
    return this.getStatusDisplay(state).subText;
  }

  /**
   * Get icon class for state
   */
  public getIconClass(state: ConnectionState): string {
    return this.getStatusDisplay(state).iconClass;
  }

  /**
   * Get color class for state
   */
  public getColorClass(state: ConnectionState): string {
    return this.getStatusDisplay(state).colorClass;
  }

  /**
   * Check if status is animated
   */
  public isStatusAnimated(state: ConnectionState): boolean {
    return this.getStatusDisplay(state).isAnimated;
  }

  /**
   * Check if should show retry button
   */
  public shouldShowRetryButton(state: ConnectionState): boolean {
    return this.getStatusDisplay(state).showRetryButton;
  }

  /**
   * Get full status text with details
   */
  public getFullStatusText(state: ConnectionState, showDetails = false): string {
    const display = this.getStatusDisplay(state);
    if (!showDetails) {
      return display.mainText;
    }
    return `${display.mainText} - ${display.subText}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Notifications
  // ═══════════════════════════════════════════════════════════════

  /**
   * Add notification
   */
  public addNotification(notification: Omit<ConnectionNotification, 'id' | 'timestamp'>): ConnectionNotification {
    const fullNotification: ConnectionNotification = {
      ...notification,
      id: this.generateNotificationId(),
      timestamp: new Date()
    };

    this.notifications.set(fullNotification.id, fullNotification);
    this.updateActiveNotifications();
    this.notificationAdded$.next(fullNotification);

    // Auto-dismiss if enabled
    if (fullNotification.autoClose && fullNotification.autoCloseDuration) {
      setTimeout(() => {
        this.dismissNotification(fullNotification.id);
      }, fullNotification.autoCloseDuration);
    }

    return fullNotification;
  }

  /**
   * Dismiss notification
   */
  public dismissNotification(notificationId: string): void {
    this.notifications.delete(notificationId);
    this.updateActiveNotifications();
    this.notificationDismissed$.next(notificationId);

    console.log('[ConnectionUiService] Notification dismissed:', notificationId);
  }

  /**
   * Clear all notifications
   */
  public clearNotifications(): void {
    this.notifications.clear();
    this.updateActiveNotifications();

    console.log('[ConnectionUiService] All notifications cleared');
  }

  /**
   * Get all active notifications
   */
  public getActiveNotifications(): ConnectionNotification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get notification by ID
   */
  public getNotification(notificationId: string): ConnectionNotification | undefined {
    return this.notifications.get(notificationId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Banner Control
  // ═══════════════════════════════════════════════════════════════

  /**
   * Show banner
   */
  public showConnectionBanner(): void {
    this.showBanner$.next(true);
    console.log('[ConnectionUiService] Banner shown');
  }

  /**
   * Hide banner
   */
  public hideConnectionBanner(): void {
    this.showBanner$.next(false);
    console.log('[ConnectionUiService] Banner hidden');
  }

  /**
   * Check if banner is shown
   */
  public isBannerShown(): boolean {
    return this.showBanner$.getValue();
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Event Handlers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle connection state change
   */
  private handleStateChange(state: ConnectionState): void {
    this.displayedState = state;
    const display = this.getStatusDisplay(state);
    this.statusDisplay$.next(display);

    console.log('[ConnectionUiService] State changed:', state);

    // Show banner for disconnected/reconnecting/failed states
    if (state === ConnectionState.DISCONNECTED ||
        state === ConnectionState.RECONNECTING ||
        state === ConnectionState.RECONNECTION_FAILED) {
      this.showConnectionBanner();
    } else if (state === ConnectionState.CONNECTED) {
      // Hide banner after a delay when reconnected
      setTimeout(() => {
        if (this.displayedState === ConnectionState.CONNECTED) {
          this.hideConnectionBanner();
        }
      }, 2000);
    }
  }

  /**
   * Handle connection event
   */
  private handleConnectionEvent(event: any): void {
    switch (event.state) {
      case ConnectionState.DISCONNECTED:
        this.handleDisconnectedEvent(event);
        break;
      case ConnectionState.RECONNECTING:
        this.handleReconnectingEvent(event);
        break;
      case ConnectionState.CONNECTED:
        this.handleConnectedEvent(event);
        break;
      case ConnectionState.RECONNECTION_FAILED:
        this.handleReconnectionFailedEvent(event);
        break;
      case ConnectionState.DEGRADED:
        this.handleDegradedEvent(event);
        break;
    }
  }

  /**
   * Handle disconnected event
   */
  private handleDisconnectedEvent(event: any): void {
    const notification = this.addNotification({
      type: 'warning',
      message: 'Connection Lost',
      description: 'You are offline. Messages will be queued and sent when reconnected.',
      dismissible: false,
      autoClose: false,
      ariaLive: 'assertive'
    });

    console.log('[ConnectionUiService] Disconnected notification added:', notification.id);
  }

  /**
   * Handle reconnecting event
   */
  private handleReconnectingEvent(event: any): void {
    const attempts = event.attemptNumber || 0;
    const maxAttempts = this.connectionManager.getReconnectionStrategy().maxAttempts;

    const notification = this.addNotification({
      type: 'info',
      message: 'Reconnecting...',
      description: `Attempt ${attempts} of ${maxAttempts}. Connecting in ${(event.nextRetryIn || 0) / 1000}s...`,
      dismissible: true,
      autoClose: false,
      ariaLive: 'polite'
    });

    console.log('[ConnectionUiService] Reconnecting notification added:', notification.id);
  }

  /**
   * Handle connected event
   */
  private handleConnectedEvent(event: any): void {
    // Dismiss all disconnection-related notifications
    this.notifications.forEach((notif) => {
      if (['warning', 'error'].includes(notif.type)) {
        this.dismissNotification(notif.id);
      }
    });

    // Add success notification
    const notification = this.addNotification({
      type: 'success',
      message: 'Reconnected',
      description: 'Your connection has been restored. Queued messages are being sent.',
      dismissible: true,
      autoClose: true,
      autoCloseDuration: 5000,
      ariaLive: 'assertive'
    });

    console.log('[ConnectionUiService] Connected notification added:', notification.id);
  }

  /**
   * Handle reconnection failed event
   */
  private handleReconnectionFailedEvent(event: any): void {
    const notification = this.addNotification({
      type: 'error',
      message: 'Unable to Reconnect',
      description: 'Failed to reconnect after multiple attempts. Please check your connection and try refreshing.',
      actionLabel: 'Retry',
      actionCallback: () => {
        this.connectionManager.reconnect();
        this.dismissNotification(notification.id);
      },
      dismissible: true,
      autoClose: false,
      ariaLive: 'assertive'
    });

    console.log('[ConnectionUiService] Reconnection failed notification added:', notification.id);
  }

  /**
   * Handle degraded event
   */
  private handleDegradedEvent(event: any): void {
    const notification = this.addNotification({
      type: 'warning',
      message: 'Slow Connection',
      description: 'Your connection quality is poor. Messages may take longer to send.',
      dismissible: true,
      autoClose: true,
      autoCloseDuration: 8000,
      ariaLive: 'polite'
    });

    console.log('[ConnectionUiService] Degraded notification added:', notification.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get status display for state
   */
  private getStatusDisplay(state: ConnectionState): StatusDisplay {
    switch (state) {
      case ConnectionState.CONNECTED:
        return {
          state,
          mainText: 'Connected',
          subText: 'Online and ready',
          iconClass: 'icon-check-circle',
          colorClass: 'text-success',
          isAnimated: false,
          showRetryButton: false,
          showDetails: false
        };

      case ConnectionState.DISCONNECTED:
        return {
          state,
          mainText: 'Disconnected',
          subText: 'Offline mode. Messages will queue.',
          iconClass: 'icon-wifi-off',
          colorClass: 'text-warning',
          isAnimated: false,
          showRetryButton: true,
          showDetails: true
        };

      case ConnectionState.RECONNECTING:
        return {
          state,
          mainText: 'Reconnecting...',
          subText: 'Attempting to restore connection',
          iconClass: 'icon-sync',
          colorClass: 'text-info',
          isAnimated: true,
          showRetryButton: false,
          showDetails: true
        };

      case ConnectionState.RECONNECTION_FAILED:
        return {
          state,
          mainText: 'Reconnection Failed',
          subText: 'Unable to restore connection. Check your network.',
          iconClass: 'icon-alert-circle',
          colorClass: 'text-danger',
          isAnimated: false,
          showRetryButton: true,
          showDetails: true
        };

      case ConnectionState.DEGRADED:
        return {
          state,
          mainText: 'Slow Connection',
          subText: 'Connection quality is poor',
          iconClass: 'icon-wifi-alert',
          colorClass: 'text-warning',
          isAnimated: true,
          showRetryButton: false,
          showDetails: true
        };

      default:
        return {
          state: ConnectionState.DISCONNECTED,
          mainText: 'Unknown',
          subText: 'Unknown connection state',
          iconClass: 'icon-help-circle',
          colorClass: 'text-muted',
          isAnimated: false,
          showRetryButton: false,
          showDetails: false
        };
    }
  }

  /**
   * Update active notifications
   */
  private updateActiveNotifications(): void {
    const notifications = Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.activeNotifications$.next(notifications);
  }

  /**
   * Generate notification ID
   */
  private generateNotificationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.notificationAdded$.complete();
    this.notificationDismissed$.complete();
    this.statusDisplay$.complete();
    this.activeNotifications$.complete();
    this.showBanner$.complete();
  }
}
