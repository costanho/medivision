import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  MessagingService,
  Conversation,
  AuthIntegrationService,
  ConversationService,
  RealTimeUpdatesService
} from '../..';

/**
 * Conversation List Component
 *
 * Displays all conversations for the logged-in user
 * Features:
 * - Shows other person's name, last message preview, timestamp, unread count
 * - Sorted by most recent first
 * - Click on conversation navigates to chat
 * - Real-time updates via WebSocket
 * - Search/filter functionality
 * - Loading and error states
 */
@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss']
})
export class ConversationListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // State Management
  // ═══════════════════════════════════════════════════════════════

  loading = false;
  error = '';
  successMessage = '';
  noConversations = false;

  // ═══════════════════════════════════════════════════════════════
  // Data
  // ═══════════════════════════════════════════════════════════════

  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  selectedConversationId: number | null = null;

  // ═══════════════════════════════════════════════════════════════
  // Search & Filter
  // ═══════════════════════════════════════════════════════════════

  searchQuery = '';

  // ═══════════════════════════════════════════════════════════════
  // Pagination
  // ═══════════════════════════════════════════════════════════════

  currentPage = 0;
  pageSize = 50;
  totalPages = 0;
  hasMore = false;

  // ═══════════════════════════════════════════════════════════════
  // Output Events
  // ═══════════════════════════════════════════════════════════════

  @Output() conversationSelected = new EventEmitter<Conversation>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor & Lifecycle
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private messaging: MessagingService,
    private authIntegration: AuthIntegrationService,
    private conversationService: ConversationService,
    private realtimeUpdates: RealTimeUpdatesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('[ConversationList] Initializing component');
    this.loadConversations();
    this.setupRealTimeUpdates();

    // Start listening to WebSocket real-time updates
    this.realtimeUpdates.startListening();
  }

  ngOnDestroy(): void {
    console.log('[ConversationList] Destroying component');
    // Stop listening to real-time updates
    this.realtimeUpdates.stopListening();
    // Unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════
  // Load Conversations
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load conversations from the messaging service
   */
  loadConversations(): void {
    console.log('[ConversationList] Loading conversations');

    // Check if user is authenticated
    if (!this.authIntegration.isMessagingReady()) {
      console.warn('[ConversationList] Messaging not ready, waiting...');
      return;
    }

    this.loading = true;
    this.error = '';
    this.noConversations = false;

    this.messaging.getConversations(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[ConversationList] Loaded conversations:', response);

          this.conversations = response.content || [];
          this.totalPages = response.totalPages || 0;
          this.hasMore = response.hasNext || false;

          // Sort by most recent first
          this.sortConversations();

          // Apply filters
          this.filterConversations();

          // Check if no conversations
          if (this.conversations.length === 0) {
            this.noConversations = true;
            console.log('[ConversationList] No conversations found');
          }

          this.loading = false;
        },
        error: (error: any) => {
          console.error('[ConversationList] Error loading conversations:', error);
          this.error = error?.error?.message || 'Failed to load conversations';
          this.loading = false;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // Sort Conversations
  // ═══════════════════════════════════════════════════════════════

  /**
   * Sort conversations by most recent message first
   */
  sortConversations(): void {
    this.conversations.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime).getTime();
      const timeB = new Date(b.lastMessageTime).getTime();
      return timeB - timeA; // Most recent first
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Filter Conversations
  // ═══════════════════════════════════════════════════════════════

  /**
   * Filter conversations based on search query
   */
  filterConversations(): void {
    if (!this.searchQuery.trim()) {
      this.filteredConversations = [...this.conversations];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredConversations = this.conversations.filter(conv => {
      const participantName = this.getParticipantName(conv).toLowerCase();
      const lastMessage = conv.lastMessage?.content?.toLowerCase() || '';

      return participantName.includes(query) || lastMessage.includes(query);
    });

    console.log(`[ConversationList] Filtered to ${this.filteredConversations.length} conversations`);
  }

  /**
   * Handle search input change
   */
  onSearchChange(): void {
    this.filterConversations();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filterConversations();
  }

  // ═══════════════════════════════════════════════════════════════
  // Conversation Selection
  // ═══════════════════════════════════════════════════════════════

  /**
   * Select a conversation and navigate to chat
   */
  selectConversation(conversation: Conversation): void {
    console.log('[ConversationList] Selected conversation:', conversation);

    this.selectedConversationId = conversation.id;
    this.conversationSelected.emit(conversation);

    // Mark as read
    if (conversation.unreadCountForCurrentUser && conversation.unreadCountForCurrentUser > 0) {
      this.markAsRead(conversation.id);
    }

    // Navigate to conversation (optional - depends on routing setup)
    // this.router.navigate(['/messages', conversation.id]);
  }

  // ═══════════════════════════════════════════════════════════════
  // Mark as Read
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark conversation as read
   */
  private markAsRead(conversationId: number): void {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (conversation?.lastMessage?.id) {
      this.messaging.markMessageAsRead(conversation.lastMessage.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('[ConversationList] Marked conversation as read');
            // Update local state
            const conv = this.conversations.find(c => c.id === conversationId);
            if (conv) {
              conv.unreadCountForCurrentUser = 0;
            }
          },
          error: (error: any) => {
            console.error('[ConversationList] Error marking as read:', error);
          }
        });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Real-Time Updates
  // ═══════════════════════════════════════════════════════════════

  /**
   * Setup real-time updates for new messages
   */
  private setupRealTimeUpdates(): void {
    console.log('[ConversationList] Setting up real-time updates');

    // Listen for conversation moved to top
    this.realtimeUpdates.conversationMovedToTop$
      .pipe(takeUntil(this.destroy$))
      .subscribe((conversation: Conversation) => {
        console.log('[ConversationList] Conversation moved to top:', conversation);
        // Re-sort and re-filter to maintain proper list order
        this.filterConversations();
      });

    // Listen for conversation message updates
    this.realtimeUpdates.conversationMessageUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((conversation: Conversation) => {
        console.log('[ConversationList] Conversation message updated:', conversation);
        // Update the conversation in the local list
        const index = this.conversations.findIndex(c => c.id === conversation.id);
        if (index !== -1) {
          this.conversations[index] = conversation;
          this.filterConversations();
        }
      });

    // Listen for unread count updates
    this.realtimeUpdates.conversationUnreadCountUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ conversation, previousCount }) => {
        console.log('[ConversationList] Unread count updated:', conversation, 'from', previousCount);
        // Update the conversation with new unread count
        const index = this.conversations.findIndex(c => c.id === conversation.id);
        if (index !== -1) {
          this.conversations[index] = conversation;
          this.filterConversations();
        }
      });

    // Listen for generic real-time updates
    this.realtimeUpdates.realtimeUpdateOccurred$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        console.log('[ConversationList] Real-time update occurred:', event);
        // Handle any other real-time events (typing, presence, etc.)
      });

    // Fallback: also listen to MessagingService chat messages for compatibility
    this.messaging.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        console.log('[ConversationList] New message received (fallback):', event);
        this.onNewMessage(event);
      });
  }

  /**
   * Handle new message received
   */
  private onNewMessage(event: any): void {
    // Find the conversation for this message
    const conversationId = event.conversationId;
    const conversation = this.conversations.find(c => c.id === conversationId);

    if (conversation) {
      // Update last message
      conversation.lastMessage = {
        id: event.messageId,
        senderId: event.senderId,
        senderName: event.senderName,
        content: event.content,
        timestamp: new Date(event.timestamp),
        isRead: false,
        recipientId: 0,
        recipientName: ''
      };
      conversation.lastMessageTime = new Date(event.timestamp);

      // Re-sort conversations to move this one to top
      this.sortConversations();
      this.filterConversations();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Pagination
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load next page of conversations
   */
  loadMore(): void {
    if (!this.hasMore) {
      return;
    }

    this.currentPage++;
    this.loadConversations();
  }

  /**
   * Refresh conversations
   */
  refresh(): void {
    this.currentPage = 0;
    this.loadConversations();
  }

  // ═══════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get the other participant's name
   */
  getParticipantName(conversation: Conversation): string {
    const currentUser = this.authIntegration.getAuthenticatedUser();

    if (!currentUser) {
      return 'Unknown';
    }

    // If current user is patient, show doctor name
    if (currentUser.role === 'patient' || currentUser.id === conversation.patientId) {
      return conversation.doctorName || 'Unknown Doctor';
    }

    // If current user is doctor, show patient name
    if (currentUser.role === 'doctor' || currentUser.id === conversation.doctorId) {
      return conversation.patientName || 'Unknown Patient';
    }

    // Default: show both names
    return `${conversation.patientName} & ${conversation.doctorName}`;
  }

  /**
   * Get time ago string
   */
  getTimeAgo(date: Date | string): string {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    // Format date
    return messageDate.toLocaleDateString();
  }

  /**
   * Get avatar initials
   */
  getAvatarInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'UN';
  }

  /**
   * Get participant role
   */
  getParticipantRole(conversation: Conversation): string {
    const currentUser = this.authIntegration.getAuthenticatedUser();

    if (!currentUser) {
      return 'unknown';
    }

    if (currentUser.id === conversation.patientId) {
      return 'doctor';
    }

    if (currentUser.id === conversation.doctorId) {
      return 'patient';
    }

    return 'unknown';
  }

  /**
   * Check if conversation is selected
   */
  isSelected(conversationId: number): boolean {
    return this.selectedConversationId === conversationId;
  }

  /**
   * Dismiss error message
   */
  dismissError(): void {
    this.error = '';
  }

  /**
   * Dismiss success message
   */
  dismissSuccess(): void {
    this.successMessage = '';
  }
}
