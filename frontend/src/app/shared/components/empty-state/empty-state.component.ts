/**
 * Empty State Component
 * 
 * Displays user-friendly messages when no data is available
 * Features:
 * - Multiple variants (conversations, messages, search, error, network)
 * - Customizable icon, title, and description
 * - Action buttons for user engagement
 * - Dark mode support
 * - Mobile responsive
 * - Accessibility features (ARIA labels, semantic HTML)
 */

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EmptyStateVariant = 'conversations' | 'messages' | 'search' | 'error' | 'network' | 'custom';

export interface EmptyStateAction {
  label: string;
  icon?: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  /**
   * Empty state variant type
   */
  @Input() variant: EmptyStateVariant = 'custom';

  /**
   * Custom title text (overrides variant default)
   */
  @Input() title: string = '';

  /**
   * Custom description text (overrides variant default)
   */
  @Input() description: string = '';

  /**
   * Icon name/emoji to display
   */
  @Input() icon: string = '';

  /**
   * Size of the component (sm, md, lg)
   */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  /**
   * Action buttons
   */
  @Input() actions: EmptyStateAction[] = [];

  /**
   * Show decorative elements
   */
  @Input() showDecorations: boolean = true;

  /**
   * Emit when action is clicked
   */
  @Output() actionClick = new EventEmitter<void>();

  /**
   * Default configurations for each variant
   */
  private variantDefaults = {
    conversations: {
      icon: '💬',
      title: 'No Conversations Yet',
      description: 'Start a new conversation by selecting a doctor or specialist from the directory.',
      actionText: 'Browse Doctors'
    },
    messages: {
      icon: '📭',
      title: 'Start a Conversation',
      description: 'Send your first message to begin chatting. Ask questions, share concerns, or book an appointment.',
      actionText: 'Send First Message'
    },
    search: {
      icon: '🔍',
      title: 'No Results Found',
      description: 'Try different search terms or filters to find what you\'re looking for.',
      actionText: 'Clear Filters'
    },
    error: {
      icon: '⚠️',
      title: 'Something Went Wrong',
      description: 'An error occurred while loading your data. Please try again.',
      actionText: 'Retry'
    },
    network: {
      icon: '📡',
      title: 'No Connection',
      description: 'Check your internet connection and try again.',
      actionText: 'Retry'
    },
    custom: {
      icon: '📄',
      title: 'No Data',
      description: 'No data available at this time.',
      actionText: 'OK'
    }
  };

  /**
   * Get display title
   */
  get displayTitle(): string {
    return this.title || this.variantDefaults[this.variant].title;
  }

  /**
   * Get display description
   */
  get displayDescription(): string {
    return this.description || this.variantDefaults[this.variant].description;
  }

  /**
   * Get display icon
   */
  get displayIcon(): string {
    return this.icon || this.variantDefaults[this.variant].icon;
  }

  /**
   * Check if size is small
   */
  get isSizeSmall(): boolean {
    return this.size === 'sm';
  }

  /**
   * Check if size is large
   */
  get isSizeLarge(): boolean {
    return this.size === 'lg';
  }

  /**
   * Handle action button click
   */
  onActionClick(action: EmptyStateAction): void {
    action.action();
    this.actionClick.emit();
  }

  /**
   * Handle default action
   */
  onDefaultAction(): void {
    this.actionClick.emit();
  }
}
