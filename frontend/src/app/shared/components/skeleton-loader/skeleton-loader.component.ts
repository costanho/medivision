/**
 * Skeleton Loader Component
 *
 * Displays animated skeleton loaders (placeholder UI) while content is loading.
 * Better UX than spinners for showing expected layout.
 *
 * Features:
 * - Multiple variants (text, card, avatar, message, list)
 * - Configurable count and spacing
 * - Smooth animated shimmer effect
 * - Responsive design
 * - Dark mode support
 * - Accessible
 *
 * Usage:
 * <app-skeleton-loader [variant]="'message'" [count]="3"></app-skeleton-loader>
 */

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'text' | 'avatar' | 'card' | 'message' | 'list' | 'conversation';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Text Skeleton -->
    <ng-container *ngIf="variant === 'text'">
      <div *ngFor="let i of [].constructor(count)" class="skeleton-text"></div>
    </ng-container>

    <!-- Avatar Skeleton -->
    <ng-container *ngIf="variant === 'avatar'">
      <div *ngFor="let i of [].constructor(count)" class="skeleton-avatar"></div>
    </ng-container>

    <!-- Card Skeleton -->
    <ng-container *ngIf="variant === 'card'">
      <div *ngFor="let i of [].constructor(count)" class="skeleton-card">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line medium"></div>
      </div>
    </ng-container>

    <!-- Message Skeleton -->
    <ng-container *ngIf="variant === 'message'">
      <div *ngFor="let i of [].constructor(count)" class="skeleton-message">
        <div class="skeleton-avatar-sm"></div>
        <div class="skeleton-message-content">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    </ng-container>

    <!-- List Skeleton -->
    <ng-container *ngIf="variant === 'list'">
      <div *ngFor="let i of [].constructor(count)" class="skeleton-list-item">
        <div class="skeleton-avatar-sm"></div>
        <div class="skeleton-list-content">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    </ng-container>

    <!-- Conversation Skeleton -->
    <ng-container *ngIf="variant === 'conversation'">
      <div *ngFor="let i of [].constructor(count)" class="skeleton-conversation">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-conv-content">
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    /* Base Skeleton Animation */
    .skeleton-text,
    .skeleton-avatar,
    .skeleton-card,
    .skeleton-message,
    .skeleton-list-item,
    .skeleton-conversation,
    .skeleton-line,
    .skeleton-avatar-sm {
      background: linear-gradient(
        90deg,
        #f0f0f0 0%,
        #e0e0e0 50%,
        #f0f0f0 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    /* Text Skeleton */
    .skeleton-text {
      height: 16px;
      margin-bottom: 12px;
      width: 100%;

      &:last-child {
        margin-bottom: 0;
      }
    }

    /* Avatar Skeleton */
    .skeleton-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      margin-bottom: 12px;
    }

    .skeleton-avatar-sm {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* Card Skeleton */
    .skeleton-card {
      padding: 16px;
      background: white;
      border-radius: 8px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      .skeleton-line {
        height: 16px;
        margin-bottom: 8px;
        width: 100%;

        &:last-child {
          margin-bottom: 0;
        }

        &.short {
          width: 60%;
        }

        &.medium {
          width: 80%;
        }
      }
    }

    /* Message Skeleton */
    .skeleton-message {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      align-items: flex-start;

      .skeleton-message-content {
        flex: 1;

        .skeleton-line {
          height: 14px;
          margin-bottom: 8px;

          &:last-child {
            margin-bottom: 0;
          }

          &.short {
            width: 70%;
          }
        }
      }
    }

    /* List Item Skeleton */
    .skeleton-list-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      align-items: center;
      border-radius: 8px;
      background: white;

      .skeleton-list-content {
        flex: 1;

        .skeleton-line {
          height: 14px;
          margin-bottom: 8px;

          &:last-child {
            margin-bottom: 0;
          }

          &.short {
            width: 60%;
          }
        }
      }
    }

    /* Conversation Skeleton */
    .skeleton-conversation {
      display: flex;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      align-items: center;

      .skeleton-conv-content {
        flex: 1;

        .skeleton-line {
          height: 16px;
          margin-bottom: 8px;

          &:last-child {
            margin-bottom: 0;
          }

          &.medium {
            width: 70%;
          }
        }
      }
    }

    /* Animation */
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    /* Dark Mode */
    @media (prefers-color-scheme: dark) {
      .skeleton-text,
      .skeleton-avatar,
      .skeleton-line,
      .skeleton-avatar-sm {
        background: linear-gradient(
          90deg,
          #2d2d2d 0%,
          #1d1d1d 50%,
          #2d2d2d 100%
        );
        background-size: 200% 100%;
      }

      .skeleton-card,
      .skeleton-list-item {
        background: #1f2937;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
    }

    /* Responsive */
    @media (max-width: 480px) {
      .skeleton-message,
      .skeleton-list-item,
      .skeleton-conversation {
        gap: 8px;
      }

      .skeleton-card {
        padding: 12px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonLoaderComponent {
  /**
   * Type of skeleton to display
   * @default 'text'
   */
  @Input() variant: SkeletonVariant = 'text';

  /**
   * Number of skeleton items to display
   * @default 3
   */
  @Input() count: number = 3;
}
