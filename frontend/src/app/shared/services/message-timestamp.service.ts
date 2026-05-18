/**
 * Message Timestamp Service
 *
 * Service for managing message timestamps, including:
 * - Grouping messages by date separators
 * - Determining when to show separators
 * - Formatting timestamps for display
 * - Calculating relative time
 */

import { Injectable } from '@angular/core';

/**
 * Message with timestamp metadata
 */
export interface MessageWithTimestamp {
  id: string | number;
  content: string;
  senderId: string | number;
  timestamp: Date | string;
  showTimestamp?: boolean;
  showSeparator?: boolean;
  separatorText?: string;
  [key: string]: any;
}

/**
 * Grouped messages by date
 */
export interface MessageGroup {
  date: Date;
  separatorText: string;
  messages: MessageWithTimestamp[];
}

@Injectable({
  providedIn: 'root'
})
export class MessageTimestampService {
  /**
   * Group messages by date for separator display
   *
   * @param messages - Array of messages with timestamps
   * @param previousMessages - Optional array of previous messages (to check last date)
   * @returns Messages with separator metadata added
   */
  groupMessagesByDate(
    messages: MessageWithTimestamp[],
    previousMessages?: MessageWithTimestamp[]
  ): MessageWithTimestamp[] {
    if (messages.length === 0) {
      return [];
    }

    const processedMessages = [...messages];
    let lastMessageDate: Date | null = null;

    // Get last date from previous messages if provided
    if (previousMessages && previousMessages.length > 0) {
      const lastPrevMsg = previousMessages[previousMessages.length - 1];
      lastMessageDate = this.getMessageDate(lastPrevMsg.timestamp);
    }

    // Add separator metadata to messages
    for (let i = 0; i < processedMessages.length; i++) {
      const message = processedMessages[i];
      const messageDate = this.getMessageDate(message.timestamp);

      // Check if we need to show a separator
      if (lastMessageDate === null || !this.isSameDay(messageDate, lastMessageDate)) {
        message.showSeparator = true;
        message.separatorText = this.formatDateSeparator(messageDate);
      } else {
        message.showSeparator = false;
      }

      // Determine if timestamp should be shown
      message.showTimestamp = this.shouldShowTimestamp(message, i, processedMessages);

      lastMessageDate = messageDate;
    }

    return processedMessages;
  }

  /**
   * Create message groups for alternate display layout
   *
   * @param messages - Array of messages
   * @returns Grouped messages by date
   */
  createMessageGroups(messages: MessageWithTimestamp[]): MessageGroup[] {
    const groups: Map<string, MessageGroup> = new Map();

    for (const message of messages) {
      const messageDate = this.getMessageDate(message.timestamp);
      const dateKey = this.getDateKey(messageDate);

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: messageDate,
          separatorText: this.formatDateSeparator(messageDate),
          messages: []
        });
      }

      groups.get(dateKey)!.messages.push(message);
    }

    // Return groups sorted by date (oldest first)
    return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Determine if timestamp should be shown on a message
   *
   * Show timestamp if:
   * - It's the first message
   * - It's the last message
   * - More than 5 minutes have passed since the previous message
   * - The sender changed from the previous message
   * - There's a date separator above this message
   *
   * @param message - Current message
   * @param index - Index in array
   * @param messages - All messages
   * @returns Whether to show timestamp
   */
  private shouldShowTimestamp(
    message: MessageWithTimestamp,
    index: number,
    messages: MessageWithTimestamp[]
  ): boolean {
    // Always show for first message
    if (index === 0) {
      return true;
    }

    // Always show for last message
    if (index === messages.length - 1) {
      return true;
    }

    // Show if date separator shown
    if (message.showSeparator) {
      return true;
    }

    // Get previous and next messages
    const prevMessage = messages[index - 1];
    const nextMessage = messages[index + 1];

    // Show if sender changed
    if (prevMessage && message.senderId !== prevMessage.senderId) {
      return true;
    }

    // Show if more than 5 minutes from previous message
    const prevTime = typeof prevMessage.timestamp === 'string' ? new Date(prevMessage.timestamp).getTime() : prevMessage.timestamp.getTime();
    const currTime = typeof message.timestamp === 'string' ? new Date(message.timestamp).getTime() : message.timestamp.getTime();
    const timeDiffMinutes = (currTime - prevTime) / (1000 * 60);

    if (timeDiffMinutes > 5) {
      return true;
    }

    // Show if next message is from different sender
    if (nextMessage && nextMessage.senderId !== message.senderId) {
      return true;
    }

    return false;
  }

  /**
   * Format a date for use as a separator
   *
   * Returns:
   * - "Today"
   * - "Yesterday"
   * - "Dec 15" (current year)
   * - "January 20, 2024" (different year)
   *
   * @param date - Date to format
   * @returns Formatted separator text
   */
  formatDateSeparator(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Today
    if (messageDate.getTime() === today.getTime()) {
      return 'Today';
    }

    // Yesterday
    if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    // Current year
    if (date.getFullYear() === now.getFullYear()) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    }

    // Previous year
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  /**
   * Format timestamp for display on message
   *
   * Returns:
   * - "5m ago" or "5 minutes ago"
   * - "2h ago" or "2 hours ago"
   * - "3d ago" or "3 days ago"
   * - "Jan 15, 2:30 PM" (for older messages)
   *
   * @param timestamp - Timestamp to format
   * @param format - 'short' or 'long'
   * @returns Formatted timestamp string
   */
  formatTimestamp(timestamp: Date | string, format: 'short' | 'long' = 'short'): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Very recent
    if (diffSeconds < 60) {
      return format === 'short' ? 'now' : 'Just now';
    }

    // Minutes
    if (diffMinutes < 60) {
      return format === 'short' ? `${diffMinutes}m ago` : `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }

    // Hours
    if (diffHours < 24) {
      return format === 'short' ? `${diffHours}h ago` : `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }

    // Days (within 7 days)
    if (diffDays < 7) {
      return format === 'short' ? `${diffDays}d ago` : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    // Full date
    return this.formatFullDate(date, format);
  }

  /**
   * Get just the date part of a timestamp (ignoring time)
   *
   * @param timestamp - Timestamp
   * @returns Date object with time set to 00:00:00
   */
  getMessageDate(timestamp: Date | string): Date {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Get the full timestamp
   *
   * @param timestamp - Timestamp
   * @returns Full Date object
   */
  getMessageTime(timestamp: Date | string): Date {
    return typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  }

  /**
   * Check if two dates are the same day
   *
   * @param date1 - First date
   * @param date2 - Second date
   * @returns Whether dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Get a unique key for a date
   *
   * @param date - Date
   * @returns String key in format "YYYY-MM-DD"
   */
  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format full date with time
   *
   * @param date - Date to format
   * @param format - 'short' or 'long'
   * @returns Formatted date string
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
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');

    if (format === 'short') {
      return `${month} ${day}, ${displayHours}:${displayMinutes} ${ampm}`;
    } else {
      const year = date.getFullYear();
      return `${month} ${day}, ${year}, ${displayHours}:${displayMinutes} ${ampm}`;
    }
  }
}
