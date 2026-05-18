/**
 * Message Timestamp Component
 *
 * Displays a timestamp for a message with smart formatting:
 * - Shows relative time for recent messages ("5 minutes ago")
 * - Shows full date/time for older messages ("Dec 15, 2:30 PM")
 * - Optionally displays tooltip with full timestamp
 * - Responsive to container size
 *
 * Usage:
 * <app-message-timestamp [timestamp]="message.timestamp" [format]="'short'"></app-message-timestamp>
 */

import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';

@Component({
  selector: 'app-message-timestamp',
  standalone: true,
  imports: [CommonModule, RelativeTimePipe],
  template: `
    <div class="message-timestamp" [attr.title]="fullTimestamp">
      <time [attr.datetime]="isoTimestamp">
        {{ timestamp | relativeTime: format }}
      </time>
    </div>
  `,
  styles: [`
    .message-timestamp {
      font-size: 12px;
      color: #9ca3af;
      cursor: help;
      transition: color 0.2s ease;

      &:hover {
        color: #6b7280;
      }

      time {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        letter-spacing: 0.5px;
      }
    }

    @media (max-width: 480px) {
      .message-timestamp {
        font-size: 11px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageTimestampComponent implements OnInit {
  @Input() timestamp: Date | string | null = null;
  @Input() format: 'short' | 'long' = 'short';

  fullTimestamp: string = '';
  isoTimestamp: string = '';

  ngOnInit(): void {
    if (this.timestamp) {
      const date = typeof this.timestamp === 'string' ? new Date(this.timestamp) : this.timestamp;

      if (!isNaN(date.getTime())) {
        this.isoTimestamp = date.toISOString();
        this.fullTimestamp = this.formatFullTimestamp(date);
      }
    }
  }

  /**
   * Format full timestamp for tooltip
   */
  private formatFullTimestamp(date: Date): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayName = dayNames[date.getDay()];
    const monthName = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${dayName}, ${monthName} ${day}, ${year} at ${hours}:${minutes}:${seconds}`;
  }
}
