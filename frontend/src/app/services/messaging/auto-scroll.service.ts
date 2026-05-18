/**
 * Auto-Scroll Service
 * Handles intelligent auto-scrolling in chat message lists
 *
 * Features:
 * - Detect if user is at bottom of message list
 * - Auto-scroll to bottom when new message arrives
 * - Smooth scroll animation
 * - Respect user reading position
 * - Handle edge cases (empty list, single message)
 * - Configurable scroll threshold
 * - Scroll position change events
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface ScrollPosition {
  isAtBottom: boolean;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  distanceFromBottom: number;
  percentageScrolled: number;
}

@Injectable({
  providedIn: 'root'
})
export class AutoScrollService {
  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  private readonly SCROLL_THRESHOLD = 100; // pixels from bottom
  private readonly SCROLL_DURATION = 300; // milliseconds for smooth scroll
  private readonly SCROLL_BEHAVIOR = 'smooth' as ScrollBehavior; // smooth or auto

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  private scrollPosition = new BehaviorSubject<ScrollPosition>({
    isAtBottom: true,
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    distanceFromBottom: 0,
    percentageScrolled: 100
  });

  public scrollPosition$ = this.scrollPosition.asObservable();

  private autoScrollTriggered = new Subject<void>();
  public autoScrollTriggered$ = this.autoScrollTriggered.asObservable();

  // ═══════════════════════════════════════════════════════════════
  // Private Properties
  // ═══════════════════════════════════════════════════════════════

  private scrollTimeout: any;
  private isUserInitiatedScroll = false;
  private lastScrollEvent: number = 0;
  private readonly SCROLL_EVENT_DEBOUNCE = 100; // ms

  // ═══════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════

  constructor() {
    console.log('[AutoScrollService] Service initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  // Scroll Detection
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle scroll event from container
   * Detects if user is at bottom and updates scroll position
   */
  handleScroll(element: HTMLElement): void {
    const now = Date.now();

    // Debounce scroll events
    if (now - this.lastScrollEvent < this.SCROLL_EVENT_DEBOUNCE) {
      return;
    }

    this.lastScrollEvent = now;

    const position = this.calculateScrollPosition(element);
    this.scrollPosition.next(position);

    // Mark as user-initiated scroll (user manually scrolled)
    this.isUserInitiatedScroll = true;

    // Clear timeout for user scroll detection
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Reset user scroll flag after 1 second (consider auto-scroll after this)
    this.scrollTimeout = setTimeout(() => {
      this.isUserInitiatedScroll = false;
    }, 1000);

    console.log('[AutoScrollService] Scroll detected:', {
      isAtBottom: position.isAtBottom,
      distanceFromBottom: position.distanceFromBottom,
      percentageScrolled: position.percentageScrolled
    });
  }

  /**
   * Calculate current scroll position
   */
  private calculateScrollPosition(element: HTMLElement): ScrollPosition {
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < this.SCROLL_THRESHOLD;
    const percentageScrolled =
      scrollHeight > 0 ? Math.round(((scrollTop + clientHeight) / scrollHeight) * 100) : 100;

    return {
      isAtBottom,
      scrollTop,
      scrollHeight,
      clientHeight,
      distanceFromBottom,
      percentageScrolled
    };
  }

  /**
   * Check if user is at bottom
   */
  isAtBottom(element: HTMLElement): boolean {
    const position = this.calculateScrollPosition(element);
    return position.isAtBottom;
  }

  /**
   * Check if user is near bottom (within threshold)
   */
  isNearBottom(element: HTMLElement, threshold: number = this.SCROLL_THRESHOLD): boolean {
    const position = this.calculateScrollPosition(element);
    return position.distanceFromBottom < threshold;
  }

  /**
   * Check if user initiated the scroll (not auto-scroll)
   */
  isUserScroll(): boolean {
    return this.isUserInitiatedScroll;
  }

  // ═══════════════════════════════════════════════════════════════
  // Auto-Scroll Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Auto-scroll to bottom if user is already at bottom
   * This prevents interrupting user reading old messages
   */
  autoScrollIfAtBottom(element: HTMLElement): void {
    if (this.isAtBottom(element) && !this.isUserScroll()) {
      this.scrollToBottom(element);
    } else {
      console.log('[AutoScrollService] Auto-scroll skipped:', {
        isAtBottom: this.isAtBottom(element),
        isUserScroll: this.isUserScroll()
      });
    }
  }

  /**
   * Force scroll to bottom with smooth animation
   */
  scrollToBottom(element: HTMLElement, duration: number = this.SCROLL_DURATION): void {
    if (!element) {
      console.warn('[AutoScrollService] No element provided for scroll');
      return;
    }

    console.log('[AutoScrollService] Scrolling to bottom');

    // Use smooth scroll behavior (native browser API)
    element.scrollTo({
      top: element.scrollHeight,
      behavior: this.SCROLL_BEHAVIOR
    });

    // Emit event to notify components
    this.autoScrollTriggered.next();
  }

  /**
   * Scroll to top
   */
  scrollToTop(element: HTMLElement): void {
    if (!element) {
      console.warn('[AutoScrollService] No element provided for scroll');
      return;
    }

    console.log('[AutoScrollService] Scrolling to top');

    element.scrollTo({
      top: 0,
      behavior: this.SCROLL_BEHAVIOR
    });
  }

  /**
   * Scroll to specific pixel position
   */
  scrollToPosition(element: HTMLElement, position: number): void {
    if (!element) {
      console.warn('[AutoScrollService] No element provided for scroll');
      return;
    }

    console.log('[AutoScrollService] Scrolling to position:', position);

    element.scrollTo({
      top: position,
      behavior: this.SCROLL_BEHAVIOR
    });
  }

  /**
   * Scroll by specific amount
   */
  scrollBy(element: HTMLElement, amount: number): void {
    if (!element) {
      console.warn('[AutoScrollService] No element provided for scroll');
      return;
    }

    console.log('[AutoScrollService] Scrolling by amount:', amount);

    element.scrollBy({
      top: amount,
      behavior: this.SCROLL_BEHAVIOR
    });
  }

  /**
   * Jump to message by ID (scroll to specific message)
   */
  jumpToMessage(element: HTMLElement, messageElement: HTMLElement): void {
    if (!element || !messageElement) {
      console.warn('[AutoScrollService] Missing element for jump');
      return;
    }

    console.log('[AutoScrollService] Jumping to message');

    messageElement.scrollIntoView({
      behavior: this.SCROLL_BEHAVIOR,
      block: 'nearest'
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current scroll threshold
   */
  getScrollThreshold(): number {
    return this.SCROLL_THRESHOLD;
  }

  /**
   * Get scroll duration
   */
  getScrollDuration(): number {
    return this.SCROLL_DURATION;
  }

  /**
   * Get current scroll position
   */
  getScrollPosition(): ScrollPosition {
    return this.scrollPosition.getValue();
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Cleanup service
   */
  destroy(): void {
    console.log('[AutoScrollService] Destroying service');
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }
}
