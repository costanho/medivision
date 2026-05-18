/**
 * Message Visibility Directive
 * Detects when messages become visible in viewport using IntersectionObserver
 *
 * Usage:
 * <div appMessageVisibility
 *      [messageId]="message.id"
 *      [conversationId]="conversation.id"
 *      (visibilityChange)="onVisibilityChange($event)">
 *   Message content
 * </div>
 */

import {
  Directive,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy
} from '@angular/core';

import { ReadReceiptService } from './read-receipt.service';

/**
 * Visibility Change Event
 */
export interface VisibilityChangeEvent {
  messageId: number;
  conversationId: number;
  isVisible: boolean;
  intersectionRatio: number;
}

@Directive({
  selector: '[appMessageVisibility]',
  standalone: true
})
export class MessageVisibilityDirective implements OnInit, OnDestroy {
  // Inputs
  @Input() messageId!: number;
  @Input() conversationId!: number;
  @Input() visibilityThreshold: number | number[] = 0.5;

  // Outputs
  @Output() visibilityChange = new EventEmitter<VisibilityChangeEvent>();

  // IntersectionObserver
  private observer: IntersectionObserver | null = null;
  private isCurrentlyVisible = false;

  constructor(
    private elementRef: ElementRef,
    private readReceiptService: ReadReceiptService
  ) {}

  ngOnInit(): void {
    if (!this.messageId || !this.conversationId) {
      console.error('[MessageVisibility] messageId and conversationId are required');
      return;
    }

    this.setupObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Setup IntersectionObserver
   */
  private setupObserver(): void {
    const options: IntersectionObserverInit = {
      root: null,  // viewport
      rootMargin: '0px',
      threshold: this.visibilityThreshold
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.handleIntersection(entry);
      });
    }, options);

    // Start observing
    this.observer.observe(this.elementRef.nativeElement);

    console.log('[MessageVisibility] Observer set up for message:', this.messageId);
  }

  /**
   * Handle intersection change
   */
  private handleIntersection(entry: IntersectionObserverEntry): void {
    const isVisible = entry.isIntersecting && entry.intersectionRatio >= (Array.isArray(this.visibilityThreshold) ? this.visibilityThreshold[0] : this.visibilityThreshold);

    console.log('[MessageVisibility] Intersection change:', {
      messageId: this.messageId,
      isVisible,
      ratio: entry.intersectionRatio
    });

    // Emit event
    this.visibilityChange.emit({
      messageId: this.messageId,
      conversationId: this.conversationId,
      isVisible,
      intersectionRatio: entry.intersectionRatio
    });

    // Update read receipt service
    if (isVisible && !this.isCurrentlyVisible) {
      // Became visible
      this.readReceiptService.markMessageVisible(this.messageId, this.conversationId);
      this.isCurrentlyVisible = true;
    } else if (!isVisible && this.isCurrentlyVisible) {
      // No longer visible
      this.readReceiptService.markMessageNotVisible(this.messageId);
      this.isCurrentlyVisible = false;
    }
  }
}
