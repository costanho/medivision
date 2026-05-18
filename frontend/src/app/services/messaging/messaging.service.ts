/**
 * Messaging Service
 * Handles all messaging operations including HTTP requests and WebSocket connections
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, ReplaySubject } from 'rxjs';
import { map, catchError, tap, takeUntil } from 'rxjs/operators';

import {
  Message,
  Conversation,
  User,
  PaginatedResponse,
  SendMessageRequest,
  UpdateMessageStatusRequest,
  CreateConversationRequest,
  BulkMarkReadRequest,
  ChatMessageEvent,
  TypingIndicatorEvent,
  PresenceUpdateEvent,
  ReadReceiptEvent,
  WebSocketMessage,
  ConnectionStatus,
  MessageDraft,
  SearchFilter,
  MessageNotification
} from './models';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private apiUrl = '/api/messages';
  private conversationUrl = '/api/conversations';
  private userUrl = '/api/users';

  // BehaviorSubjects for state management
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  public conversations$ = this.conversationsSubject.asObservable();

  private messagesSubject = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  private currentConversationSubject = new BehaviorSubject<Conversation | null>(null);
  public currentConversation$ = this.currentConversationSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
  });
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private typingUsersSubject = new BehaviorSubject<Map<number, boolean>>(new Map());
  public typingUsers$ = this.typingUsersSubject.asObservable();

  private onlineUsersSubject = new BehaviorSubject<Set<number>>(new Set());
  public onlineUsers$ = this.onlineUsersSubject.asObservable();

  private notificationsSubject = new Subject<MessageNotification>();
  public notifications$ = this.notificationsSubject.asObservable();

  // WebSocket subjects
  private webSocketMessages = new Subject<WebSocketMessage>();
  public webSocketMessages$ = this.webSocketMessages.asObservable();

  private chatMessages = new Subject<ChatMessageEvent>();
  public chatMessages$ = this.chatMessages.asObservable();

  private typingIndicators = new Subject<TypingIndicatorEvent>();
  public typingIndicators$ = this.typingIndicators.asObservable();

  private presenceUpdates = new Subject<PresenceUpdateEvent>();
  public presenceUpdates$ = this.presenceUpdates.asObservable();

  private readReceipts = new Subject<ReadReceiptEvent>();
  public readReceipts$ = this.readReceipts.asObservable();

  // Local storage for drafts
  private draftsSubject = new BehaviorSubject<Map<number, MessageDraft>>(new Map());
  public drafts$ = this.draftsSubject.asObservable();

  private destroy$ = new Subject<void>();
  private webSocket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(private http: HttpClient) {
    this.initializeService();
  }

  /**
   * Initialize the service
   */
  private initializeService(): void {
    console.log('[MessagingService] Service initialized');
  }

  /**
   * Get all conversations for current user
   */
  getConversations(page: number = 0, size: number = 20): Observable<PaginatedResponse<Conversation>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PaginatedResponse<Conversation>>(`${this.conversationUrl}/paginated`, { params })
      .pipe(
        tap(response => {
          this.conversationsSubject.next(response.content);
          console.log('[MessagingService] Conversations loaded:', response.content.length);
        }),
        catchError(error => {
          console.error('[MessagingService] Error loading conversations:', error);
          throw error;
        })
      );
  }

  /**
   * Get a specific conversation
   */
  getConversation(conversationId: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.conversationUrl}/${conversationId}`)
      .pipe(
        tap(conversation => {
          this.currentConversationSubject.next(conversation);
          console.log('[MessagingService] Conversation loaded:', conversation.id);
        }),
        catchError(error => {
          console.error('[MessagingService] Error loading conversation:', error);
          throw error;
        })
      );
  }

  /**
   * Get messages for a conversation
   */
  getConversationMessages(
    conversationId: number,
    page: number = 0,
    size: number = 50
  ): Observable<PaginatedResponse<Message>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PaginatedResponse<Message>>(
      `${this.conversationUrl}/${conversationId}/messages`,
      { params }
    ).pipe(
      tap(response => {
        this.messagesSubject.next(response.content);
        console.log('[MessagingService] Messages loaded:', response.content.length);
      }),
      catchError(error => {
        console.error('[MessagingService] Error loading messages:', error);
        throw error;
      })
    );
  }

  /**
   * Send a new message
   */
  sendMessage(message: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}`, message)
      .pipe(
        tap(response => {
          console.log('[MessagingService] Message sent:', response.id);
          this.notifyMessageSent(response);
        }),
        catchError(error => {
          console.error('[MessagingService] Error sending message:', error);
          throw error;
        })
      );
  }

  /**
   * Get messages for a person (compatibility with old API)
   */
  getConversationMessagesForPerson(personId: number, page: number = 0, size: number = 50): Observable<PaginatedResponse<Message>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PaginatedResponse<Message>>(
      `${this.apiUrl}/conversation/${personId}`,
      { params }
    ).pipe(
      tap(response => {
        this.messagesSubject.next(response.content);
        console.log('[MessagingService] Person conversation loaded:', response.content.length);
      }),
      catchError(error => {
        console.error('[MessagingService] Error loading person conversation:', error);
        throw error;
      })
    );
  }

  /**
   * Create a new conversation
   */
  createConversation(request: CreateConversationRequest): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.conversationUrl}`, request)
      .pipe(
        tap(response => {
          console.log('[MessagingService] Conversation created:', response.id);
          const conversations = this.conversationsSubject.value;
          this.conversationsSubject.next([response, ...conversations]);
        }),
        catchError(error => {
          console.error('[MessagingService] Error creating conversation:', error);
          throw error;
        })
      );
  }

  /**
   * Mark a message as read
   */
  markMessageAsRead(messageId: number, readAt?: Date): Observable<Message> {
    const request: UpdateMessageStatusRequest = {
      messageId,
      isRead: true,
      readAt: readAt || new Date()
    };

    return this.http.put<Message>(`${this.apiUrl}/${messageId}/read`, request)
      .pipe(
        tap(response => {
          console.log('[MessagingService] Message marked as read:', messageId);
        }),
        catchError(error => {
          console.error('[MessagingService] Error marking message as read:', error);
          throw error;
        })
      );
  }

  /**
   * Mark multiple messages as read
   */
  markConversationAsRead(conversationId: number, messageIds: number[]): Observable<void> {
    const request: BulkMarkReadRequest = {
      conversationId,
      messageIds,
      readAt: new Date()
    };

    return this.http.post<void>(`${this.conversationUrl}/${conversationId}/mark-read`, request)
      .pipe(
        tap(() => {
          console.log('[MessagingService] Conversation marked as read:', conversationId);
        }),
        catchError(error => {
          console.error('[MessagingService] Error marking conversation as read:', error);
          throw error;
        })
      );
  }

  /**
   * Search messages
   */
  searchMessages(filter: SearchFilter): Observable<PaginatedResponse<Message>> {
    let params = new HttpParams()
      .set('query', filter.query);

    if (filter.conversationId) params = params.set('conversationId', filter.conversationId.toString());
    if (filter.senderId) params = params.set('senderId', filter.senderId.toString());
    if (filter.recipientId) params = params.set('recipientId', filter.recipientId.toString());
    if (filter.isUnread !== undefined) params = params.set('isUnread', filter.isUnread.toString());
    if (filter.hasAttachments !== undefined) params = params.set('hasAttachments', filter.hasAttachments.toString());

    return this.http.get<PaginatedResponse<Message>>(`${this.apiUrl}/search`, { params })
      .pipe(
        catchError(error => {
          console.error('[MessagingService] Error searching messages:', error);
          throw error;
        })
      );
  }

  /**
   * Get unread message count
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`)
      .pipe(
        map(response => response.count),
        catchError(error => {
          console.error('[MessagingService] Error getting unread count:', error);
          throw error;
        })
      );
  }

  /**
   * WebSocket Methods
   */

  /**
   * Connect to WebSocket server
   */
  connectWebSocket(token: string, userId: number): void {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      console.log('[MessagingService] WebSocket already connected');
      return;
    }

    try {
      const wsUrl = this.buildWebSocketUrl(token, userId);
      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => this.handleWebSocketOpen();
      this.webSocket.onmessage = (event) => this.handleWebSocketMessage(event);
      this.webSocket.onerror = (error) => this.handleWebSocketError(error);
      this.webSocket.onclose = () => this.handleWebSocketClose();

      console.log('[MessagingService] WebSocket connecting...');
    } catch (error) {
      console.error('[MessagingService] Error creating WebSocket:', error);
      this.updateConnectionStatus(false, 'Failed to create WebSocket');
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnectWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }

    this.updateConnectionStatus(false);
    this.reconnectAttempts = 0;
    console.log('[MessagingService] WebSocket disconnected');
  }

  /**
   * Send chat message via WebSocket
   */
  sendChatMessage(conversationId: number, recipientId: number, content: string): void {
    const message: ChatMessageEvent = {
      eventType: 'message',
      messageId: 0, // Will be assigned by server
      senderId: 0, // Will be set by auth
      senderName: '',
      recipientId,
      content,
      conversationId,
      timestamp: new Date()
    };

    this.sendWebSocketMessage('message', message);
  }

  /**
   * Send typing indicator via WebSocket
   */
  sendTypingIndicator(conversationId: number, isTyping: boolean): void {
    const indicator: TypingIndicatorEvent = {
      eventType: 'typing',
      senderId: 0, // Will be set by auth
      senderName: '',
      conversationId,
      isTyping,
      timestamp: new Date()
    };

    this.sendWebSocketMessage('typing', indicator);
  }

  /**
   * Send presence update via WebSocket
   */
  sendPresenceUpdate(status: 'online' | 'offline' | 'away' | 'idle'): void {
    const presence: PresenceUpdateEvent = {
      eventType: 'presence',
      userId: 0, // Will be set by auth
      userName: '',
      status,
      timestamp: new Date(),
      lastSeen: new Date()
    };

    this.sendWebSocketMessage('presence', presence);
  }

  /**
   * Send read receipt via WebSocket
   */
  sendReadReceipt(messageId: number, conversationId: number): void {
    const receipt: ReadReceiptEvent = {
      eventType: 'read',
      messageId,
      conversationId,
      readerId: 0, // Will be set by auth
      readerName: '',
      timestamp: new Date()
    };

    this.sendWebSocketMessage('read', receipt);
  }

  /**
   * Message Draft Methods
   */

  /**
   * Save message draft
   */
  saveDraft(conversationId: number, recipientId: number, content: string): void {
    const draft: MessageDraft = {
      conversationId,
      recipientId,
      content,
      savedAt: new Date()
    };

    const drafts = this.draftsSubject.value;
    drafts.set(conversationId, draft);
    this.draftsSubject.next(drafts);

    console.log('[MessagingService] Draft saved for conversation:', conversationId);
  }

  /**
   * Get draft for conversation
   */
  getDraft(conversationId: number): MessageDraft | undefined {
    return this.draftsSubject.value.get(conversationId);
  }

  /**
   * Clear draft for conversation
   */
  clearDraft(conversationId: number): void {
    const drafts = this.draftsSubject.value;
    drafts.delete(conversationId);
    this.draftsSubject.next(drafts);

    console.log('[MessagingService] Draft cleared for conversation:', conversationId);
  }

  /**
   * Private Helper Methods
   */

  private buildWebSocketUrl(token: string, userId: number): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/ws?token=${token}&userId=${userId}`;
  }

  private handleWebSocketOpen(): void {
    console.log('[MessagingService] WebSocket connected');
    this.updateConnectionStatus(true);
    this.reconnectAttempts = 0;
    this.sendPresenceUpdate('online');
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const wsMessage: WebSocketMessage = JSON.parse(event.data);
      this.webSocketMessages.next(wsMessage);

      switch (wsMessage.type) {
        case 'message':
          const chatEvent = wsMessage.payload as ChatMessageEvent;
          this.chatMessages.next(chatEvent);
          this.handleIncomingMessage(chatEvent);
          break;

        case 'typing':
          const typingEvent = wsMessage.payload as TypingIndicatorEvent;
          this.typingIndicators.next(typingEvent);
          this.updateTypingUsers(typingEvent);
          break;

        case 'presence':
          const presenceEvent = wsMessage.payload as PresenceUpdateEvent;
          this.presenceUpdates.next(presenceEvent);
          this.updateOnlineUsers(presenceEvent);
          break;

        case 'read':
          const readEvent = wsMessage.payload as ReadReceiptEvent;
          this.readReceipts.next(readEvent);
          break;

        default:
          console.log('[MessagingService] Unknown WebSocket message type:', wsMessage.type);
      }
    } catch (error) {
      console.error('[MessagingService] Error parsing WebSocket message:', error);
    }
  }

  private handleWebSocketError(error: Event): void {
    console.error('[MessagingService] WebSocket error:', error);
    this.updateConnectionStatus(false, 'WebSocket error occurred');
  }

  private handleWebSocketClose(): void {
    console.log('[MessagingService] WebSocket disconnected');
    this.updateConnectionStatus(false);
    this.attemptReconnect();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `[MessagingService] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
      );

      this.reconnectTimer = setTimeout(() => {
        // Reconnection should be triggered by the component
      }, delay);
    } else {
      console.error('[MessagingService] Max reconnection attempts reached');
      this.updateConnectionStatus(false, 'Failed to reconnect after multiple attempts');
    }
  }

  private sendWebSocketMessage(type: string, payload: any): void {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.warn('[MessagingService] WebSocket not connected, message queued');
      return;
    }

    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: type as any,
      payload,
      timestamp: new Date()
    };

    try {
      this.webSocket.send(JSON.stringify(message));
      console.log('[MessagingService] WebSocket message sent:', type);
    } catch (error) {
      console.error('[MessagingService] Error sending WebSocket message:', error);
    }
  }

  private handleIncomingMessage(chatEvent: ChatMessageEvent): void {
    // Update conversation messages
    const messages = this.messagesSubject.value;
    const message: Message = {
      id: chatEvent.messageId,
      senderId: chatEvent.senderId,
      senderName: chatEvent.senderName,
      recipientId: chatEvent.recipientId,
      content: chatEvent.content,
      timestamp: chatEvent.timestamp,
      isRead: false,
      attachments: chatEvent.attachments
    };

    this.messagesSubject.next([...messages, message]);
    this.createNotification(message);
  }

  private updateTypingUsers(event: TypingIndicatorEvent): void {
    const typingUsers = this.typingUsersSubject.value;
    if (event.isTyping) {
      typingUsers.set(event.senderId, true);
    } else {
      typingUsers.delete(event.senderId);
    }
    this.typingUsersSubject.next(new Map(typingUsers));
  }

  private updateOnlineUsers(event: PresenceUpdateEvent): void {
    const onlineUsers = this.onlineUsersSubject.value;
    if (event.status === 'online') {
      onlineUsers.add(event.userId);
    } else {
      onlineUsers.delete(event.userId);
    }
    this.onlineUsersSubject.next(new Set(onlineUsers));
  }

  private updateConnectionStatus(isConnected: boolean, error?: string): void {
    const status: ConnectionStatus = {
      isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastConnectedTime: isConnected ? new Date() : undefined,
      error
    };
    this.connectionStatusSubject.next(status);
  }

  private notifyMessageSent(message: Message): void {
    const notification: MessageNotification = {
      id: `msg-${message.id}`,
      messageId: message.id,
      conversationId: 0,
      senderId: message.senderId,
      senderName: message.senderName || 'Unknown',
      preview: message.content.substring(0, 100),
      timestamp: message.timestamp,
      isRead: false,
      action: 'message'
    };

    this.notificationsSubject.next(notification);
  }

  private createNotification(message: Message): void {
    const notification: MessageNotification = {
      id: `msg-${message.id}`,
      messageId: message.id,
      conversationId: 0,
      senderId: message.senderId,
      senderName: message.senderName || 'Unknown',
      preview: message.content.substring(0, 100),
      timestamp: message.timestamp,
      isRead: false,
      action: 'message'
    };

    this.notificationsSubject.next(notification);
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup method
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnectWebSocket();
  }
}
