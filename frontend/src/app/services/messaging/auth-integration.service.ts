/**
 * Authentication Integration Service
 * Bridges AuthService with MessagingService and WebSocketService
 * Handles authenticated messaging and WebSocket connections
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { MessagingService } from './messaging.service';
import { WebSocketService } from './websocket.service';

export interface AuthenticatedUser {
  id: number;
  email: string;
  fullName: string;
  role: 'patient' | 'doctor' | 'admin';
  name?: string;
}

export interface MessagingAuthState {
  isAuthenticated: boolean;
  user: AuthenticatedUser | null;
  token: string | null;
  wsConnected: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthIntegrationService implements OnDestroy {
  private destroy$ = new Subject<void>();

  // Authentication state
  private authStateSubject = new BehaviorSubject<MessagingAuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    wsConnected: false,
    error: null
  });
  public authState$ = this.authStateSubject.asObservable();

  // WebSocket connection state
  private wsConnectionSubject = new BehaviorSubject<boolean>(false);
  public wsConnected$ = this.wsConnectionSubject.asObservable();

  // Messaging ready state
  private messagingReadySubject = new BehaviorSubject<boolean>(false);
  public messagingReady$ = this.messagingReadySubject.asObservable();

  constructor(
    private authService: AuthService,
    private messagingService: MessagingService,
    private webSocketService: WebSocketService
  ) {
    this.initializeAuthIntegration();
  }

  /**
   * Initialize authentication integration
   * Set up watchers for auth state changes
   */
  private initializeAuthIntegration(): void {
    console.log('[AuthIntegration] Initializing authentication integration...');

    // Watch for authentication state changes
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        if (isAuthenticated) {
          this.handleAuthenticationSuccess();
        } else {
          this.handleAuthenticationLogout();
        }
      });

    // Watch for WebSocket connection state changes
    this.messagingService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.wsConnectionSubject.next(status.isConnected);
        this.updateMessagingReadyState();
      });

    // Check initial authentication state
    if (this.authService.isAuthenticated()) {
      this.handleAuthenticationSuccess();
    }

    console.log('[AuthIntegration] Initialization complete');
  }

  /**
   * Handle successful authentication
   * Set up messaging services
   */
  private handleAuthenticationSuccess(): void {
    console.log('[AuthIntegration] Handling authentication success');

    const currentUser = this.authService.getCurrentUser();
    const token = this.getAuthToken();

    if (!currentUser || !token) {
      console.warn('[AuthIntegration] Missing user or token');
      return;
    }

    // Convert to authenticated user format
    const authenticatedUser: AuthenticatedUser = {
      id: currentUser.id,
      email: currentUser.email,
      fullName: currentUser.fullName || currentUser.name || '',
      role: this.normalizeRole(currentUser.role),
      name: currentUser.name || currentUser.fullName
    };

    // Update auth state
    const newAuthState: MessagingAuthState = {
      isAuthenticated: true,
      user: authenticatedUser,
      token,
      wsConnected: this.wsConnectionSubject.value,
      error: null
    };

    this.authStateSubject.next(newAuthState);
    this.updateMessagingReadyState();

    // Automatically connect WebSocket if not already connected
    if (!this.webSocketService.isConnected()) {
      this.connectWebSocket(authenticatedUser.id, token);
    }

    console.log('[AuthIntegration] Authentication success - User:', authenticatedUser.email);
  }

  /**
   * Handle logout
   * Disconnect messaging services
   */
  private handleAuthenticationLogout(): void {
    console.log('[AuthIntegration] Handling logout');

    // Disconnect WebSocket
    this.webSocketService.disconnect();

    // Reset auth state
    const newAuthState: MessagingAuthState = {
      isAuthenticated: false,
      user: null,
      token: null,
      wsConnected: false,
      error: null
    };

    this.authStateSubject.next(newAuthState);
    this.messagingReadySubject.next(false);

    console.log('[AuthIntegration] Logout complete');
  }

  /**
   * Connect WebSocket with authentication
   */
  private connectWebSocket(userId: number, token: string): void {
    console.log('[AuthIntegration] Connecting WebSocket for user:', userId);

    try {
      this.webSocketService.connect(token, userId);
      console.log('[AuthIntegration] WebSocket connection initiated');
    } catch (error) {
      console.error('[AuthIntegration] WebSocket connection error:', error);
      const currentState = this.authStateSubject.value;
      this.authStateSubject.next({
        ...currentState,
        error: 'Failed to connect WebSocket'
      });
    }
  }

  /**
   * Update messaging ready state
   * Ready when authenticated AND WebSocket connected
   */
  private updateMessagingReadyState(): void {
    const currentState = this.authStateSubject.value;
    const isReady = currentState.isAuthenticated && this.wsConnectionSubject.value;
    this.messagingReadySubject.next(isReady);

    console.log('[AuthIntegration] Messaging ready:', isReady);
  }

  /**
   * Get authentication token from auth service
   */
  private getAuthToken(): string | null {
    // Access token through localStorage or auth service
    // Note: StorageService is used in AuthService
    try {
      const token = localStorage.getItem('accessToken');
      return token || null;
    } catch (error) {
      console.error('[AuthIntegration] Error retrieving token:', error);
      return null;
    }
  }

  /**
   * Normalize role string to messaging role type
   */
  private normalizeRole(role: string): 'patient' | 'doctor' | 'admin' {
    if (!role) return 'patient';

    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('doctor')) return 'doctor';
    if (lowerRole.includes('admin')) return 'admin';
    return 'patient';
  }

  /**
   * Public API Methods
   */

  /**
   * Get current auth state
   */
  getAuthState(): MessagingAuthState {
    return this.authStateSubject.value;
  }

  /**
   * Check if user is authenticated and messaging is ready
   */
  isMessagingReady(): boolean {
    return this.messagingReadySubject.value;
  }

  /**
   * Get authenticated user
   */
  getAuthenticatedUser(): AuthenticatedUser | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected(): boolean {
    return this.wsConnectionSubject.value;
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  /**
   * Perform logout with cleanup
   */
  logout(): void {
    console.log('[AuthIntegration] Initiating logout...');
    this.authService.logout();
    // Cleanup is handled by authentication state change listener
  }

  /**
   * Retry WebSocket connection
   */
  retryWebSocketConnection(): void {
    const currentState = this.authStateSubject.value;

    if (!currentState.isAuthenticated || !currentState.user || !currentState.token) {
      console.warn('[AuthIntegration] Cannot retry - not authenticated');
      return;
    }

    console.log('[AuthIntegration] Retrying WebSocket connection...');
    this.connectWebSocket(currentState.user.id, currentState.token);
  }

  /**
   * Ensure authentication before messaging operation
   */
  ensureAuthenticated(): Observable<AuthenticatedUser | null> {
    return new Observable(observer => {
      const currentState = this.authStateSubject.value;

      if (currentState.isAuthenticated && currentState.user) {
        observer.next(currentState.user);
        observer.complete();
      } else {
        observer.error(new Error('Not authenticated'));
      }
    });
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    console.log('[AuthIntegration] Cleaning up...');
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }
}
