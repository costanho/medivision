/**
 * Conversation Service
 * Handles all conversation-related operations including:
 * - Fetching conversations from backend
 * - Managing conversation state
 * - Handling real-time updates
 * - Refresh logic
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { tap, catchError, takeUntil } from 'rxjs/operators';

import { Conversation, PaginatedResponse } from './models';

/**
 * Conversation state interface
 */
export interface ConversationState {
  conversations: Conversation[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchTime: Date | null;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Conversation Service
 * Singleton service for managing conversation data
 */
@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  // ═══════════════════════════════════════════════════════════════
  // API Configuration
  // ═══════════════════════════════════════════════════════════════

  private conversationUrl = '/api/conversations';

  // ═══════════════════════════════════════════════════════════════
  // State Management
  // ═══════════════════════════════════════════════════════════════

  private initialState: ConversationState = {
    conversations: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastFetchTime: null,
    currentPage: 0,
    pageSize: 50,
    totalPages: 0,
    hasMore: false
  };

  private conversationState = new BehaviorSubject<ConversationState>(this.initialState);
  public conversationState$ = this.conversationState.asObservable();

  // Individual observable streams for convenience
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  public conversations$ = this.conversationsSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  private isRefreshingSubject = new BehaviorSubject<boolean>(false);
  public isRefreshing$ = this.isRefreshingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  // ═══════════════════════════════════════════════════════════════
  // Real-time Updates
  // ═══════════════════════════════════════════════════════════════

  private conversationUpdated = new Subject<Conversation>();
  public conversationUpdated$ = this.conversationUpdated.asObservable();

  private conversationAdded = new Subject<Conversation>();
  public conversationAdded$ = this.conversationAdded.asObservable();

  private conversationRemoved = new Subject<number>();
  public conversationRemoved$ = this.conversationRemoved.asObservable();

  // ═══════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Cache Configuration
  // ═══════════════════════════════════════════════════════════════

  private cacheDurationMs = 5 * 60 * 1000; // 5 minutes
  private lastRefreshTime: Date | null = null;

  constructor(private http: HttpClient) {
    console.log('[ConversationService] Service initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  // Fetch Conversations
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch all conversations from backend
   * Handles pagination and state management
   */
  fetchConversations(page: number = 0, pageSize: number = 50): Observable<PaginatedResponse<Conversation>> {
    console.log(`[ConversationService] Fetching conversations - page: ${page}, size: ${pageSize}`);

    // Set loading state
    this.updateState({ isLoading: true, error: null });
    this.isLoadingSubject.next(true);

    // Build query parameters
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', pageSize.toString());

    return this.http.get<PaginatedResponse<Conversation>>(`${this.conversationUrl}/paginated`, { params })
      .pipe(
        tap((response: any) => {
          console.log(`[ConversationService] Conversations loaded: ${response.content.length} conversations`);

          // Update state
          this.updateState({
            conversations: response.content,
            isLoading: false,
            error: null,
            lastFetchTime: new Date(),
            currentPage: response.currentPage || page,
            totalPages: response.totalPages || 0,
            hasMore: response.hasNext || false
          });

          // Update individual subjects
          this.conversationsSubject.next(response.content);
          this.isLoadingSubject.next(false);
          this.errorSubject.next(null);
          this.lastRefreshTime = new Date();
        }),
        catchError((error: any) => {
          console.error('[ConversationService] Error fetching conversations:', error);

          const errorMessage = error?.error?.message || 'Failed to load conversations';

          // Update error state
          this.updateState({
            isLoading: false,
            error: errorMessage
          });

          // Update individual subjects
          this.isLoadingSubject.next(false);
          this.errorSubject.next(errorMessage);

          throw error;
        })
      );
  }

  /**
   * Refresh conversations
   * Resets pagination and refetches from page 0
   */
  refreshConversations(): Observable<PaginatedResponse<Conversation>> {
    console.log('[ConversationService] Refreshing conversations');

    // Set refreshing state
    this.updateState({ isRefreshing: true, error: null });
    this.isRefreshingSubject.next(true);

    return this.fetchConversations(0, 50)
      .pipe(
        tap(() => {
          console.log('[ConversationService] Conversations refreshed');
          this.updateState({ isRefreshing: false });
          this.isRefreshingSubject.next(false);
        }),
        catchError((error: any) => {
          console.error('[ConversationService] Error refreshing conversations:', error);
          this.updateState({ isRefreshing: false });
          this.isRefreshingSubject.next(false);
          throw error;
        })
      );
  }

  /**
   * Load next page of conversations
   */
  loadNextPage(): Observable<PaginatedResponse<Conversation>> {
    const currentState = this.conversationState.value;
    const nextPage = currentState.currentPage + 1;

    console.log(`[ConversationService] Loading next page: ${nextPage}`);

    return this.fetchConversations(nextPage, currentState.pageSize)
      .pipe(
        tap((response: any) => {
          // Append to existing conversations
          const updatedConversations = [
            ...currentState.conversations,
            ...response.content
          ];

          this.updateState({
            conversations: updatedConversations,
            currentPage: nextPage
          });

          this.conversationsSubject.next(updatedConversations);
        }),
        catchError((error: any) => {
          console.error('[ConversationService] Error loading next page:', error);
          throw error;
        })
      );
  }

  // ═══════════════════════════════════════════════════════════════
  // Real-Time Updates
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle new message received (from WebSocket)
   * Updates conversation's last message and re-sorts
   */
  handleNewMessage(conversation: Conversation): void {
    console.log('[ConversationService] Handling new message for conversation:', conversation.id);

    const currentState = this.conversationState.value;
    const conversationIndex = currentState.conversations.findIndex(c => c.id === conversation.id);

    let updatedConversations: Conversation[];

    if (conversationIndex >= 0) {
      // Update existing conversation
      updatedConversations = [...currentState.conversations];
      updatedConversations[conversationIndex] = conversation;
    } else {
      // Add new conversation to the top
      updatedConversations = [conversation, ...currentState.conversations];
      this.conversationAdded.next(conversation);
    }

    // Sort by most recent
    updatedConversations.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime).getTime();
      const timeB = new Date(b.lastMessageTime).getTime();
      return timeB - timeA; // Most recent first
    });

    // Update state
    this.updateState({ conversations: updatedConversations });
    this.conversationsSubject.next(updatedConversations);
    this.conversationUpdated.next(conversation);
  }

  /**
   * Handle conversation deleted
   */
  handleConversationDeleted(conversationId: number): void {
    console.log('[ConversationService] Handling conversation deleted:', conversationId);

    const currentState = this.conversationState.value;
    const updatedConversations = currentState.conversations.filter(c => c.id !== conversationId);

    this.updateState({ conversations: updatedConversations });
    this.conversationsSubject.next(updatedConversations);
    this.conversationRemoved.next(conversationId);
  }

  /**
   * Update conversation locally (without API call)
   */
  updateConversationLocally(conversation: Conversation): void {
    console.log('[ConversationService] Updating conversation locally:', conversation.id);

    const currentState = this.conversationState.value;
    const updatedConversations = currentState.conversations.map(c =>
      c.id === conversation.id ? conversation : c
    );

    this.updateState({ conversations: updatedConversations });
    this.conversationsSubject.next(updatedConversations);
    this.conversationUpdated.next(conversation);
  }

  // ═══════════════════════════════════════════════════════════════
  // State Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update conversation state
   */
  private updateState(partialState: Partial<ConversationState>): void {
    const currentState = this.conversationState.value;
    const newState = { ...currentState, ...partialState };
    this.conversationState.next(newState);
  }

  /**
   * Get current state
   */
  getState(): ConversationState {
    return this.conversationState.value;
  }

  /**
   * Get current conversations
   */
  getConversations(): Conversation[] {
    return this.conversationState.value.conversations;
  }

  /**
   * Get conversation by ID
   */
  getConversationById(conversationId: number): Conversation | undefined {
    return this.conversationState.value.conversations.find(c => c.id === conversationId);
  }

  /**
   * Check if conversations are loading
   */
  isLoading(): boolean {
    return this.conversationState.value.isLoading;
  }

  /**
   * Check if conversations are refreshing
   */
  isRefreshing(): boolean {
    return this.conversationState.value.isRefreshing;
  }

  /**
   * Get current error message
   */
  getError(): string | null {
    return this.conversationState.value.error;
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.updateState({ error: null });
    this.errorSubject.next(null);
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(): boolean {
    if (!this.lastRefreshTime) {
      return false;
    }

    const elapsed = Date.now() - this.lastRefreshTime.getTime();
    return elapsed < this.cacheDurationMs;
  }

  /**
   * Set cache duration (in milliseconds)
   */
  setCacheDuration(durationMs: number): void {
    this.cacheDurationMs = durationMs;
    console.log(`[ConversationService] Cache duration set to ${durationMs}ms`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Search & Filter
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search conversations locally
   */
  searchConversations(query: string): Conversation[] {
    const currentConversations = this.conversationState.value.conversations;

    if (!query.trim()) {
      return currentConversations;
    }

    const lowerQuery = query.toLowerCase().trim();

    return currentConversations.filter(conv => {
      const patientName = conv.patientName?.toLowerCase() || '';
      const doctorName = conv.doctorName?.toLowerCase() || '';
      const lastMessage = conv.lastMessage?.content?.toLowerCase() || '';

      return (
        patientName.includes(lowerQuery) ||
        doctorName.includes(lowerQuery) ||
        lastMessage.includes(lowerQuery)
      );
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Clean up service (called on app destroy)
   */
  destroy(): void {
    console.log('[ConversationService] Destroying service');
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Reset service state
   */
  resetState(): void {
    console.log('[ConversationService] Resetting state');
    this.conversationState.next(this.initialState);
    this.conversationsSubject.next([]);
    this.isLoadingSubject.next(false);
    this.isRefreshingSubject.next(false);
    this.errorSubject.next(null);
    this.lastRefreshTime = null;
  }
}
