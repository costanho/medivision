import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Activity {
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  type: 'success' | 'info' | 'warning' | 'danger';
}

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-section">
      <div class="section-header">
        <h2>Recent Activity</h2>
        <button class="btn-view-all" (click)="viewAll.emit()">
          View All <i class="fas fa-arrow-right"></i>
        </button>
      </div>

      <div class="activity-list">
        <div class="activity-item" *ngFor="let activity of activities" [class]="activity.type">
          <div class="activity-icon" [class]="activity.type">
            <i class="fas" [ngClass]="activity.icon"></i>
          </div>
          <div class="activity-content">
            <h4>{{ activity.title }}</h4>
            <p>{{ activity.description }}</p>
            <span class="activity-time">{{ activity.timestamp }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    // System Color Variables
    $primary: #667eea;
    $primary-dark: #764ba2;
    $success: #10b981;
    $danger: #ef4444;
    $warning: #f59e0b;
    $info: #3b82f6;
    $bg-white: #fff;
    $bg-lighter: #fafbfc;
    $text-dark: #1a1a1a;
    $text-light: #666;

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

        .btn-view-all {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, $primary 0%, $primary-dark 100%);
          color: $bg-white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba($primary, 0.4);
          }

          i {
            font-size: 12px;
          }

          @media (max-width: 480px) {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      }
    }

    // Activity List
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .activity-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: $bg-lighter;
        border-radius: 8px;
        border-left: 4px solid transparent;
        transition: all 0.3s ease;

        &:hover {
          background: darken($bg-lighter, 2%);
          transform: translateX(4px);
        }

        &.success {
          border-left-color: $success;
        }

        &.info {
          border-left-color: $info;
        }

        &.warning {
          border-left-color: $warning;
        }

        &.danger {
          border-left-color: $danger;
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          i {
            font-size: 16px;
            color: $bg-white;
          }

          &.success {
            background: $success;
          }

          &.info {
            background: $info;
          }

          &.warning {
            background: $warning;
          }

          &.danger {
            background: $danger;
          }
        }

        .activity-content {
          flex: 1;
          min-width: 0;

          h4 {
            font-size: 14px;
            font-weight: 600;
            color: $text-dark;
            margin: 0 0 4px 0;
          }

          p {
            font-size: 13px;
            color: $text-light;
            margin: 0 0 6px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .activity-time {
            font-size: 11px;
            color: $text-light;
            font-style: italic;
          }
        }
      }
    }
  `]
})
export class RecentActivityComponent {
  @Input() activities: Activity[] = [];
  @Output() viewAll = new EventEmitter<void>();
}
