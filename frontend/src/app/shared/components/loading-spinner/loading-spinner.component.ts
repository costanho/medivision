/**
 * Loading Spinner Component
 *
 * Displays an animated loading spinner with optional text and size variants.
 *
 * Features:
 * - Multiple size variants (sm, md, lg, xl)
 * - Optional loading text below spinner
 * - Custom spinner color
 * - Smooth fade in/out animations
 * - Accessible (role="status", aria-live)
 * - Dark mode support
 *
 * Usage:
 * <app-loading-spinner></app-loading-spinner>
 * <app-loading-spinner [size]="'lg'" [text]="'Loading messages...'"></app-loading-spinner>
 */

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'secondary' | 'success' | 'error' | 'warn';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spinner-container"
         [attr.aria-busy]="true"
         [attr.role]="'status'"
         [attr.aria-live]="'polite'"
         [class]="'size-' + size + ' color-' + color">

      <!-- Main Spinner -->
      <div class="spinner" [class]="'spinner-' + size"></div>

      <!-- Loading Text -->
      <p *ngIf="text" class="spinner-text">{{ text }}</p>

      <!-- Subtext -->
      <p *ngIf="subtext" class="spinner-subtext">{{ subtext }}</p>
    </div>
  `,
  styles: [`
    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      animation: fadeIn 0.3s ease-out;
    }

    /* Spinner Sizes */
    .spinner {
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-sm {
      width: 24px;
      height: 24px;
    }

    .spinner-md {
      width: 40px;
      height: 40px;
    }

    .spinner-lg {
      width: 56px;
      height: 56px;
    }

    .spinner-xl {
      width: 80px;
      height: 80px;
    }

    /* Spinner Colors */
    .color-primary .spinner {
      border-top-color: #667eea;
    }

    .color-secondary .spinner {
      border-top-color: #6366f1;
    }

    .color-success .spinner {
      border-top-color: #10b981;
    }

    .color-error .spinner {
      border-top-color: #ef4444;
    }

    .color-warn .spinner {
      border-top-color: #f59e0b;
    }

    /* Text */
    .spinner-text {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      text-align: center;
    }

    .spinner-subtext {
      margin: 0;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }

    /* Animations */
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Dark Mode */
    @media (prefers-color-scheme: dark) {
      .spinner {
        border-color: rgba(255, 255, 255, 0.1);
      }

      .spinner-text {
        color: #e5e7eb;
      }

      .spinner-subtext {
        color: #9ca3af;
      }

      .color-primary .spinner {
        border-top-color: #818cf8;
      }

      .color-secondary .spinner {
        border-top-color: #a5b4fc;
      }

      .color-success .spinner {
        border-top-color: #6ee7b7;
      }

      .color-error .spinner {
        border-top-color: #fca5a5;
      }

      .color-warn .spinner {
        border-top-color: #fcd34d;
      }
    }

    /* Responsive */
    @media (max-width: 480px) {
      .spinner-container {
        gap: 8px;
      }

      .spinner-text {
        font-size: 13px;
      }

      .spinner-subtext {
        font-size: 11px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSpinnerComponent {
  /**
   * Size of the spinner
   * @default 'md'
   */
  @Input() size: SpinnerSize = 'md';

  /**
   * Color variant of the spinner
   * @default 'primary'
   */
  @Input() color: SpinnerColor = 'primary';

  /**
   * Main text to display below spinner
   * @default ''
   */
  @Input() text: string = '';

  /**
   * Subtext to display below main text
   * @default ''
   */
  @Input() subtext: string = '';
}
