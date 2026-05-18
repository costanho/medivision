import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValidationError } from '@shared/services/validation.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-inline-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-container" *ngIf="errors && errors.length > 0" [@slideDown]>
      <!-- Single error -->
      <div
        *ngIf="errors.length === 1"
        class="error-message"
        [class]="'error-' + errors[0].severity"
        role="alert"
        aria-live="polite"
      >
        <div class="error-icon">
          <span *ngIf="errors[0].severity === 'error'" class="icon">✕</span>
          <span *ngIf="errors[0].severity === 'warning'" class="icon">⚠</span>
          <span *ngIf="errors[0].severity === 'info'" class="icon">ℹ</span>
        </div>
        <div class="error-content">
          <p class="error-text">{{ errors[0].message }}</p>
          <p class="error-code" *ngIf="showCode">{{ errors[0].code }}</p>
        </div>
        <button
          *ngIf="dismissible"
          class="error-close"
          type="button"
          (click)="dismiss()"
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>

      <!-- Multiple errors -->
      <div *ngIf="errors.length > 1" class="errors-list" role="alert" aria-live="polite">
        <div class="error-count">
          <span class="icon">✕</span>
          <span class="count-text">{{ errors.length }} error{{ errors.length !== 1 ? 's' : '' }} found</span>
        </div>
        <ul class="error-items">
          <li *ngFor="let error of errors; let i = index" class="error-item" [class]="'error-' + error.severity">
            <span class="item-icon">
              <span *ngIf="error.severity === 'error'">✕</span>
              <span *ngIf="error.severity === 'warning'">⚠</span>
              <span *ngIf="error.severity === 'info'">ℹ</span>
            </span>
            <span class="item-text">{{ error.message }}</span>
            <span class="item-code" *ngIf="showCode">({{ error.code }})</span>
          </li>
        </ul>
        <button
          *ngIf="dismissible"
          class="error-close-all"
          type="button"
          (click)="dismiss()"
          aria-label="Dismiss all errors"
        >
          Dismiss all
        </button>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      margin-bottom: 16px;
      border-radius: 6px;
      overflow: hidden;
    }

    .error-message {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-left: 4px solid;
      background-color: rgba(255, 255, 255, 0.05);
    }

    .error-message.error-error {
      border-left-color: #ef4444;
      background-color: rgba(239, 68, 68, 0.1);
    }

    .error-message.error-warning {
      border-left-color: #f59e0b;
      background-color: rgba(245, 158, 11, 0.1);
    }

    .error-message.error-info {
      border-left-color: #3b82f6;
      background-color: rgba(59, 130, 246, 0.1);
    }

    .error-icon {
      flex-shrink: 0;
      font-size: 18px;
      font-weight: bold;
      margin-top: 2px;
    }

    .error-message.error-error .error-icon {
      color: #ef4444;
    }

    .error-message.error-warning .error-icon {
      color: #f59e0b;
    }

    .error-message.error-info .error-icon {
      color: #3b82f6;
    }

    .error-content {
      flex: 1;
      min-width: 0;
    }

    .error-text {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #1f2937;
      word-break: break-word;
    }

    .error-code {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #6b7280;
      font-family: monospace;
    }

    .error-close {
      flex-shrink: 0;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      transition: color 0.2s;
    }

    .error-close:hover {
      color: #1f2937;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .error-message {
        background-color: rgba(255, 255, 255, 0.05);
      }

      .error-message.error-error {
        background-color: rgba(239, 68, 68, 0.15);
      }

      .error-message.error-warning {
        background-color: rgba(245, 158, 11, 0.15);
      }

      .error-message.error-info {
        background-color: rgba(59, 130, 246, 0.15);
      }

      .error-text {
        color: #f3f4f6;
      }

      .error-code {
        color: #9ca3af;
      }

      .error-close {
        color: #9ca3af;
      }

      .error-close:hover {
        color: #f3f4f6;
      }
    }

    /* Multiple errors list */
    .errors-list {
      padding: 12px 16px;
      border-left: 4px solid #ef4444;
      background-color: rgba(239, 68, 68, 0.1);
    }

    .error-count {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-weight: 500;
      color: #1f2937;
    }

    .error-count .icon {
      color: #ef4444;
      font-size: 16px;
    }

    .error-items {
      list-style: none;
      padding: 0;
      margin: 0 0 12px 0;
    }

    .error-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px;
      margin: 0;
      font-size: 14px;
      border-radius: 4px;
      margin-bottom: 4px;
    }

    .error-item:last-child {
      margin-bottom: 0;
    }

    .error-item.error-error {
      background-color: rgba(239, 68, 68, 0.1);
      color: #7f1d1d;
    }

    .error-item.error-warning {
      background-color: rgba(245, 158, 11, 0.1);
      color: #78350f;
    }

    .error-item.error-info {
      background-color: rgba(59, 130, 246, 0.1);
      color: #1e3a8a;
    }

    .item-icon {
      flex-shrink: 0;
      font-weight: bold;
      font-size: 14px;
    }

    .error-item.error-error .item-icon {
      color: #ef4444;
    }

    .error-item.error-warning .item-icon {
      color: #f59e0b;
    }

    .error-item.error-info .item-icon {
      color: #3b82f6;
    }

    .item-text {
      flex: 1;
      min-width: 0;
      word-break: break-word;
    }

    .item-code {
      flex-shrink: 0;
      font-family: monospace;
      font-size: 12px;
      opacity: 0.7;
      margin-left: 8px;
    }

    .error-close-all {
      width: 100%;
      padding: 8px;
      background-color: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 4px;
      color: #1f2937;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .error-close-all:hover {
      background-color: rgba(239, 68, 68, 0.3);
    }

    @media (prefers-color-scheme: dark) {
      .error-count {
        color: #f3f4f6;
      }

      .error-item.error-error {
        color: #fecaca;
      }

      .error-item.error-warning {
        color: #fcd34d;
      }

      .error-item.error-info {
        color: #93c5fd;
      }

      .error-close-all {
        background-color: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.3);
        color: #f3f4f6;
      }

      .error-close-all:hover {
        background-color: rgba(239, 68, 68, 0.3);
      }
    }
  `],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineErrorComponent implements OnInit {
  @Input() errors: ValidationError[] | null = null;
  @Input() dismissible = true;
  @Input() showCode = false;
  @Output() dismissed = new EventEmitter<void>();

  ngOnInit(): void {
    // Auto-dismiss after 5 seconds if set
    if (this.errors && this.errors.length > 0 && this.dismissible) {
      // Could add auto-dismiss logic here
    }
  }

  dismiss(): void {
    this.errors = null;
    this.dismissed.emit();
  }
}
