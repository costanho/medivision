import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormStateService } from '../services/form-state.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-tab-navigation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tab-navigation">
      <button
        *ngFor="let tab of tabs"
        (click)="selectTab(tab.value)"
        [class.active]="activeTab === tab.value"
        class="tab-button"
        [attr.data-tab]="tab.value">
        <svg *ngIf="tab.icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Icon content will be determined by tab.icon value -->
          <ng-container [ngSwitch]="tab.icon">
            <!-- User icon -->
            <ng-container *ngSwitchCase="'user'">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M6 20c0-2 4-3 6-3s6 1 6 3"></path>
            </ng-container>
            <!-- Plus icon -->
            <ng-container *ngSwitchCase="'plus'">
              <path d="M12 5v14M5 12h14"></path>
            </ng-container>
            <!-- Lock icon -->
            <ng-container *ngSwitchCase="'lock'">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </ng-container>
          </ng-container>
        </svg>
        {{ tab.label }}
      </button>
    </div>
  `,
  styles: [`
    .tab-navigation {
      display: flex;
      gap: 1rem;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 2rem;
      flex-wrap: wrap;

      .tab-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 1.5rem;
        border: none;
        background: transparent;
        color: #666;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        position: relative;
        transition: all 0.3s ease;
        white-space: nowrap;

        svg {
          width: 20px;
          height: 20px;
        }

        &:hover {
          color: #333;
        }

        &.active {
          color: #1890ff;
          border-bottom: 2px solid #1890ff;
          margin-bottom: -1px;

          svg {
            stroke: #1890ff;
          }
        }
      }
    }
  `]
})
export class TabNavigationComponent implements OnInit, OnDestroy {
  @Input() tabs: { label: string; value: string; icon?: string }[] = [
    { label: 'Personal Information', value: 'personal', icon: 'user' },
    { label: 'More Personal Information', value: 'more', icon: 'plus' },
    { label: 'Security & Password', value: 'security', icon: 'lock' }
  ];

  activeTab = '';
  private destroy$ = new Subject<void>();

  constructor(private formStateService: FormStateService) {}

  ngOnInit(): void {
    this.formStateService.activeTab$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tab => {
        this.activeTab = tab;
      });
  }

  selectTab(tab: string): void {
    this.formStateService.selectTab(tab);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
