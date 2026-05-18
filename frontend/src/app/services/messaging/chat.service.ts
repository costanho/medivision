/**
 * Chat Service
 * Manages messages for a specific conversation
 *
 * Features:
 * - Fetch messages for conversation
 * - Send messages
 * - Mark messages as read
 * - Real-time message updates
 * - Message caching
 * - Typing indicators
 * - Message drafts
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { catchError, tap, takeUntil, map } from 'rxjs/operators';
import { of } from 'rxjs';

import {
  Message,
  SendMessageRequest,
  UpdateMessageStatusRequest,
  PaginatedResponse,
  MessageDraft
} from './models';
import { MessagingService } from './messaging.service';
import { AuthIntegrationService } from './auth-integration.service';

/**
 * Chat State Interface
 */
export interface ChatState {
  conversationId: number | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

/**
 * Message Input Interface
 */
export interface MessageInput {
  conversationId: number;
  recipientId: number;
  recipientEmail: string;
  recipientName: string;
  content: string;
  attachments?: any[];
}

/**
 * Chat Service
 * Manages messages for a specific conversation
 */
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // ═══════════════════════════════════════════════════════════════
  // API URLs
  // ═══════════════════════════════════════════════════════════════

  private messagesUrl = '/api/messages';
  private conversationMessagesUrl = '/api/conversations';

  // ═══════════════════════════════════════════════════════════════
  // State Management
  // ═══════════════════════════════════════════════════════════════

  private chatState = new BehaviorSubject<ChatState>({
    conversationId: null,
    messages: [],
    isLoading: false,
    isSending: false,
    error: null,
    hasMore: false,
    currentPage: 0,
    totalPages: 0
  });
  public chatState$ = this.chatState.asObservable();

  private messages = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messages.asObservable();

  private isLoading = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoading.asObservable();

  private isSending = new BehaviorSubject<boolean>(false);
  public isSending$ = this.isSending.asObservable();

  private error = new BehaviorSubject<string | null>(null);
  public error$ = this.error.asObservable();

  private messageReceived = new Subject<Message>();
  public messageReceived$ = this.messageReceived.asObservable();

  private messageSent = new Subject<Message>();
  public messageSent$ = this.messageSent.asObservable();

  private typingStatusChanged = new Subject<{ userId: number; isTyping: boolean }>();
  public typingStatusChanged$ = this.typingStatusChanged.asObservable();

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Pagination
  // ═══════════════════════════════════════════════════════════════

  private pageSize = 50;

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private http: HttpClient,
    private messagingService: MessagingService,
    private authIntegration: AuthIntegrationService
  ) {
    console.log('[ChatService] Service initialized');
    this.setupRealTimeUpdates();
  }

  // ═══════════════════════════════════════════════════════════════
  // Initialize Chat
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize chat for a conversation
   */
  initializeChat(conversationId: number): void {
    console.log('[ChatService] Initializing chat for conversation:', conversationId);

    const currentState = this.chatState.getValue();
    this.chatState.next({
      ...currentState,
      conversationId,
      messages: [],
      currentPage: 0,
      error: null
    });

    // Load initial messages
    this.loadMessages(conversationId, 0);
  }

  // ═══════════════════════════════════════════════════════════════
  // Load Messages
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load messages for conversation
   */
  loadMessages(conversationId: number, page: number = 0): Observable<PaginatedResponse<Message>> {
    console.log('[ChatService] Loading messages for conversation:', conversationId, 'page:', page);

    this.isLoading.next(true);
    this.error.next(null);

    return this.http.get<PaginatedResponse<Message>>(
      `${this.conversationMessagesUrl}/${conversationId}/messages/paginated`,
      {
        params: new HttpParams()
          .set('page', String(page))
          .set('size', String(this.pageSize))
          .set('sort', 'timestamp,asc')
      }
    ).pipe(
      tap((response: any) => {
        console.log('[ChatService] Messages loaded:', response);

        // If page 0, replace messages. Otherwise append
        let allMessages = response.content || [];
        if (page > 0) {
          allMessages = [...this.messages.getValue(), ...allMessages];
        }

        // Sort by timestamp (ascending - oldest first)
        allMessages.sort((a: Message, b: Message) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });

        this.messages.next(allMessages);

        const newState = this.chatState.getValue();
        this.chatState.next({
          ...newState,
          messages: allMessages,
          isLoading: false,
          hasMore: response.hasNext || false,
          currentPage: page,
          totalPages: response.totalPages || 0
        });
      }),
      catchError(error => {
        console.error('[ChatService] Error loading messages:', error);
        const errorMessage = error?.error?.message || 'Failed to load messages';
        this.error.next(errorMessage);
        this.isLoading.next(false);
        return of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          currentPage: page,
          pageSize: this.pageSize,
          hasNext: false,
          hasPrevious: false
        });
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Load more messages (pagination)
   */
  loadMoreMessages(conversationId: number): Observable<PaginatedResponse<Message>> {
    const state = this.chatState.getValue();
    const nextPage = state.currentPage + 1;

    if (!state.hasMore) {
      return of({
        content: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: nextPage,
        pageSize: this.pageSize,
        hasNext: false,
        hasPrevious: false
      });
    }

    return this.loadMessages(conversationId, nextPage);
  }

  /**
   * Refresh messages
   */
  refreshMessages(conversationId: number): Observable<PaginatedResponse<Message>> {
    console.log('[ChatService] Refreshing messages');
    return this.loadMessages(conversationId, 0);
  }

  // ═══════════════════════════════════════════════════════════════
  // Send Message
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send message
   */
  sendMessage(input: MessageInput): Observable<Message> {
    console.log('[ChatService] Sending message:', input);

    this.isSending.next(true);
    this.error.next(null);

    const currentUser = this.authIntegration.getAuthenticatedUser();
    if (!currentUser) {
      console.error('[ChatService] User not authenticated');
      this.isSending.next(false);
      this.error.next('User not authenticated');
      return of({} as Message);
    }

    const request: SendMessageRequest = {
      recipientId: input.recipientId,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      senderEmail: currentUser.email,
      senderName: currentUser.name || currentUser.fullName,
      content: input.content,
      attachments: input.attachments
    };

    return this.http.post<Message>(`${this.messagesUrl}`, request).pipe(
      tap((message: any) => {
        console.log('[ChatService] Message sent:', message);

        // Add message to local state
        const currentMessages = this.messages.getValue();
        const updatedMessages = [...currentMessages, message].sort((a: Message, b: Message) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });

        this.messages.next(updatedMessages);

        const state = this.chatState.getValue();
        this.chatState.next({
          ...state,
          messages: updatedMessages,
          isSending: false
        });

        this.messageSent.next(message);
        this.isSending.next(false);
      }),
      catchError(error => {
        console.error('[ChatService] Error sending message:', error);
        const errorMessage = error?.error?.message || 'Failed to send message';
        this.error.next(errorMessage);
        this.isSending.next(false);
        return of({} as Message);
      }),
      takeUntil(this.destroy$)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Mark as Read
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId: number): Observable<void> {
    console.log('[ChatService] Marking message as read:', messageId);

    const request: UpdateMessageStatusRequest = {
      messageId,
      isRead: true,
      readAt: new Date()
    };

    return this.http.put<void>(`${this.messagesUrl}/${messageId}/status`, request).pipe(
      tap(() => {
        console.log('[ChatService] Message marked as read');

        // Update local state
        const currentMessages = this.messages.getValue();
        const updatedMessages = currentMessages.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, isRead: true, readAt: new Date() };
          }
          return msg;
        });

        this.messages.next(updatedMessages);

        const state = this.chatState.getValue();
        this.chatState.next({
          ...state,
          messages: updatedMessages
        });
      }),
      catchError(error => {
        console.error('[ChatService] Error marking message as read:', error);
        return of(void 0);
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Mark all messages as read
   */
  markAllAsRead(conversationId: number): Observable<void> {
    console.log('[ChatService] Marking all messages as read for conversation:', conversationId);

    const unreadMessages = this.messages.getValue().filter(m => !m.isRead);
    console.log('[ChatService] Unread messages count:', unreadMessages.length);

    if (unreadMessages.length === 0) {
      return of(void 0);
    }

    const messageIds = unreadMessages.map(m => m.id);

    return this.http.put<void>(`${this.conversationMessagesUrl}/${conversationId}/mark-read`, {
      messageIds,
      readAt: new Date()
    }).pipe(
      tap(() => {
        console.log('[ChatService] All messages marked as read');

        // Update local state
        const currentMessages = this.messages.getValue();
        const updatedMessages = currentMessages.map(msg => ({
          ...msg,
          isRead: true,
          readAt: new Date()
        }));

        this.messages.next(updatedMessages);

        const state = this.chatState.getValue();
        this.chatState.next({
          ...state,
          messages: updatedMessages
        });
      }),
      catchError(error => {
        console.error('[ChatService] Error marking all as read:', error);
        return of(void 0);
      }),
      takeUntil(this.destroy$)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Real-Time Updates
  // ═══════════════════════════════════════════════════════════════

  /**
   * Setup real-time updates
   */
  private setupRealTimeUpdates(): void {
    console.log('[ChatService] Setting up real-time updates');

    // Listen for new messages from MessagingService
    this.messagingService.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        console.log('[ChatService] New message event received:', event);
        this.handleNewMessage(event);
      });

    // Listen for typing indicators
    this.messagingService.typingIndicators$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        console.log('[ChatService] Typing indicator received:', event);
        this.typingStatusChanged.next({
          userId: event.senderId,
          isTyping: event.isTyping
        });
      });

    // Listen for read receipts
    this.messagingService.readReceipts$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        console.log('[ChatService] Read receipt received:', event);
        this.handleReadReceipt(event);
      });
  }

  /**
   * Handle new message from WebSocket
   */
  private handleNewMessage(event: any): void {
    const state = this.chatState.getValue();

    // Only add if it's for the current conversation
    if (event.conversationId !== state.conversationId) {
      console.log('[ChatService] Message is for different conversation, ignoring');
      return;
    }

    const newMessage: Message = {
      id: event.messageId,
      senderId: event.senderId,
      senderName: event.senderName,
      senderEmail: event.senderEmail,
      recipientId: 0,
      content: event.content,
      timestamp: new Date(event.timestamp),
      isRead: false,
      attachments: event.attachments
    };

    // Add message to local state
    const currentMessages = this.messages.getValue();
    const updatedMessages = [...currentMessages, newMessage].sort((a: Message, b: Message) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    this.messages.next(updatedMessages);

    this.chatState.next({
      ...state,
      messages: updatedMessages
    });

    this.messageReceived.next(newMessage);
  }

  /**
   * Handle read receipt
   */
  private handleReadReceipt(event: any): void {
    const state = this.chatState.getValue();

    // Only update if it's for the current conversation
    if (event.conversationId !== state.conversationId) {
      return;
    }

    const currentMessages = this.messages.getValue();
    const updatedMessages = currentMessages.map(msg => {
      if (msg.id === event.messageId) {
        return { ...msg, isRead: true, readAt: new Date(event.timestamp) };
      }
      return msg;
    });

    this.messages.next(updatedMessages);

    this.chatState.next({
      ...state,
      messages: updatedMessages
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Send Typing Indicator
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId: number, isTyping: boolean): void {
    console.log('[ChatService] Sending typing indicator:', isTyping);
    this.messagingService.sendTypingIndicator(conversationId, isTyping);
  }

  // ═══════════════════════════════════════════════════════════════
  // State Getters
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current chat state
   */
  getState(): ChatState {
    return this.chatState.getValue();
  }

  /**
   * Get current messages
   */
  getMessages(): Message[] {
    return this.messages.getValue();
  }

  /**
   * Get is loading state
   */
  getIsLoading(): boolean {
    return this.isLoading.getValue();
  }

  /**
   * Get is sending state
   */
  getIsSending(): boolean {
    return this.isSending.getValue();
  }

  /**
   * Get error
   */
  getError(): string | null {
    return this.error.getValue();
  }

  // ═══════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Clear chat state
   */
  clearChat(): void {
    console.log('[ChatService] Clearing chat');
    this.messages.next([]);
    this.error.next(null);

    this.chatState.next({
      conversationId: null,
      messages: [],
      isLoading: false,
      isSending: false,
      error: null,
      hasMore: false,
      currentPage: 0,
      totalPages: 0
    });
  }

  /**
   * Check if message is from current user
   */
  isMessageFromCurrentUser(senderId: number): boolean {
    const currentUser = this.authIntegration.getAuthenticatedUser();
    return currentUser ? currentUser.id === senderId : false;
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Destroy service
   */
  destroy(): void {
    console.log('[ChatService] Destroying service');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
