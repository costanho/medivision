/**
 * WebSocket Service
 * Manages WebSocket connections with SockJS fallback and STOMP for structured messaging
 *
 * Features:
 * - Native WebSocket with SockJS fallback (for browsers without WebSocket support)
 * - STOMP protocol for structured messaging
 * - Automatic reconnection with exponential backoff
 * - Keep-alive mechanism (ping/pong)
 * - Connection state tracking
 * - Event-based message routing
 */

import { Injectable, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';

// Import SockJS and STOMP
// @ts-ignore
import SockJS from 'sockjs-client';
// @ts-ignore
import * as Stomp from 'stompjs/lib/stomp';

import {
  WebSocketMessage,
  ChatMessageEvent,
  TypingIndicatorEvent,
  PresenceUpdateEvent,
  ReadReceiptEvent,
  ConnectionStatus
} from './models';

import { AuthService } from '../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  // Connection management
  private stompClient: Stomp.Client | null = null;
  private sockJS: WebSocket | null = null;
  private destroy$ = new Subject<void>();

  // Connection state
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
  });
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  // Message streams
  private webSocketMessagesSubject = new Subject<WebSocketMessage>();
  public webSocketMessages$ = this.webSocketMessagesSubject.asObservable();

  private chatMessagesSubject = new Subject<ChatMessageEvent>();
  public chatMessages$ = this.chatMessagesSubject.asObservable();

  private typingIndicatorsSubject = new Subject<TypingIndicatorEvent>();
  public typingIndicators$ = this.typingIndicatorsSubject.asObservable();

  private presenceUpdatesSubject = new Subject<PresenceUpdateEvent>();
  public presenceUpdates$ = this.presenceUpdatesSubject.asObservable();

  private readReceiptsSubject = new Subject<ReadReceiptEvent>();
  public readReceipts$ = this.readReceiptsSubject.asObservable();

  // Call events stream
  private callEventsSubject = new Subject<any>();
  public callEvents$ = this.callEventsSubject.asObservable();

  // Connection parameters
  private token: string = '';
  private userId: number = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private useStomp = true; // Use STOMP for structured messaging
  private isBrowser = false;

  // ═══════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.initializeService();
  }

  /**
   * Initialize service
   */
  private initializeService(): void {
    console.log('[WebSocketService] Service initialized');
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    console.log('[WebSocketService] Destroying service');
    this.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════
  // Connection Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Connect to WebSocket server
   * Uses SockJS with automatic WebSocket fallback
   */
  connect(token: string, userId: number): void {
    if (this.isConnected()) {
      console.log('[WebSocketService] Already connected');
      return;
    }

    this.token = token;
    this.userId = userId;

    console.log('[WebSocketService] Attempting to connect...');
    this.updateConnectionStatus(false);
    this.attemptConnection();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log('[WebSocketService] Disconnecting...');

    // Clear timers
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();

    // Disconnect STOMP if connected
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.disconnect(() => {
        console.log('[WebSocketService] STOMP disconnected');
      });
      this.stompClient = null;
    }

    // Close SockJS if connected
    if (this.sockJS) {
      this.sockJS.close();
      this.sockJS = null;
    }

    this.updateConnectionStatus(false);
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    if (this.useStomp && this.stompClient) {
      return this.stompClient.connected;
    }
    return this.sockJS !== null && this.sockJS.readyState === WebSocket.OPEN;
  }

  // ═══════════════════════════════════════════════════════════════
  // Message Sending
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send chat message
   */
  sendMessage(conversationId: number, recipientId: number, content: string, senderId: number, senderName: string): void {
    const message: ChatMessageEvent = {
      eventType: 'message',
      messageId: 0,
      senderId,
      senderName,
      recipientId,
      content,
      conversationId,
      timestamp: new Date()
    };

    this.sendWebSocketMessage('message', message);
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId: number, isTyping: boolean, senderId: number, senderName: string): void {
    const indicator: TypingIndicatorEvent = {
      eventType: 'typing',
      senderId,
      senderName,
      conversationId,
      isTyping,
      timestamp: new Date()
    };

    this.sendWebSocketMessage('typing', indicator);
  }

  /**
   * Send presence update
   */
  sendPresenceUpdate(status: 'online' | 'offline' | 'away' | 'idle', userId: number, userName: string): void {
    const presence: PresenceUpdateEvent = {
      eventType: 'presence',
      userId,
      userName,
      status,
      timestamp: new Date(),
      lastSeen: new Date()
    };

    this.sendWebSocketMessage('presence', presence);
  }

  /**
   * Send read receipt
   */
  sendReadReceipt(messageId: number, conversationId: number, readerId: number, readerName: string): void {
    const receipt: ReadReceiptEvent = {
      eventType: 'read',
      messageId,
      conversationId,
      readerId,
      readerName,
      timestamp: new Date()
    };

    this.sendWebSocketMessage('read', receipt);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Connection Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Attempt to establish WebSocket connection
   * Tries native WebSocket first, falls back to SockJS if needed
   */
  private attemptConnection(): void {
    // Only attempt connection in browser environment
    if (!this.isBrowser) {
      console.log('[WebSocketService] Skipping connection - not in browser environment');
      return;
    }

    try {
      const wsUrl = this.buildWebSocketUrl();
      console.log('[WebSocketService] Connecting to:', wsUrl.split('?')[0]);

      if (this.useStomp) {
        this.connectWithStomp(wsUrl);
      } else {
        this.connectWithNativeWebSocket(wsUrl);
      }
    } catch (error) {
      console.error('[WebSocketService] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Connect using STOMP with SockJS transport
   */
  private connectWithStomp(wsUrl: string): void {
    console.log('[WebSocketService] Connecting with STOMP...');

    // Create SockJS socket as transport
    this.sockJS = new SockJS(wsUrl) as any;

    // Create STOMP client
    this.stompClient = Stomp.over(this.sockJS);

    // Configure STOMP
    this.stompClient.reconnect_delay = this.reconnectDelay;
    this.stompClient.heartbeat = {
      outgoing: 20000, // Send heartbeat every 20 seconds
      incoming: 0      // Don't require incoming heartbeats
    };

    // Get current user info for WebSocket authentication headers
    const currentUser = this.authService.getCurrentUser();
    const userEmail = currentUser?.email || '';
    const userRole = this.authService.getCurrentRole() || '';

    console.log('[WebSocketService] STOMP handshake - user email:', userEmail, 'role:', userRole);

    // Connect to STOMP server
    this.stompClient.connect(
      {
        'Authorization': `Bearer ${this.token}`,
        'User-Id': this.userId.toString(),
        'X-User-Email': userEmail,
        'X-User-Role': userRole
      },
      (frame: any) => this.handleStompConnect(frame),
      (error: any) => this.handleStompError(error)
    );

    // Handle disconnection
    this.stompClient.onclose = () => this.handleStompDisconnect();
  }

  /**
   * Connect using native WebSocket
   */
  private connectWithNativeWebSocket(wsUrl: string): void {
    console.log('[WebSocketService] Connecting with native WebSocket...');

    try {
      this.sockJS = new WebSocket(wsUrl);

      this.sockJS.onopen = () => this.handleNativeWebSocketOpen();
      this.sockJS.onmessage = (event) => this.handleNativeWebSocketMessage(event);
      this.sockJS.onerror = (error) => this.handleNativeWebSocketError(error);
      this.sockJS.onclose = () => this.handleNativeWebSocketClose();
    } catch (error) {
      console.error('[WebSocketService] Native WebSocket error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Build WebSocket URL with authentication token
   * Points to the Direct Service backend at localhost:8081
   */
  private buildWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect to backend service at localhost:8081, not frontend at localhost:4200
    const backendHost = 'localhost:8081';
    // Use SockJS endpoint (Spring Boot default)
    return `${protocol}//${backendHost}/ws?token=${this.token}&userId=${this.userId}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // STOMP Connection Handlers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle successful STOMP connection
   */
  private handleStompConnect(frame: Stomp.Frame): void {
    console.log('[WebSocketService] STOMP connected:', frame);
    this.updateConnectionStatus(true);
    this.reconnectAttempts = 0;

    // Send initial presence update
    this.sendPresenceUpdate('online', this.userId, '');

    // Subscribe to chat messages
    this.stompClient?.subscribe('/user/queue/messages', (message: any) => {
      this.handleStompMessage(message);
    });

    // Subscribe to typing indicators
    this.stompClient?.subscribe('/user/queue/typing', (message: any) => {
      this.handleStompMessage(message);
    });

    // Subscribe to presence updates
    this.stompClient?.subscribe('/topic/presence', (message: any) => {
      this.handleStompMessage(message);
    });

    // Subscribe to read receipts
    this.stompClient?.subscribe('/user/queue/read', (message: any) => {
      this.handleStompMessage(message);
    });

    // Subscribe to call events
    this.stompClient?.subscribe('/user/queue/calls', (message: any) => {
      this.handleStompMessage(message);
    });

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Handle STOMP error
   */
  private handleStompError(error: Stomp.Frame | string): void {
    console.error('[WebSocketService] STOMP error:', error);
    this.updateConnectionStatus(false, 'STOMP connection failed');
    this.scheduleReconnect();
  }

  /**
   * Handle STOMP disconnection
   */
  private handleStompDisconnect(): void {
    console.log('[WebSocketService] STOMP disconnected');
    this.updateConnectionStatus(false);
    this.clearHeartbeatTimer();

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.error('[WebSocketService] Max reconnection attempts reached');
      this.updateConnectionStatus(false, 'Failed to reconnect');
    }
  }

  /**
   * Handle STOMP message
   */
  private handleStompMessage(message: Stomp.Message): void {
    try {
      const payload = JSON.parse(message.body);

      console.log('[WebSocketService] STOMP message received:', payload.eventType);

      switch (payload.eventType) {
        case 'message':
          this.chatMessagesSubject.next(payload as ChatMessageEvent);
          break;

        case 'typing':
          this.typingIndicatorsSubject.next(payload as TypingIndicatorEvent);
          break;

        case 'presence':
          this.presenceUpdatesSubject.next(payload as PresenceUpdateEvent);
          break;

        case 'read':
          this.readReceiptsSubject.next(payload as ReadReceiptEvent);
          break;

        case 'call':
        case 'call_incoming':
        case 'call_accepted':
        case 'call_rejected':
        case 'call_ended':
          this.callEventsSubject.next(payload);
          break;

        default:
          console.log('[WebSocketService] Unknown message type:', payload.eventType);
      }
    } catch (error) {
      console.error('[WebSocketService] Error parsing STOMP message:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Native WebSocket Handlers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle native WebSocket open
   */
  private handleNativeWebSocketOpen(): void {
    console.log('[WebSocketService] Native WebSocket connected');
    this.updateConnectionStatus(true);
    this.reconnectAttempts = 0;

    // Send initial presence update
    this.sendPresenceUpdate('online', this.userId, '');

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Handle native WebSocket message
   */
  private handleNativeWebSocketMessage(event: MessageEvent): void {
    try {
      const wsMessage: WebSocketMessage = JSON.parse(event.data);

      // Handle heartbeat responses
      if (wsMessage.type === 'connection' && wsMessage.payload?.action === 'pong') {
        console.log('[WebSocketService] Pong received');
        return;
      }

      console.log('[WebSocketService] WebSocket message received:', wsMessage.type);

      this.webSocketMessagesSubject.next(wsMessage);

      switch (wsMessage.type) {
        case 'message':
          const chatEvent = wsMessage.payload as ChatMessageEvent;
          this.chatMessagesSubject.next(chatEvent);
          break;

        case 'typing':
          const typingEvent = wsMessage.payload as TypingIndicatorEvent;
          this.typingIndicatorsSubject.next(typingEvent);
          break;

        case 'presence':
          const presenceEvent = wsMessage.payload as PresenceUpdateEvent;
          this.presenceUpdatesSubject.next(presenceEvent);
          break;

        case 'read':
          const readEvent = wsMessage.payload as ReadReceiptEvent;
          this.readReceiptsSubject.next(readEvent);
          break;

        case 'call':
        case 'call_incoming':
        case 'call_accepted':
        case 'call_rejected':
        case 'call_ended':
          this.callEventsSubject.next(wsMessage.payload);
          break;

        default:
          console.log('[WebSocketService] Unknown message type:', wsMessage.type);
      }
    } catch (error) {
      console.error('[WebSocketService] Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle native WebSocket error
   */
  private handleNativeWebSocketError(error: Event): void {
    console.error('[WebSocketService] WebSocket error:', error);
    this.updateConnectionStatus(false, 'WebSocket error');
  }

  /**
   * Handle native WebSocket close
   */
  private handleNativeWebSocketClose(): void {
    console.log('[WebSocketService] WebSocket closed');
    this.updateConnectionStatus(false);
    this.clearHeartbeatTimer();

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.error('[WebSocketService] Max reconnection attempts reached');
      this.updateConnectionStatus(false, 'Failed to reconnect');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Message Sending
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send message via WebSocket or STOMP
   */
  private sendWebSocketMessage(type: string, payload: any): void {
    if (!this.isConnected()) {
      console.warn('[WebSocketService] Not connected, message not sent:', type);
      return;
    }

    if (this.useStomp && this.stompClient) {
      this.sendStompMessage(type, payload);
    } else {
      this.sendNativeWebSocketMessage(type, payload);
    }
  }

  /**
   * Send message via STOMP
   */
  private sendStompMessage(type: string, payload: any): void {
    try {
      const destination = `/app/chat/${type}`;
      this.stompClient!.send(destination, {}, JSON.stringify(payload));
      console.log('[WebSocketService] STOMP message sent:', type);
    } catch (error) {
      console.error('[WebSocketService] Error sending STOMP message:', error);
    }
  }

  /**
   * Send message via native WebSocket
   */
  private sendNativeWebSocketMessage(type: string, payload: any): void {
    if (!this.sockJS || this.sockJS.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocketService] WebSocket not open');
      return;
    }

    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: type as any,
      payload,
      timestamp: new Date()
    };

    try {
      this.sockJS.send(JSON.stringify(message));
      console.log('[WebSocketService] WebSocket message sent:', type);
    } catch (error) {
      console.error('[WebSocketService] Error sending WebSocket message:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Reconnection Logic
  // ═══════════════════════════════════════════════════════════════

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocketService] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `[WebSocketService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.attemptConnection();
    }, delay);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Heartbeat (Keep-Alive)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start heartbeat to keep connection alive and send presence updates
   */
  private startHeartbeat(): void {
    this.clearHeartbeatTimer();

    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected()) {
        this.clearHeartbeatTimer();
        return;
      }

      // Send presence update every heartbeat to keep user marked as online
      this.sendPresenceUpdate('online', this.userId, '');

      // Send heartbeat
      const ping: WebSocketMessage = {
        id: this.generateMessageId(),
        type: 'connection',
        payload: { action: 'ping' },
        timestamp: new Date()
      };

      try {
        if (this.useStomp && this.stompClient) {
          this.stompClient.send('/app/ping', {}, JSON.stringify(ping));
        } else if (this.sockJS && this.sockJS.readyState === WebSocket.OPEN) {
          this.sockJS.send(JSON.stringify(ping));
        }
        console.log('[WebSocketService] Heartbeat and presence update sent');
      } catch (error) {
        console.error('[WebSocketService] Error sending heartbeat:', error);
      }
    }, 20000); // Send heartbeat + presence every 20 seconds to keep user online
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Utilities
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update connection status
   */
  private updateConnectionStatus(isConnected: boolean, error?: string): void {
    const status: ConnectionStatus = {
      isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastConnectedTime: isConnected ? new Date() : undefined,
      error
    };
    this.connectionStatusSubject.next(status);
    console.log('[WebSocketService] Connection status updated:', status);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
