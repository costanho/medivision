/**
 * Relative Time Pipe
 *
 * Converts absolute timestamps to human-readable relative time format.
 * Examples:
 * - "Just now" (< 1 minute)
 * - "5 minutes ago"
 * - "2 hours ago"
 * - "3 days ago"
 * - "Jan 15, 2:30 PM" (for older messages)
 *
 * Usage: {{ timestamp | relativeTime }}
 * Usage with format: {{ timestamp | relativeTime: 'short' }}
 */

import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Pipe({
  name: 'relativeTime',
  standalone: true,
  pure: false
})
export class RelativeTimePipe implements PipeTransform, OnDestroy {
  private destroy$ = new Subject<void>();
  private lastValue: Date | string | null = null;
  private lastOutput: string = '';
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  /**
   * Transform a timestamp to relative time format
   *
   * @param value - Date object or ISO string
   * @param format - 'short' (default) or 'long'
   * @returns Relative time string
   *
   * Examples:
   * - Short (default): "5 min ago", "2h ago", "3d ago"
   * - Long: "5 minutes ago", "2 hours ago", "3 days ago"
   */
  transform(value: Date | string | null | undefined, format: 'short' | 'long' = 'short'): string {
    if (!value) {
      return '';
    }

    // Convert string to Date if needed
    const date = typeof value === 'string' ? new Date(value) : value;

    // Validate date
    if (isNaN(date.getTime())) {
      return '';
    }

    // Check if we've already processed this value
    if (this.lastValue === value) {
      return this.lastOutput;
    }

    this.lastValue = value;

    // Calculate relative time
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let output = '';

    // Very recent messages
    if (diffSeconds < 60) {
      output = format === 'short' ? 'now' : 'Just now';
    }
    // Minutes ago
    else if (diffMinutes < 60) {
      const minutes = diffMinutes;
      output =
        format === 'short'
          ? `${minutes}m ago`
          : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    // Hours ago
    else if (diffHours < 24) {
      const hours = diffHours;
      output =
        format === 'short'
          ? `${hours}h ago`
          : `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    // Days ago (within 7 days)
    else if (diffDays < 7) {
      const days = diffDays;
      output =
        format === 'short'
          ? `${days}d ago`
          : `${days} day${days > 1 ? 's' : ''} ago`;
    }
    // Older messages - show date/time
    else {
      output = this.formatFullDate(date, format);
    }

    this.lastOutput = output;

    // Set up interval to update "now" and "just now" messages periodically
    if (diffSeconds < 60 && !this.updateInterval) {
      this.updateInterval = setInterval(() => {
        this.lastValue = null; // Force recomputation
        this.cdr.markForCheck();
      }, 30000); // Update every 30 seconds
    }

    return output;
  }

  /**
   * Format full date for older messages
   *
   * @param date - Date to format
   * @param format - 'short' or 'long'
   * @returns Formatted date string
   *
   * Examples:
   * - Short: "Jan 15, 2:30 PM"
   * - Long: "January 15, 2025, 2:30 PM"
   */
  private formatFullDate(date: Date, format: 'short' | 'long'): string {
    const monthNames =
      format === 'short'
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        : [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
          ];

    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');

    if (format === 'short') {
      return `${month} ${day}, ${displayHours}:${displayMinutes} ${ampm}`;
    } else {
      return `${month} ${day}, ${year}, ${displayHours}:${displayMinutes} ${ampm}`;
    }
  }

  /**
   * Clean up interval on destroy
   */
  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
