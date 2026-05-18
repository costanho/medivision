/**
 * Loading State Service
 *
 * Centralized service for managing loading states across the application.
 * Supports multiple concurrent loading operations with progress tracking.
 *
 * Features:
 * - Track multiple loading operations simultaneously
 * - Global and operation-specific loading states
 * - Progress tracking for long-running operations
 * - Timeout detection for stuck operations
 * - Observable streams for reactive updates
 *
 * Usage:
 * this.loading.start('messages');
 * this.loading.isLoading('messages').subscribe(isLoading => {
 *   this.isLoading = isLoading;
 * });
 * this.loading.stop('messages');
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface LoadingOperation {
  key: string;
  isLoading: boolean;
  progress: number;
  message: string;
  startTime: number;
  timeout?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private operations = new Map<string, LoadingOperation>();
  private operationsSubject$ = new BehaviorSubject<Map<string, LoadingOperation>>(this.operations);
  public operations$ = this.operationsSubject$.asObservable();

  /**
   * Start a loading operation
   *
   * @param key Unique identifier for the operation
   * @param message Optional message to display
   * @param timeout Optional timeout in milliseconds
   */
  start(key: string, message: string = '', timeout: number = 0): void {
    const operation: LoadingOperation = {
      key,
      isLoading: true,
      progress: 0,
      message,
      startTime: Date.now(),
      timeout: timeout || undefined
    };

    this.operations.set(key, operation);
    this.operationsSubject$.next(new Map(this.operations));

    // Set timeout if specified
    if (timeout > 0) {
      setTimeout(() => {
        if (this.operations.has(key) && this.operations.get(key)?.isLoading) {
          console.warn(`Loading operation '${key}' timed out after ${timeout}ms`);
          this.stop(key);
        }
      }, timeout);
    }
  }

  /**
   * Update progress for a loading operation
   *
   * @param key Operation key
   * @param progress Progress percentage (0-100)
   */
  setProgress(key: string, progress: number): void {
    const operation = this.operations.get(key);
    if (operation) {
      operation.progress = Math.min(100, Math.max(0, progress));
      this.operationsSubject$.next(new Map(this.operations));
    }
  }

  /**
   * Update message for a loading operation
   *
   * @param key Operation key
   * @param message New message
   */
  setMessage(key: string, message: string): void {
    const operation = this.operations.get(key);
    if (operation) {
      operation.message = message;
      this.operationsSubject$.next(new Map(this.operations));
    }
  }

  /**
   * Stop a loading operation
   *
   * @param key Operation key
   */
  stop(key: string): void {
    if (this.operations.has(key)) {
      this.operations.delete(key);
      this.operationsSubject$.next(new Map(this.operations));
    }
  }

  /**
   * Stop all loading operations
   */
  stopAll(): void {
    this.operations.clear();
    this.operationsSubject$.next(new Map(this.operations));
  }

  /**
   * Check if any operation is loading
   *
   * @returns Observable of global loading state
   */
  isLoading(): Observable<boolean>;
  /**
   * Check if specific operation is loading
   *
   * @param key Operation key
   * @returns Observable of operation loading state
   */
  isLoading(key: string): Observable<boolean>;
  isLoading(key?: string): Observable<boolean> {
    if (key) {
      return this.operations$.pipe(
        map(ops => {
          const op = ops.get(key);
          return op ? op.isLoading : false;
        })
      );
    } else {
      return this.operations$.pipe(
        map(ops => ops.size > 0)
      );
    }
  }

  /**
   * Get progress for a loading operation
   *
   * @param key Operation key
   * @returns Observable of progress (0-100)
   */
  getProgress(key: string): Observable<number> {
    return this.operations$.pipe(
      map(ops => ops.get(key)?.progress ?? 0)
    );
  }

  /**
   * Get message for a loading operation
   *
   * @param key Operation key
   * @returns Observable of message
   */
  getMessage(key: string): Observable<string> {
    return this.operations$.pipe(
      map(ops => ops.get(key)?.message ?? '')
    );
  }

  /**
   * Get specific operation
   *
   * @param key Operation key
   * @returns Observable of operation
   */
  getOperation(key: string): Observable<LoadingOperation | undefined> {
    return this.operations$.pipe(
      map(ops => ops.get(key))
    );
  }

  /**
   * Get all operations
   *
   * @returns Observable of all operations
   */
  getAllOperations(): Observable<LoadingOperation[]> {
    return this.operations$.pipe(
      map(ops => Array.from(ops.values()))
    );
  }

  /**
   * Check if operation exists
   *
   * @param key Operation key
   * @returns True if operation exists
   */
  has(key: string): boolean {
    return this.operations.has(key);
  }

  /**
   * Get elapsed time for an operation
   *
   * @param key Operation key
   * @returns Elapsed time in milliseconds
   */
  getElapsedTime(key: string): number {
    const operation = this.operations.get(key);
    if (!operation) return 0;
    return Date.now() - operation.startTime;
  }
}
