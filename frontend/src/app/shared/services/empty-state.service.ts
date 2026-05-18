/**
 * Empty State Service
 * 
 * Manages empty state display logic for different contexts
 * Features:
 * - Determine when to show empty states
 * - Track empty state visibility
 * - Manage state transitions
 * - Support multiple contexts (conversations, messages, search)
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { EmptyStateVariant } from '../components/empty-state/empty-state.component';

export interface EmptyStateContext {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: string;
  isVisible: boolean;
  isLoading?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EmptyStateService {
  /**
   * Empty state contexts by name
   */
  private contexts = new Map<string, BehaviorSubject<EmptyStateContext>>();

  /**
   * Global empty state visibility
   */
  private globalEmpty$ = new BehaviorSubject<boolean>(false);

  constructor() {}

  /**
   * Register or update an empty state context
   * @param contextName Unique context identifier
   * @param context Empty state configuration
   */
  setContext(contextName: string, context: EmptyStateContext): void {
    if (!this.contexts.has(contextName)) {
      this.contexts.set(contextName, new BehaviorSubject<EmptyStateContext>(context));
    } else {
      const existing = this.contexts.get(contextName)!;
      existing.next(context);
    }
    this.updateGlobalEmpty();
  }

  /**
   * Get observable for a context
   * @param contextName Context identifier
   */
  getContext$(contextName: string): Observable<EmptyStateContext> {
    if (!this.contexts.has(contextName)) {
      // Return default empty context
      return new BehaviorSubject<EmptyStateContext>({
        variant: 'custom',
        isVisible: false
      });
    }
    return this.contexts.get(contextName)!.asObservable();
  }

  /**
   * Check if context is empty
   * @param contextName Context identifier
   */
  isContextEmpty$(contextName: string): Observable<boolean> {
    return new Observable(observer => {
      const subscription = this.getContext$(contextName).subscribe(context => {
        observer.next(context.isVisible);
      });
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Show empty state for context
   * @param contextName Context identifier
   * @param variant Type of empty state
   * @param title Optional custom title
   * @param description Optional custom description
   */
  show(
    contextName: string,
    variant: EmptyStateVariant = 'custom',
    title?: string,
    description?: string
  ): void {
    const context = this.contexts.get(contextName)?.value || {
      variant: 'custom',
      isVisible: false
    };

    this.setContext(contextName, {
      ...context,
      variant,
      title,
      description,
      isVisible: true,
      isLoading: false
    });
  }

  /**
   * Hide empty state for context
   * @param contextName Context identifier
   */
  hide(contextName: string): void {
    const context = this.contexts.get(contextName)?.value || {
      variant: 'custom',
      isVisible: false
    };

    this.setContext(contextName, {
      ...context,
      isVisible: false,
      isLoading: false
    });
  }

  /**
   * Show loading state for context
   * @param contextName Context identifier
   */
  showLoading(contextName: string): void {
    const context = this.contexts.get(contextName)?.value || {
      variant: 'custom',
      isVisible: false
    };

    this.setContext(contextName, {
      ...context,
      isVisible: true,
      isLoading: true
    });
  }

  /**
   * Toggle empty state visibility
   * @param contextName Context identifier
   */
  toggle(contextName: string): void {
    const context = this.contexts.get(contextName)?.value;
    if (context) {
      this.setContext(contextName, {
        ...context,
        isVisible: !context.isVisible
      });
    }
  }

  /**
   * Get global empty state (any context is empty)
   */
  isGlobalEmpty$(): Observable<boolean> {
    return this.globalEmpty$.asObservable();
  }

  /**
   * Determine if context should show empty state based on data
   * @param contextName Context identifier
   * @param data Array of items
   * @param variant Type of empty state to show
   */
  updateFromData<T>(
    contextName: string,
    data: T[],
    variant: EmptyStateVariant = 'custom'
  ): void {
    if (!data || data.length === 0) {
      this.show(contextName, variant);
    } else {
      this.hide(contextName);
    }
  }

  /**
   * Clear all contexts
   */
  clearAll(): void {
    this.contexts.clear();
    this.updateGlobalEmpty();
  }

  /**
   * Clear specific context
   * @param contextName Context identifier
   */
  clear(contextName: string): void {
    this.contexts.delete(contextName);
    this.updateGlobalEmpty();
  }

  /**
   * Get all contexts
   */
  getAllContexts(): Map<string, BehaviorSubject<EmptyStateContext>> {
    return this.contexts;
  }

  /**
   * Check if any context is visible
   */
  hasVisibleContext(): boolean {
    for (const context of this.contexts.values()) {
      if (context.value.isVisible) {
        return true;
      }
    }
    return false;
  }

  /**
   * Update global empty state based on all contexts
   */
  private updateGlobalEmpty(): void {
    const hasEmpty = this.hasVisibleContext();
    this.globalEmpty$.next(hasEmpty);
  }

  /**
   * Get context value synchronously (if exists)
   * @param contextName Context identifier
   */
  getContextValue(contextName: string): EmptyStateContext | undefined {
    return this.contexts.get(contextName)?.value;
  }
}
