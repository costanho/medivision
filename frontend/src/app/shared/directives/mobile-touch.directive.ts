import { Directive, HostListener, Output, EventEmitter, Input } from '@angular/core';

/**
 * Mobile Touch Gesture Directive
 * ============================================================================
 * Provides mobile-friendly touch gesture detection for common interactions:
 * - Tap/Click
 * - Double-tap
 * - Long-press
 * - Swipe (left, right, up, down)
 * - Pinch zoom
 *
 * Usage:
 * <button appMobileTouch (tap)="onTap()" (doubleTap)="onDoubleTap()">Touch me</button>
 */

@Directive({
  selector: '[appMobileTouch]',
  standalone: true
})
export class MobileTouchDirective {
  // Touch event outputs
  @Output() tap = new EventEmitter<TouchEvent>();
  @Output() doubleTap = new EventEmitter<TouchEvent>();
  @Output() longPress = new EventEmitter<TouchEvent>();
  @Output() swipeLeft = new EventEmitter<TouchEvent>();
  @Output() swipeRight = new EventEmitter<TouchEvent>();
  @Output() swipeUp = new EventEmitter<TouchEvent>();
  @Output() swipeDown = new EventEmitter<TouchEvent>();
  @Output() pinchZoom = new EventEmitter<number>();

  // Configuration
  @Input() doubleTapThreshold = 300; // milliseconds
  @Input() longPressThreshold = 500; // milliseconds
  @Input() swipeThreshold = 50; // minimum pixels to register swipe

  // Internal state
  private lastTouchEnd = 0;
  private lastTouchStart = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private longPressTimer: any;
  private initialDistance = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.lastTouchStart = Date.now();

    // Handle pinch zoom (two fingers)
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      this.initialDistance = Math.sqrt(dx * dx + dy * dy);
    }

    // Start long-press timer
    this.longPressTimer = setTimeout(() => {
      this.longPress.emit(event);
    }, this.longPressThreshold);
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    clearTimeout(this.longPressTimer);

    const now = Date.now();
    const timeDiff = now - this.lastTouchEnd;

    // Check for double-tap
    if (timeDiff < this.doubleTapThreshold && timeDiff > 0) {
      this.doubleTap.emit(event);
    } else {
      // Single tap
      this.tap.emit(event);
    }

    this.lastTouchEnd = now;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    // Clear long-press timer if user moves
    clearTimeout(this.longPressTimer);

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;

      // Detect swipe gestures
      if (Math.abs(deltaX) > this.swipeThreshold) {
        if (deltaX > 0) {
          this.swipeRight.emit(event);
        } else {
          this.swipeLeft.emit(event);
        }
      }

      if (Math.abs(deltaY) > this.swipeThreshold) {
        if (deltaY > 0) {
          this.swipeDown.emit(event);
        } else {
          this.swipeUp.emit(event);
        }
      }
    }

    // Handle pinch zoom (two fingers)
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance / this.initialDistance;

      this.pinchZoom.emit(scale);
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    // Emit tap event for non-touch devices
    this.tap.emit(event as any);
  }
}
