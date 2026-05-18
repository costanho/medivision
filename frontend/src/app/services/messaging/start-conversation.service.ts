/**
 * Start Conversation Service
 * Handles searching for users and creating new conversations
 *
 * Features:
 * - Search for doctors or patients
 * - Get available doctors/patients list
 * - Create new conversation
 * - Check if conversation exists
 * - Navigate to new conversation
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { catchError, tap, takeUntil, map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { User, Conversation, PaginatedResponse, CreateConversationRequest } from './models';
import { MessagingService } from './messaging.service';
import { AuthIntegrationService } from './auth-integration.service';

/**
 * Search Result Interface
 */
export interface SearchResult {
  users: User[];
  totalCount: number;
  hasMore: boolean;
  query: string;
}

/**
 * Conversation Creation Result Interface
 */
export interface ConversationCreationResult {
  success: boolean;
  conversation: Conversation | null;
  error?: string;
  isExisting?: boolean; // true if conversation already existed
}

/**
 * Start Conversation Service
 * Manages user search and conversation creation
 */
@Injectable({
  providedIn: 'root'
})
export class StartConversationService {
  // ═══════════════════════════════════════════════════════════════
  // API URLs
  // ═══════════════════════════════════════════════════════════════

  private userSearchUrl = '/api/users/search';
  private doctorListUrl = '/api/doctors/directory/paginated';
  private conversationCreateUrl = '/api/conversations';
  private conversationCheckUrl = '/api/conversations/check';

  // ═══════════════════════════════════════════════════════════════
  // State Management
  // ═══════════════════════════════════════════════════════════════

  private searchResults = new BehaviorSubject<SearchResult>({
    users: [],
    totalCount: 0,
    hasMore: false,
    query: ''
  });
  public searchResults$ = this.searchResults.asObservable();

  private isSearching = new BehaviorSubject<boolean>(false);
  public isSearching$ = this.isSearching.asObservable();

  private searchError = new BehaviorSubject<string | null>(null);
  public searchError$ = this.searchError.asObservable();

  private isCreatingConversation = new BehaviorSubject<boolean>(false);
  public isCreatingConversation$ = this.isCreatingConversation.asObservable();

  private conversationCreated = new Subject<Conversation>();
  public conversationCreated$ = this.conversationCreated.asObservable();

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Pagination
  // ═══════════════════════════════════════════════════════════════

  private currentPage = 0;
  private pageSize = 20;
  private totalPages = 0;

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private http: HttpClient,
    private messaging: MessagingService,
    private authIntegration: AuthIntegrationService
  ) {
    console.log('[StartConversation] Service initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  // Search Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search for users by query
   * Searches across doctors and patients
   */
  searchUsers(query: string): Observable<SearchResult> {
    console.log('[StartConversation] Searching for users:', query);

    if (!query || query.trim().length === 0) {
      this.searchResults.next({
        users: [],
        totalCount: 0,
        hasMore: false,
        query: ''
      });
      return of({
        users: [],
        totalCount: 0,
        hasMore: false,
        query: ''
      });
    }

    this.isSearching.next(true);
    this.searchError.next(null);

    return this.http.get<SearchResult>(this.userSearchUrl, {
      params: new HttpParams()
        .set('query', query)
        .set('page', '0')
        .set('size', String(this.pageSize))
    }).pipe(
      tap((result: any) => {
        console.log('[StartConversation] Search results:', result);
        const searchResult: SearchResult = {
          users: result.content || result.users || [],
          totalCount: result.totalElements || result.total || 0,
          hasMore: result.hasNext || false,
          query: query
        };
        this.searchResults.next(searchResult);
        this.isSearching.next(false);
      }),
      catchError(error => {
        console.error('[StartConversation] Search error:', error);
        const errorMessage = error?.error?.message || 'Failed to search users';
        this.searchError.next(errorMessage);
        this.isSearching.next(false);
        return of({
          users: [],
          totalCount: 0,
          hasMore: false,
          query: query
        });
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Get available doctors list
   */
  getAvailableDoctors(page: number = 0, pageSize: number = 20): Observable<PaginatedResponse<User>> {
    console.log('[StartConversation] Getting available doctors, page:', page);

    this.isSearching.next(true);
    this.searchError.next(null);

    return this.http.get<PaginatedResponse<User>>(this.doctorListUrl, {
      params: new HttpParams()
        .set('page', String(page))
        .set('size', String(pageSize))
        .set('sortBy', 'name')
        .set('direction', 'ASC')
    }).pipe(
      tap((response: any) => {
        console.log('[StartConversation] Doctors loaded:', response);
        const searchResult: SearchResult = {
          users: response.content || [],
          totalCount: response.totalElements || 0,
          hasMore: response.hasNext || false,
          query: ''
        };
        this.searchResults.next(searchResult);
        this.isSearching.next(false);
      }),
      catchError(error => {
        console.error('[StartConversation] Error loading doctors:', error);
        this.searchError.next('Failed to load doctors');
        this.isSearching.next(false);
        return of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          currentPage: page,
          pageSize: pageSize,
          hasNext: false,
          hasPrevious: false
        });
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Clear search results
   */
  clearSearch(): void {
    console.log('[StartConversation] Clearing search');
    this.searchResults.next({
      users: [],
      totalCount: 0,
      hasMore: false,
      query: ''
    });
    this.searchError.next(null);
  }

  // ═══════════════════════════════════════════════════════════════
  // Conversation Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if conversation exists with a user
   */
  checkConversationExists(otherUserId: number): Observable<Conversation | null> {
    console.log('[StartConversation] Checking if conversation exists with user:', otherUserId);

    return this.http.get<Conversation | null>(`${this.conversationCheckUrl}/${otherUserId}`).pipe(
      tap((conversation: any) => {
        console.log('[StartConversation] Conversation exists:', conversation);
      }),
      catchError(error => {
        console.log('[StartConversation] Conversation does not exist:', error);
        return of(null);
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Create new conversation with a user
   * Returns existing conversation if already exists
   */
  createConversation(otherUser: User): Observable<ConversationCreationResult> {
    console.log('[StartConversation] Creating conversation with user:', otherUser);

    const currentUser = this.authIntegration.getAuthenticatedUser();
    if (!currentUser) {
      console.error('[StartConversation] Current user not authenticated');
      return of({
        success: false,
        conversation: null,
        error: 'User not authenticated'
      });
    }

    this.isCreatingConversation.next(true);

    // Check if conversation already exists
    return this.checkConversationExists(otherUser.id).pipe(
      switchMap((existingConversation: any) => {
        if (existingConversation) {
          console.log('[StartConversation] Conversation already exists, returning existing');
          this.isCreatingConversation.next(false);
          return of({
            success: true,
            conversation: existingConversation,
            isExisting: true
          });
        }

        // Create new conversation
        const request = this.buildCreateConversationRequest(currentUser, otherUser);
        console.log('[StartConversation] Creating new conversation with request:', request);

        return this.http.post<Conversation>(this.conversationCreateUrl, request).pipe(
          tap((conversation: any) => {
            console.log('[StartConversation] Conversation created successfully:', conversation);
            this.conversationCreated.next(conversation);
            this.isCreatingConversation.next(false);
          }),
          map((conversation: any) => ({
            success: true,
            conversation: conversation,
            isExisting: false
          })),
          catchError(error => {
            console.error('[StartConversation] Error creating conversation:', error);
            this.isCreatingConversation.next(false);
            return of({
              success: false,
              conversation: null,
              error: error?.error?.message || 'Failed to create conversation',
              isExisting: false
            });
          })
        );
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Build create conversation request based on user roles
   */
  private buildCreateConversationRequest(
    currentUser: any,
    otherUser: User
  ): CreateConversationRequest {
    // If current user is patient and other is doctor
    if (currentUser.role === 'patient' && otherUser.role === 'doctor') {
      return {
        patientId: currentUser.id,
        patientEmail: currentUser.email,
        patientName: currentUser.name || currentUser.fullName,
        doctorId: otherUser.id,
        doctorEmail: otherUser.email,
        doctorName: otherUser.name
      };
    }

    // If current user is doctor and other is patient
    if (currentUser.role === 'doctor' && otherUser.role === 'patient') {
      return {
        patientId: otherUser.id,
        patientEmail: otherUser.email,
        patientName: otherUser.name,
        doctorId: currentUser.id,
        doctorEmail: currentUser.email,
        doctorName: currentUser.name || currentUser.fullName
      };
    }

    // If both are doctors or both are patients (use IDs to determine order)
    const isCurrentFirst = currentUser.id < otherUser.id;
    return {
      patientId: isCurrentFirst ? currentUser.id : otherUser.id,
      patientEmail: isCurrentFirst ? currentUser.email : otherUser.email,
      patientName: isCurrentFirst ? (currentUser.name || currentUser.fullName) : otherUser.name,
      doctorId: isCurrentFirst ? otherUser.id : currentUser.id,
      doctorEmail: isCurrentFirst ? otherUser.email : currentUser.email,
      doctorName: isCurrentFirst ? otherUser.name : (currentUser.name || currentUser.fullName)
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // State Getters
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current search results
   */
  getSearchResults(): SearchResult {
    return this.searchResults.getValue();
  }

  /**
   * Check if currently searching
   */
  getIsSearching(): boolean {
    return this.isSearching.getValue();
  }

  /**
   * Get search error
   */
  getSearchError(): string | null {
    return this.searchError.getValue();
  }

  /**
   * Check if creating conversation
   */
  getIsCreatingConversation(): boolean {
    return this.isCreatingConversation.getValue();
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Destroy service
   */
  destroy(): void {
    console.log('[StartConversation] Destroying service');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
