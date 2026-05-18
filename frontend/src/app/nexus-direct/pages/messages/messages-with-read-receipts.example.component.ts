/**
 * Complete ChatComponent Integration Example
 * Demonstrates full read receipts functionality with messaging
 *
 * This example shows:
 * - Reading/displaying messages with read receipt tracking
 * - Auto-marking messages as read when visible
 * - Displaying double checkmarks and read timestamps
 * - Sending read receipts via WebSocket
 * - Receiving and handling incoming read receipts
 * - Error handling and edge cases
 *
 * Usage:
 * 1. Copy this component to your project
 * 2. Inject required services (ReadReceiptService, ReadReceiptBroadcasterService, etc.)
 * 3. Implement message loading from your API
 * 4. Customize styling and UI to match your design
 */

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { Subject, takeUntil, filter } from 'rxjs';

// Import read receipt services
import { ReadReceiptService } from '../../services/messaging/read-receipt.service';
import { ReadReceiptBroadcasterService } from '../../services/messaging/read-receipt-broadcaster.service';
import { MessageVisibilityDirective } from '../../services/messaging/message-visibility.directive';

// Import your messaging services
import { MessagesService } from '../../services/messaging/messages.service';
import { AuthIntegrationService } from '../../../core/services/auth-integration.service';
import { WebSocketService } from '../../services/messaging/websocket.service';

/**
 * Message interface matching your backend
 */
interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderEmail: string;
  content: string;
  timestamp: Date;
  senderProfileImage?: string;
}

/**
 * Conversation interface
 */
interface Conversation {
  id: number;
  participantId: number;
  participantName: string;
  participantEmail: string;
  participantProfileImage?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

/**
 * Component state interface
 */
interface ComponentState {
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMoreMessages: boolean;
  currentPage: number;
  pageSize: number;
}

@Component({
  selector: 'app-messages-with-read-receipts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MessageVisibilityDirective
  ],
  templateUrl: './messages-with-read-receipts.example.component.html',
  styleUrls: ['./messages-with-read-receipts.example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagesWithReadReceiptsExampleComponent implements OnInit, OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // View References
  // ═══════════════════════════════════════════════════════════════

  @ViewChild('messagesContainer', { static: false }) messagesContainer?: ElementRef<HTMLDivElement>;

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  messages: Message[] = [];
  conversations: Conversation[] = [];
  selectedConversationId: number | null = null;
  newMessageContent: string = '';

  state: ComponentState = {
    isLoading: true,
    isLoadingMore: false,
    error: null,
    hasMoreMessages: true,
    currentPage: 0,
    pageSize: 20
  };

  // ═══════════════════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════════════════

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private readReceiptService: ReadReceiptService,
    private readReceiptBroadcaster: ReadReceiptBroadcasterService,
    private messagesService: MessagesService,
    private auth: AuthIntegrationService,
    private webSocket: WebSocketService
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════

  ngOnInit(): void {
    try {
      // Initialize read receipt service with current user
      this.initializeReadReceipts();

      // Load initial conversations and messages
      this.loadConversations();

      // Setup read receipt listeners
      this.setupReadReceiptListeners();

      // Setup WebSocket incoming read receipts
      this.setupIncomingReadReceipts();
    } catch (error) {
      this.handleError('Failed to initialize component', error);
    }
  }

  ngOnDestroy(): void {
    // Cleanup: flush any pending read receipts
    if (this.selectedConversationId) {
      this.readReceiptService.markAllVisibleAsRead(this.selectedConversationId);
    }

    // Complete subjects
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════
  // Read Receipts Setup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize read receipt service with current user context
   */
  private initializeReadReceipts(): void {
    const userId = this.auth.getCurrentUserId();
    const userName = this.auth.getCurrentUserName();

    if (!userId || !userName) {
      throw new Error('User not authenticated');
    }

    // Set current user for read receipt tracking
    this.readReceiptService.setCurrentUser(userId, userName);

    console.log('[ChatComponent] Read receipts initialized for user:', userId);
  }

  /**
   * Setup batch read receipt broadcasting
   * Sends read receipts when batch is ready
   */
  private setupReadReceiptListeners(): void {
    // Listen for when batch of read receipts is ready to send
    this.readReceiptService.batchReady$
      .pipe(
        takeUntil(this.destroy$),
        filter(batch => batch.messageIds.length > 0)
      )
      .subscribe(batch => {
        try {
          // Send batch via WebSocket
          const batchId = this.readReceiptBroadcaster.broadcastReadReceiptBatch(
            batch.messageIds,
            batch.conversationId,
            this.auth.getCurrentUserId(),
            this.auth.getCurrentUserName()
          );

          console.log('[ChatComponent] Broadcast batch:', {
            batchId,
            messageCount: batch.messageIds.length,
            conversationId: batch.conversationId
          });
        } catch (error) {
          this.handleError('Failed to broadcast read receipts', error);
        }
      });

    // Listen for incoming read receipts (updates to messages)
    this.readReceiptService.readReceipt$
      .pipe(
        takeUntil(this.destroy$),
        filter(receipt => receipt.conversationId === this.selectedConversationId)
      )
      .subscribe(receipt => {
        console.log('[ChatComponent] Received read receipt:', {
          messageId: receipt.messageId,
          readBy: receipt.readerId,
          readAt: receipt.timestamp
        });
        // UI updates automatically via template bindings
      });
  }

  /**
   * Setup incoming read receipts from WebSocket
   */
  private setupIncomingReadReceipts(): void {
    // Subscribe to WebSocket read receipt messages
    this.webSocket.readReceipts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        try {
          // Handle the incoming read receipt
          this.readReceiptService.handleReadReceipt(event);
          console.log('[ChatComponent] Processed incoming read receipt');
        } catch (error) {
          this.handleError('Failed to process incoming read receipt', error);
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // Data Loading
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load all conversations for the current user
   */
  private loadConversations(): void {
    this.messagesService.getConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations) => {
          this.conversations = conversations;
          this.state.isLoading = false;

          // Auto-select first conversation if available
          if (conversations.length > 0) {
            this.selectConversation(conversations[0].id);
          }
        },
        error: (error) => {
          this.handleError('Failed to load conversations', error);
        }
      });
  }

  /**
   * Load messages for selected conversation
   */
  private loadMessages(): void {
    if (!this.selectedConversationId) return;

    this.state.isLoading = true;
    this.state.error = null;

    this.messagesService.getMessages(
      this.selectedConversationId,
      this.state.currentPage,
      this.state.pageSize
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Append messages (handle pagination)
          if (this.state.currentPage === 0) {
            this.messages = response.messages;
          } else {
            this.messages.unshift(...response.messages);
          }

          this.state.hasMoreMessages = response.hasMore;
          this.state.isLoading = false;

          // Mark all visible messages as read
          setTimeout(() => {
            this.markAllVisibleAsRead();
          }, 500);
        },
        error: (error) => {
          this.handleError('Failed to load messages', error);
        }
      });
  }

  /**
   * Load older messages (pagination)
   */
  loadMoreMessages(): void {
    if (this.state.isLoadingMore || !this.state.hasMoreMessages) {
      return;
    }

    this.state.isLoadingMore = true;
    this.state.currentPage++;

    this.loadMessages();
  }

  // ═══════════════════════════════════════════════════════════════
  // Conversation Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Select a conversation and load its messages
   */
  selectConversation(conversationId: number): void {
    if (this.selectedConversationId === conversationId) {
      return;
    }

    try {
      // Flush pending read receipts from previous conversation
      if (this.selectedConversationId) {
        this.readReceiptService.markAllVisibleAsRead(this.selectedConversationId);
      }

      // Switch to new conversation
      this.selectedConversationId = conversationId;
      this.readReceiptService.setCurrentConversation(conversationId);

      // Reset pagination
      this.state.currentPage = 0;
      this.messages = [];

      // Load messages for new conversation
      this.loadMessages();

      console.log('[ChatComponent] Selected conversation:', conversationId);
    } catch (error) {
      this.handleError('Failed to select conversation', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Message Operations
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send a new message
   */
  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.selectedConversationId) {
      return;
    }

    const conversationId = this.selectedConversationId;
    const content = this.newMessageContent.trim();

    this.messagesService.sendMessage(conversationId, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          // Add new message to list
          this.messages.push(message);

          // Clear input
          this.newMessageContent = '';

          // Scroll to bottom
          this.scrollToBottom();

          // Mark own message as read immediately
          this.readReceiptService.markMessageAsRead(message.id, conversationId);
        },
        error: (error) => {
          this.handleError('Failed to send message', error);
        }
      });
  }

  /**
   * Mark all visible messages as read
   */
  private markAllVisibleAsRead(): void {
    if (!this.selectedConversationId) return;

    this.readReceiptService.markAllVisibleAsRead(this.selectedConversationId);

    console.log('[ChatComponent] Marked all visible messages as read');
  }

  /**
   * Scroll to bottom of messages container
   */
  private scrollToBottom(): void {
    if (!this.messagesContainer) return;

    setTimeout(() => {
      const container = this.messagesContainer!.nativeElement;
      container.scrollTop = container.scrollHeight;
    }, 0);
  }

  // ═══════════════════════════════════════════════════════════════
  // Read Receipt Queries
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if a message is read
   */
  isMessageRead(messageId: number): boolean {
    return this.readReceiptService.isMessageRead(messageId);
  }

  /**
   * Get read timestamp for a message
   */
  getReadTime(messageId: number): Date | undefined {
    const receipt = this.readReceiptService.getReadReceipt(messageId);
    return receipt?.readAt;
  }

  /**
   * Check if message is from current user
   */
  isOwnMessage(message: Message): boolean {
    return message.senderId === this.auth.getCurrentUserId();
  }

  /**
   * Get unread count for current conversation
   */
  getUnreadCount(): number {
    if (!this.selectedConversationId) return 0;

    const messageIds = this.messages.map(m => m.id);
    return this.readReceiptService.getUnreadCount(this.selectedConversationId, messageIds);
  }

  /**
   * Get unread count for a conversation (for conversation list)
   */
  getConversationUnreadCount(conversationId: number): number {
    const conversation = this.conversations.find(c => c.id === conversationId);
    return conversation?.unreadCount ?? 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // Utility
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format date/time for display
   */
  formatTime(date: Date): string {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Format read time for display
   */
  formatReadTime(date: Date): string {
    const today = new Date();
    const messageDate = new Date(date);

    const isToday =
      today.getDate() === messageDate.getDate() &&
      today.getMonth() === messageDate.getMonth() &&
      today.getFullYear() === messageDate.getFullYear();

    if (isToday) {
      return this.formatTime(messageDate);
    }

    return messageDate.toLocaleDateString();
  }

  /**
   * Handle errors
   */
  private handleError(message: string, error: any): void {
    console.error(`[ChatComponent] ${message}:`, error);
    this.state.error = message;
  }
}
