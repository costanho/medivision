/**
 * Message Input Component
 * Allows users to type and send messages in a conversation
 *
 * Features:
 * - Text input for message composition
 * - Send button with loading state
 * - Message validation (not empty)
 * - Auto-focus for quick typing
 * - Clear input after sending
 * - Typing indicator emission
 * - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Placeholder text
 * - Character counter (optional)
 * - Disabled state management
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

export interface MessageInput {
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageInputComponent implements OnInit, OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // Inputs
  // ═══════════════════════════════════════════════════════════════

  @Input() isSending = false;
  @Input() isDisabled = false;
  @Input() placeholder = 'Type a message...';
  @Input() maxLength = 5000;
  @Input() autoFocus = true;
  @Input() showCharacterCount = false;

  // ═══════════════════════════════════════════════════════════════
  // Outputs
  // ═══════════════════════════════════════════════════════════════

  @Output() messageSent = new EventEmitter<MessageInput>();
  @Output() typingStarted = new EventEmitter<void>();
  @Output() typingStopped = new EventEmitter<void>();

  // ═══════════════════════════════════════════════════════════════
  // ViewChild
  // ═══════════════════════════════════════════════════════════════

  @ViewChild('messageInput', { static: false }) messageInput: ElementRef | null = null;

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  messageContent = '';
  isTyping = false;
  characterCount = 0;
  showSendButton = false;

  // ═══════════════════════════════════════════════════════════════
  // Private Properties
  // ═══════════════════════════════════════════════════════════════

  private destroy$ = new Subject<void>();
  private typingSubject = new Subject<string>();
  private typingTimeout: any;
  private readonly TYPING_DEBOUNCE_TIME = 300; // ms
  private readonly TYPING_STOP_TIME = 3000; // ms

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor(private cdr: ChangeDetectorRef) {
    console.log('[MessageInput] Component initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  // Lifecycle Hooks
  // ═══════════════════════════════════════════════════════════════

  ngOnInit(): void {
    console.log('[MessageInput] Initializing component');
    this.setupTypingDetection();
    this.focusInput();
  }

  ngOnDestroy(): void {
    console.log('[MessageInput] Destroying component');
    this.destroy$.next();
    this.destroy$.complete();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Setup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Setup typing detection with debouncing
   */
  private setupTypingDetection(): void {
    console.log('[MessageInput] Setting up typing detection');

    this.typingSubject
      .pipe(
        debounceTime(this.TYPING_DEBOUNCE_TIME),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((content: string) => {
        if (content.trim().length > 0 && !this.isTyping) {
          console.log('[MessageInput] User started typing');
          this.isTyping = true;
          this.typingStarted.emit();
          this.cdr.markForCheck();
        }

        // Clear previous timeout
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
        }

        // Set timeout to stop typing indicator
        this.typingTimeout = setTimeout(() => {
          if (this.isTyping) {
            console.log('[MessageInput] User stopped typing');
            this.isTyping = false;
            this.typingStopped.emit();
            this.cdr.markForCheck();
          }
        }, this.TYPING_STOP_TIME);
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // Message Handling
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle input text change
   */
  onInputChange(event: any): void {
    const content = event.target.value;
    this.messageContent = content;
    this.characterCount = content.length;
    this.showSendButton = content.trim().length > 0;

    console.log('[MessageInput] Input changed:', {
      length: content.length,
      empty: content.trim().length === 0
    });

    this.typingSubject.next(content);
    this.cdr.markForCheck();
  }

  /**
   * Send message
   */
  sendMessage(): void {
    if (!this.isValidMessage()) {
      console.warn('[MessageInput] Invalid message: empty or whitespace only');
      return;
    }

    if (this.isSending) {
      console.warn('[MessageInput] Already sending a message');
      return;
    }

    const trimmedContent = this.messageContent.trim();

    console.log('[MessageInput] Sending message:', {
      length: trimmedContent.length,
      preview: trimmedContent.substring(0, 50) + (trimmedContent.length > 50 ? '...' : '')
    });

    const message: MessageInput = {
      content: trimmedContent,
      timestamp: new Date()
    };

    // Emit message sent event
    this.messageSent.emit(message);

    // Clear input after sending
    this.clearInput();

    // Stop typing indicator
    if (this.isTyping) {
      this.isTyping = false;
      this.typingStopped.emit();
    }

    // Refocus input for quick follow-up message
    setTimeout(() => {
      this.focusInput();
    }, 100);
  }

  /**
   * Handle keyboard events
   */
  onKeyDown(event: KeyboardEvent): void {
    // Enter to send (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
    // Shift+Enter for new line is default behavior
  }

  // ═══════════════════════════════════════════════════════════════
  // Validation
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate message content
   */
  private isValidMessage(): boolean {
    return this.messageContent.trim().length > 0 && this.messageContent.trim().length <= this.maxLength;
  }

  /**
   * Check if message is empty
   */
  isMessageEmpty(): boolean {
    return this.messageContent.trim().length === 0;
  }

  /**
   * Check if message exceeds max length
   */
  isMessageTooLong(): boolean {
    return this.messageContent.length > this.maxLength;
  }

  /**
   * Get remaining character count
   */
  getRemaining(): number {
    return Math.max(0, this.maxLength - this.messageContent.length);
  }

  // ═══════════════════════════════════════════════════════════════
  // Input Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Clear input
   */
  clearInput(): void {
    console.log('[MessageInput] Clearing input');
    this.messageContent = '';
    this.characterCount = 0;
    this.showSendButton = false;
    this.cdr.markForCheck();
  }

  /**
   * Focus input for quick typing
   */
  focusInput(): void {
    if (!this.autoFocus) return;

    setTimeout(() => {
      if (this.messageInput) {
        console.log('[MessageInput] Focusing input');
        this.messageInput.nativeElement.focus();
      }
    }, 0);
  }

  /**
   * Blur input
   */
  blurInput(): void {
    if (this.messageInput) {
      console.log('[MessageInput] Blurring input');
      this.messageInput.nativeElement.blur();
    }
  }

  /**
   * Get input value
   */
  getValue(): string {
    return this.messageContent;
  }

  /**
   * Set input value
   */
  setValue(value: string): void {
    this.messageContent = value;
    this.characterCount = value.length;
    this.showSendButton = value.trim().length > 0;
    this.cdr.markForCheck();
  }

  // ═══════════════════════════════════════════════════════════════
  // State Getters
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if send button should be disabled
   */
  isSendDisabled(): boolean {
    return (
      this.isMessageEmpty() ||
      this.isMessageTooLong() ||
      this.isSending ||
      this.isDisabled
    );
  }

  /**
   * Check if input should be disabled
   */
  isInputDisabled(): boolean {
    return this.isSending || this.isDisabled;
  }

  /**
   * Get button class
   */
  getSendButtonClass(): string {
    let classes = 'send-btn';
    if (this.isSending) classes += ' sending';
    if (this.isSendDisabled()) classes += ' disabled';
    return classes;
  }
}
