/**
 * Message Date Separator Component
 *
 * Displays a visual separator between message groups by date.
 * Shows:
 * - "Today"
 * - "Yesterday"
 * - "Dec 15" (current year)
 * - "January 20, 2024" (different year)
 *
 * Usage:
 * <app-message-date-separator [timestamp]="groupDate" [includeTime]="false"></app-message-date-separator>
 */

import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageDateSeparatorPipe } from '../../pipes/message-date-separator.pipe';

@Component({
  selector: 'app-message-date-separator',
  standalone: true,
  imports: [CommonModule, MessageDateSeparatorPipe],
  template: `
    <div class="message-date-separator">
      <div class="separator-line"></div>
      <div class="separator-text">
        {{ timestamp | messageDateSeparator: includeTime }}
      </div>
      <div class="separator-line"></div>
    </div>
  `,
  styles: [`
    .message-date-separator {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0;
      padding: 0 16px;

      .separator-line {
        flex: 1;
        height: 1px;
        background: linear-gradient(
          to right,
          transparent,
          #d1d5db,
          transparent
        );
      }

      .separator-text {
        font-size: 13px;
        font-weight: 500;
        color: #6b7280;
        white-space: nowrap;
        padding: 0 8px;
        background: white;
        position: relative;
        z-index: 1;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .message-date-separator {
        .separator-line {
          background: linear-gradient(
            to right,
            transparent,
            #4b5563,
            transparent
          );
        }

        .separator-text {
          color: #9ca3af;
          background: #1f2937;
        }
      }
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .message-date-separator {
        gap: 8px;
        margin: 12px 0;
        padding: 0 12px;

        .separator-text {
          font-size: 12px;
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageDateSeparatorComponent implements OnInit {
  @Input() timestamp: Date | string | null = null;
  @Input() includeTime: boolean = false;

  ngOnInit(): void {
    if (!this.timestamp) {
      console.warn('MessageDateSeparatorComponent: timestamp input is required');
    }
  }
}
