import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
  change: string;
}

@Component({
  selector: 'app-stats-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-grid">
      <div class="stat-card" *ngFor="let stat of stats">
        <div class="stat-icon" [style.background-color]="stat.color">
          <i class="fas" [ngClass]="stat.icon"></i>
        </div>
        <div class="stat-content">
          <h3 class="stat-value">{{ stat.value }}</h3>
          <p class="stat-label">{{ stat.label }}</p>
          <span class="stat-change" [class.positive]="stat.change.includes('+')">
            {{ stat.change }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    // System Color Variables
    $primary: #667eea;
    $success: #10b981;
    $bg-white: #fff;
    $bg-light: #f8f9fa;
    $text-dark: #1a1a1a;
    $text-light: #666;

    // Stats Grid
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;

      @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }

      .stat-card {
        background: $bg-white;
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        border-top: 3px solid $primary;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }

        @media (max-width: 768px) {
          padding: 16px;
          gap: 12px;
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          @media (max-width: 768px) {
            width: 48px;
            height: 48px;
          }

          i {
            font-size: 24px;
            color: $bg-white;

            @media (max-width: 768px) {
              font-size: 20px;
            }
          }
        }

        .stat-content {
          flex: 1;
          min-width: 0;

          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: $text-dark;
            margin: 0 0 4px 0;
            line-height: 1;

            @media (max-width: 768px) {
              font-size: 20px;
            }
          }

          .stat-label {
            font-size: 13px;
            color: $text-light;
            margin: 0 0 6px 0;

            @media (max-width: 768px) {
              font-size: 12px;
            }
          }

          .stat-change {
            font-size: 11px;
            font-weight: 600;
            padding: 3px 6px;
            border-radius: 4px;
            background: $bg-light;
            color: $text-light;
            display: inline-block;

            @media (max-width: 768px) {
              font-size: 10px;
              padding: 2px 5px;
            }

            &.positive {
              background: rgba($success, 0.1);
              color: $success;
            }
          }
        }
      }
    }
  `]
})
export class StatsGridComponent {
  @Input() stats: StatCard[] = [];
}
