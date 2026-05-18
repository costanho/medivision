/**
 * Start Conversation Component
 * Allows users to search for and start conversations with other users
 *
 * Features:
 * - Search for users by name/email
 * - View available doctors/patients
 * - Click to start conversation
 * - Shows loading and error states
 * - Real-time search with debouncing
 */

import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  StartConversationService,
  SearchResult
} from '../../start-conversation.service';
import { User, Conversation } from '../../models';
import { AuthIntegrationService } from '../../auth-integration.service';

@Component({
  selector: 'app-start-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './start-conversation.component.html',
  styleUrls: ['./start-conversation.component.scss']
})
export class StartConversationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // State Management
  // ═══════════════════════════════════════════════════════════════

  isSearching = false;
  isCreatingConversation = false;
  error = '';
  successMessage = '';

  // ═══════════════════════════════════════════════════════════════
  // Data
  // ═══════════════════════════════════════════════════════════════

  searchQuery = '';
  searchResults: User[] = [];
  selectedUser: User | null = null;

  // ═══════════════════════════════════════════════════════════════
  // UI State
  // ═══════════════════════════════════════════════════════════════

  showNoResults = false;
  showSearchResults = false;
  showLoadingDoctors = false;

  // ═══════════════════════════════════════════════════════════════
  // Search Debouncer
  // ═══════════════════════════════════════════════════════════════

  private searchSubject = new Subject<string>();

  // ═══════════════════════════════════════════════════════════════
  // Output Events
  // ═══════════════════════════════════════════════════════════════

  @Output() conversationStarted = new EventEmitter<Conversation>();
  @Output() closed = new EventEmitter<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private startConversationService: StartConversationService,
    private authIntegration: AuthIntegrationService
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Lifecycle Hooks
  // ═══════════════════════════════════════════════════════════════

  ngOnInit(): void {
    console.log('[StartConversation] Initializing component');
    this.setupSearch();
    this.setupObservables();
    this.loadAvailableDoctors();
  }

  ngOnDestroy(): void {
    console.log('[StartConversation] Destroying component');
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════
  // Setup Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Setup search with debouncing
   */
  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query && query.trim().length > 0) {
        this.performSearch(query);
      } else {
        this.clearSearch();
      }
    });
  }

  /**
   * Setup observable subscriptions
   */
  private setupObservables(): void {
    // Subscribe to search results
    this.startConversationService.searchResults$
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        console.log('[StartConversation] Search results updated:', results);
        this.searchResults = results.users;
        this.showNoResults = results.query.length > 0 && this.searchResults.length === 0;
        this.showSearchResults = this.searchResults.length > 0;
      });

    // Subscribe to searching state
    this.startConversationService.isSearching$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isSearching => {
        console.log('[StartConversation] Searching state changed:', isSearching);
        this.isSearching = isSearching;
      });

    // Subscribe to search error
    this.startConversationService.searchError$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error) {
          console.error('[StartConversation] Search error:', error);
          this.error = error;
        }
      });

    // Subscribe to creating conversation state
    this.startConversationService.isCreatingConversation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isCreating => {
        console.log('[StartConversation] Creating conversation state:', isCreating);
        this.isCreatingConversation = isCreating;
      });

    // Subscribe to conversation created event
    this.startConversationService.conversationCreated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conversation => {
        console.log('[StartConversation] Conversation created:', conversation);
        this.successMessage = 'Conversation started successfully!';
        this.conversationStarted.emit(conversation);
        this.resetForm();

        // Auto-close after 2 seconds
        setTimeout(() => {
          this.close();
        }, 2000);
      });
  }

  /**
   * Load available doctors
   */
  private loadAvailableDoctors(): void {
    console.log('[StartConversation] Loading available doctors');
    this.showLoadingDoctors = true;

    this.startConversationService.getAvailableDoctors(0, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[StartConversation] Doctors loaded:', response);
          this.showLoadingDoctors = false;
          // Results are already in searchResults via observable
        },
        error: (error) => {
          console.error('[StartConversation] Error loading doctors:', error);
          this.showLoadingDoctors = false;
          this.error = 'Failed to load available doctors';
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // Search Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle search input change
   */
  onSearchChange(query: string): void {
    console.log('[StartConversation] Search input changed:', query);
    this.searchQuery = query;
    this.error = '';
    this.searchSubject.next(query);
  }

  /**
   * Perform actual search
   */
  private performSearch(query: string): void {
    console.log('[StartConversation] Performing search for:', query);
    this.startConversationService.searchUsers(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    console.log('[StartConversation] Clearing search');
    this.searchQuery = '';
    this.searchResults = [];
    this.showNoResults = false;
    this.showSearchResults = false;
    this.startConversationService.clearSearch();
  }

  // ═══════════════════════════════════════════════════════════════
  // Conversation Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start conversation with selected user
   */
  startConversation(user: User): void {
    console.log('[StartConversation] Starting conversation with user:', user);

    this.error = '';
    this.successMessage = '';
    this.selectedUser = user;

    this.startConversationService.createConversation(user)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('[StartConversation] Conversation result:', result);
          if (result.success && result.conversation) {
            if (result.isExisting) {
              this.successMessage = 'Conversation already exists. Opening...';
            } else {
              this.successMessage = 'New conversation created!';
            }
            this.conversationStarted.emit(result.conversation);

            // Auto-close after 1.5 seconds
            setTimeout(() => {
              this.close();
            }, 1500);
          } else {
            this.error = result.error || 'Failed to create conversation';
          }
        },
        error: (error) => {
          console.error('[StartConversation] Error creating conversation:', error);
          this.error = 'Failed to create conversation';
          this.selectedUser = null;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // UI Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get participant role badge text
   */
  getRoleBadge(user: User): string {
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'online':
        return '#4caf50';
      case 'away':
        return '#ff9800';
      case 'offline':
        return '#9e9e9e';
      default:
        return '#999';
    }
  }

  /**
   * Get avatar initials
   */
  getAvatarInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'U';
  }

  /**
   * Check if user is current user
   */
  isCurrentUser(user: User): boolean {
    const currentUser = this.authIntegration.getAuthenticatedUser();
    return currentUser ? currentUser.id === user.id : false;
  }

  /**
   * Dismiss error
   */
  dismissError(): void {
    this.error = '';
  }

  /**
   * Reset form
   */
  private resetForm(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedUser = null;
    this.showSearchResults = false;
    this.showNoResults = false;
  }

  /**
   * Close modal
   */
  close(): void {
    console.log('[StartConversation] Closing component');
    this.resetForm();
    this.closed.emit();
  }
}
