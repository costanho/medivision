/**
 * Message Date Separator Pipe
 *
 * Formats dates for use as message list separators.
 * Shows relative dates ("Today", "Yesterday") for recent messages
 * and full dates ("Dec 15", "January 20, 2024") for older messages.
 *
 * Usage: {{ timestamp | messageDateSeparator }}
 * Usage with time: {{ timestamp | messageDateSeparator: true }}
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'messageDateSeparator',
  standalone: true
})
export class MessageDateSeparatorPipe implements PipeTransform {
  /**
   * Transform a timestamp to separator format
   *
   * @param value - Date object or ISO string
   * @param includeTime - Whether to include time (default: false)
   * @returns Separator string
   *
   * Examples:
   * - "Today"
   * - "Yesterday"
   * - "Dec 15"
   * - "Jan 20, 2024"
   * - "Today, 2:30 PM" (with time)
   */
  transform(
    value: Date | string | null | undefined,
    includeTime: boolean = false
  ): string {
    if (!value) {
      return '';
    }

    // Convert string to Date if needed
    const date = typeof value === 'string' ? new Date(value) : value;

    // Validate date
    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let dateText = '';

    // Check if message is today
    if (messageDate.getTime() === today.getTime()) {
      dateText = 'Today';
    }
    // Check if message is yesterday
    else if (messageDate.getTime() === yesterday.getTime()) {
      dateText = 'Yesterday';
    }
    // Check if message is within current year
    else if (messageDate.getFullYear() === today.getFullYear()) {
      dateText = this.formatDateWithoutYear(date);
    }
    // Message is from previous year(s)
    else {
      dateText = this.formatDateWithYear(date);
    }

    // Add time if requested
    if (includeTime) {
      const timeStr = this.formatTime(date);
      dateText = `${dateText}, ${timeStr}`;
    }

    return dateText;
  }

  /**
   * Format date without year
   * Example: "Dec 15", "January 20"
   */
  private formatDateWithoutYear(date: Date): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    return `${month} ${day}`;
  }

  /**
   * Format date with year
   * Example: "January 20, 2024", "Dec 15, 2023"
   */
  private formatDateWithYear(date: Date): string {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  /**
   * Format time
   * Example: "2:30 PM", "14:30"
   */
  private formatTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }
}
