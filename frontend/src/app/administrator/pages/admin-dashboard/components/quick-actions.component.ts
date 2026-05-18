import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface QuickAction {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-section">
      <div class="section-header">
        <h2>Quick Actions</h2>
      </div>

      <div class="quick-actions-grid">
        <button class="quick-action-btn" *ngFor="let action of actions" (click)="actionClick.emit(action.route)">
          <i class="fas" [ngClass]="action.icon"></i>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    // System Color Variables
    $primary: #667eea;
    $primary-dark: #764ba2;
    $bg-white: #fff;
    $text-main: #333;
    $border: #e0e0e0;

    // Content Section
    .content-section {
      background: $bg-white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border-top: 4px solid $primary;

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        padding-left: 20px;
        border-bottom: 3px solid transparent;
        background: linear-gradient(to right, $bg-white, $bg-white) padding-box,
                    linear-gradient(135deg, $primary 0%, $primary-dark 100%) border-box;
        border-image: linear-gradient(135deg, $primary 0%, $primary-dark 100%) 1;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          width: 80px;
          height: 3px;
          background: linear-gradient(135deg, $primary 0%, $primary-dark 100%);
          border-radius: 2px;
        }

        h2 {
          font-size: 22px;
          font-weight: 700;
          background: linear-gradient(135deg, $primary 0%, $primary-dark 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          position: relative;

          &::before {
            content: '';
            position: absolute;
            left: -16px;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 24px;
            background: linear-gradient(135deg, $primary 0%, $primary-dark 100%);
            border-radius: 2px;
          }

          @media (max-width: 480px) {
            font-size: 18px;

            &::before {
              left: -12px;
              height: 20px;
              width: 3px;
            }
          }
        }

        @media (max-width: 480px) {
          padding-left: 16px;
        }
      }
    }

    // Quick Actions Grid
    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;

      @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }

      .quick-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 20px;
        background: linear-gradient(135deg, rgba($primary, 0.05) 0%, rgba($primary-dark, 0.05) 100%);
        border: 2px solid $border;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 600;
        font-size: 14px;
        color: $text-main;

        @media (max-width: 768px) {
          padding: 16px;
          font-size: 13px;
          gap: 8px;
        }

        i {
          font-size: 28px;
          color: $primary;
          transition: all 0.3s ease;

          @media (max-width: 768px) {
            font-size: 24px;
          }
        }

        span {
          text-align: center;
        }

        &:hover {
          background: linear-gradient(135deg, $primary 0%, $primary-dark 100%);
          color: $bg-white;
          border-color: transparent;
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba($primary, 0.3);

          i {
            color: $bg-white;
            transform: scale(1.1);
          }
        }
      }
    }
  `]
})
export class QuickActionsComponent {
  @Input() actions: QuickAction[] = [];
  @Output() actionClick = new EventEmitter<string>();
}
