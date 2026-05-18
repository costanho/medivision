/**
 * Chat Component
 * Displays messages for a selected conversation
 *
 * Features:
 * - Display message list
 * - Show messages in chronological order
 * - Display sender name and avatar
 * - Show timestamp for each message
 * - Differentiate sent (right) and received (left) messages
 * - Auto-scroll to newest message
 * - Load more messages (pagination)
 * - Mark messages as read
 * - Show typing indicators
 */

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ChatService } from '../../chat.service';
import { AuthIntegrationService } from '../../auth-integration.service';
import { AutoScrollService } from '../../auto-scroll.service';
import { Message, Conversation } from '../../models';
import { ChatMessageItemComponent } from './chat-message-item/chat-message-item.component';
import { MessageInputComponent } from './message-input/message-input.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ChatMessageItemComponent, MessageInputComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Inputs
  // ═══════════════════════════════════════════════════════════════

  @Input() conversation: Conversation | null = null;

  // ═══════════════════════════════════════════════════════════════
  // Outputs
  // ═══════════════════════════════════════════════════════════════

  @Output() messageAdded = new EventEmitter<Message>();
  @Output() conversationClosed = new EventEmitter<void>();

  // ═══════════════════════════════════════════════════════════════
  // ViewChildren
  // ═══════════════════════════════════════════════════════════════

  @ViewChild('messagesContainer', { static: false }) messagesContainer: ElementRef | null = null;

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  messages: Message[] = [];
  isLoading = false;
  isSending = false;
  error: string | null = null;
  typingUsers: Set<number> = new Set();

  // ═══════════════════════════════════════════════════════════════
  // UI State
  // ═══════════════════════════════════════════════════════════════

  showLoadMore = false;
  isAtBottom = true;

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(
    private chatService: ChatService,
    public authIntegration: AuthIntegrationService,
    private autoScrollService: AutoScrollService,
    private cdr: ChangeDetectorRef
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Lifecycle Hooks
  // ═══════════════════════════════════════════════════════════════

  ngOnInit(): void {
    console.log('[Chat] Initializing component');
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    console.log('[Chat] Destroying component');
    this.chatService.clearChat();
    this.autoScrollService.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: any): void {
    if (changes['conversation'] && this.conversation) {
      console.log('[Chat] Conversation changed:', this.conversation.id);
      this.initializeChat();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Setup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize chat for conversation
   */
  private initializeChat(): void {
    if (!this.conversation) return;

    console.log('[Chat] Initializing chat for conversation:', this.conversation.id);
    this.chatService.initializeChat(this.conversation.id);
  }

  /**
   * Setup subscriptions
   */
  private setupSubscriptions(): void {
    console.log('[Chat] Setting up subscriptions');

    // Subscribe to messages
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        console.log('[Chat] Messages updated:', messages.length);
        this.messages = messages;
        this.cdr.markForCheck();

        // Auto-scroll if at bottom using AutoScrollService
        setTimeout(() => {
          if (this.messagesContainer && this.isAtBottom) {
            this.autoScrollService.scrollToBottom(this.messagesContainer.nativeElement);
          }
        }, 100);
      });

    // Subscribe to loading state
    this.chatService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        console.log('[Chat] Loading state:', isLoading);
        this.isLoading = isLoading;
        this.cdr.markForCheck();
      });

    // Subscribe to sending state
    this.chatService.isSending$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isSending => {
        console.log('[Chat] Sending state:', isSending);
        this.isSending = isSending;
        this.cdr.markForCheck();
      });

    // Subscribe to error
    this.chatService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error) {
          console.error('[Chat] Error:', error);
          this.error = error;
          this.cdr.markForCheck();
        }
      });

    // Subscribe to message received
    this.chatService.messageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('[Chat] Message received:', message);
        this.messageAdded.emit(message);
        // Smart auto-scroll to new message using AutoScrollService
        // Only scrolls if user is already at bottom (doesn't interrupt reading)
        setTimeout(() => {
          if (this.messagesContainer) {
            this.autoScrollService.autoScrollIfAtBottom(this.messagesContainer.nativeElement);
          }
        }, 50);
      });

    // Subscribe to typing status
    this.chatService.typingStatusChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ userId, isTyping }) => {
        console.log('[Chat] Typing status changed:', userId, isTyping);
        if (isTyping) {
          this.typingUsers.add(userId);
        } else {
          this.typingUsers.delete(userId);
        }
        this.cdr.markForCheck();
      });

    // Subscribe to AutoScrollService scroll position changes
    this.autoScrollService.scrollPosition$
      .pipe(takeUntil(this.destroy$))
      .subscribe(position => {
        console.log('[Chat] Scroll position updated:', {
          isAtBottom: position.isAtBottom,
          distanceFromBottom: position.distanceFromBottom,
          percentageScrolled: position.percentageScrolled
        });
        this.isAtBottom = position.isAtBottom;
        this.cdr.markForCheck();
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // Message Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load more messages
   */
  loadMoreMessages(): void {
    if (!this.conversation) return;

    console.log('[Chat] Loading more messages');
    this.chatService.loadMoreMessages(this.conversation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * Mark message as read
   */
  markAsRead(message: Message): void {
    if (!message.isRead) {
      console.log('[Chat] Marking message as read:', message.id);
      this.chatService.markMessageAsRead(message.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  /**
   * Mark all messages as read
   */
  markAllAsRead(): void {
    if (!this.conversation) return;

    console.log('[Chat] Marking all messages as read');
    this.chatService.markAllAsRead(this.conversation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  // ═══════════════════════════════════════════════════════════════
  // Scroll Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Scroll to bottom with smooth animation
   */
  scrollToBottom(): void {
    if (!this.messagesContainer) return;

    try {
      setTimeout(() => {
        if (this.messagesContainer) {
          this.autoScrollService.scrollToBottom(this.messagesContainer.nativeElement);
        }
      }, 0);
    } catch (error) {
      console.error('[Chat] Error scrolling to bottom:', error);
    }
  }

  /**
   * Handle scroll event
   */
  onScroll(event: any): void {
    const element = event.target;

    // Use AutoScrollService to handle scroll position detection
    this.autoScrollService.handleScroll(element);

    // Check if near top (load more)
    if (element.scrollTop < 100 && !this.isLoading) {
      const state = this.chatService.getState();
      this.showLoadMore = state.hasMore;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if message is from current user
   */
  isMessageFromCurrentUser(senderId: number): boolean {
    return this.chatService.isMessageFromCurrentUser(senderId);
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

    return messageDate.toLocaleDateString();
  }

  /**
   * Get avatar initials
   */
  getAvatarInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'U';
  }

  /**
   * Dismiss error
   */
  dismissError(): void {
    this.error = null;
    this.cdr.markForCheck();
  }

  /**
   * Close chat
   */
  closeChat(): void {
    console.log('[Chat] Closing chat');
    this.conversationClosed.emit();
  }

  /**
   * Check if showing typing indicator
   */
  showTypingIndicator(): boolean {
    return this.typingUsers.size > 0;
  }

  /**
   * Get typing indicator text
   */
  getTypingIndicatorText(): string {
    if (this.typingUsers.size === 0) return '';
    if (this.typingUsers.size === 1) return 'User is typing...';
    return `${this.typingUsers.size} users are typing...`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Message Sending
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle message sent from input component
   */
  onMessageSent(input: any): void {
    if (!this.conversation) {
      console.error('[Chat] No conversation selected');
      return;
    }

    console.log('[Chat] Message sent event received:', input);

    const currentUser = this.authIntegration.getAuthenticatedUser();
    if (!currentUser) {
      console.error('[Chat] User not authenticated');
      return;
    }

    // Determine recipient based on conversation
    const isPatient = currentUser.id === this.conversation.patientId;
    const recipientId = isPatient ? this.conversation.doctorId : this.conversation.patientId;
    const recipientEmail = isPatient ? this.conversation.doctorEmail : this.conversation.patientEmail;
    const recipientName = isPatient ? this.conversation.doctorName : this.conversation.patientName;

    const messageInput = {
      conversationId: this.conversation.id,
      recipientId,
      recipientEmail,
      recipientName,
      content: input.content
    };

    this.chatService.sendMessage(messageInput)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message: Message) => {
          console.log('[Chat] Message sent successfully:', message);
          // Message will be added to list via messageReceived$ subscription
        },
        error: (error: any) => {
          console.error('[Chat] Error sending message:', error);
        }
      });
  }

  /**
   * Handle typing started from input component
   */
  onTypingStarted(): void {
    if (!this.conversation) return;

    console.log('[Chat] User started typing');
    this.chatService.sendTypingIndicator(this.conversation.id, true);
  }

  /**
   * Handle typing stopped from input component
   */
  onTypingStopped(): void {
    if (!this.conversation) return;

    console.log('[Chat] User stopped typing');
    this.chatService.sendTypingIndicator(this.conversation.id, false);
  }
}
