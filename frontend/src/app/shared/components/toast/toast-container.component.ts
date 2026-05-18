/**
 * Toast Container Component
 * 
 * Displays toast notifications with:
 * - Multiple types (success, error, warning, info, message)
 * - Auto-dismiss
 * - Manual dismiss
 * - Animations
 * - Dark mode
 * - Responsive positioning
 */

import { Component, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastMessage, NotificationPosition } from '@shared/services/notification.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" [class]="'toast-position-' + (position$ | async)">
      <div
        *ngFor="let toast of (toasts$ | async)"
        [@toastAnimation]
        class="toast"
        [class]="'toast-' + toast.type">
        
        <div class="toast-content">
          <span class="toast-icon">{{ getIcon(toast.type) }}</span>
          
          <div class="toast-text">
            <h3 *ngIf="toast.title" class="toast-title">{{ toast.title }}</h3>
            <p class="toast-message">{{ toast.message }}</p>
          </div>
        </div>

        <button
          *ngIf="toast.dismissible"
          (click)="dismiss(toast.id)"
          class="toast-close"
          aria-label="Dismiss notification">
          ✕
        </button>

        <div class="toast-progress" [style.animation-duration.ms]="toast.duration"></div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 400px;
    }

    .toast-position-top-right {
      top: 0;
      right: 0;
    }

    .toast-position-top-left {
      top: 0;
      left: 0;
    }

    .toast-position-bottom-right {
      bottom: 0;
      right: 0;
    }

    .toast-position-bottom-left {
      bottom: 0;
      left: 0;
    }

    .toast-position-top-center {
      top: 0;
      left: 50%;
      transform: translateX(-50%);
    }

    .toast-position-bottom-center {
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      position: relative;
      overflow: hidden;
      animation: slideIn 0.3s ease;
    }

    .toast.toast-success {
      border-left: 4px solid #10b981;
      background: #f0fdf4;
    }

    .toast.toast-error {
      border-left: 4px solid #ef4444;
      background: #fef2f2;
    }

    .toast.toast-warning {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
    }

    .toast.toast-info {
      border-left: 4px solid #3b82f6;
      background: #eff6ff;
    }

    .toast.toast-message {
      border-left: 4px solid #667eea;
      background: #f5f3ff;
    }

    .toast-content {
      display: flex;
      gap: 0.75rem;
      flex: 1;
      align-items: flex-start;
    }

    .toast-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .toast-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .toast-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1f2937;
    }

    .toast-message {
      margin: 0;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .toast-close {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0;
      flex-shrink: 0;
      transition: color 0.2s;
    }

    .toast-close:hover {
      color: #6b7280;
    }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: currentColor;
      animation: shrink linear forwards;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes shrink {
      from {
        width: 100%;
      }
      to {
        width: 0;
      }
    }

    @media (prefers-color-scheme: dark) {
      .toast {
        background: #1f2937;
      }

      .toast.toast-success {
        background: #064e3b;
      }

      .toast.toast-error {
        background: #7f1d1d;
      }

      .toast.toast-warning {
        background: #78350f;
      }

      .toast.toast-info {
        background: #0c2d48;
      }

      .toast.toast-message {
        background: #312e81;
      }

      .toast-title {
        color: #f3f4f6;
      }

      .toast-message {
        color: #d1d5db;
      }
    }

    @media (max-width: 480px) {
      .toast-container {
        max-width: 100%;
        padding: 0.5rem;
      }

      .toast {
        padding: 0.75rem;
        gap: 0.5rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts$: Observable<ToastMessage[]>;
  position$: Observable<NotificationPosition>;

  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {
    this.toasts$ = this.notificationService.getAllToasts$();
    this.position$ = new Observable(observer => {
      this.notificationService.getSettings$()
        .pipe(takeUntil(this.destroy$))
        .subscribe(settings => {
          observer.next(settings.toastPosition);
        });
    });
  }

  ngOnInit() {
    // Component is ready
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      message: '💬'
    };
    return icons[type] || '•';
  }

  dismiss(id: string) {
    this.notificationService.removeToast(id);
  }
}
