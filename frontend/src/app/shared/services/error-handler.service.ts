import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { NotificationService } from './notification.service';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'http' | 'validation' | 'authentication' | 'authorization' | 'server' | 'websocket' | 'unknown';

export interface AppError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  originalError: any;
  statusCode?: number;
  url?: string;
  stack?: string;
  context?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private errorHistory$ = new BehaviorSubject<AppError[]>([]);
  private currentError$ = new Subject<AppError>();
  private readonly MAX_ERROR_HISTORY = 50;
  private enableConsoleLogging = true;
  private enableErrorToast = true;

  private httpErrorMessages: Record<number, { user: string; dev: string }> = {
    400: { user: 'Invalid request. Please check your input.', dev: 'Bad Request' },
    401: { user: 'Session expired. Please log in again.', dev: 'Unauthorized' },
    403: { user: 'You do not have permission to access this.', dev: 'Forbidden' },
    404: { user: 'The requested resource was not found.', dev: 'Not Found' },
    409: { user: 'There was a conflict. Please try again.', dev: 'Conflict' },
    422: { user: 'The data you provided is invalid.', dev: 'Validation Failed' },
    429: { user: 'Too many requests. Please wait a moment.', dev: 'Rate Limited' },
    500: { user: 'Server error. Please try again later.', dev: 'Server Error' },
    502: { user: 'Service unavailable. Please try again later.', dev: 'Bad Gateway' },
    503: { user: 'Service unavailable. Please try again later.', dev: 'Service Unavailable' },
    504: { user: 'The request took too long. Please try again.', dev: 'Timeout' }
  };

  constructor(private notificationService: NotificationService) {
    this.loadSettings();
  }

  handleHttpError(error: HttpErrorResponse, context?: Record<string, any>): AppError {
    const statusCode = error.status;
    const errorMsg = this.httpErrorMessages[statusCode];

    const appError: AppError = {
      id: this.generateId(),
      timestamp: new Date(),
      category: this.categorizeHttpError(statusCode),
      severity: this.getHttpErrorSeverity(statusCode),
      message: errorMsg?.dev || 'HTTP Error',
      userMessage: errorMsg?.user || 'An error occurred. Please try again.',
      originalError: error,
      statusCode,
      url: error.url || undefined,
      context
    };

    this.recordError(appError);
    return appError;
  }

  handleWebSocketError(error: any, context?: Record<string, any>): AppError {
    const appError: AppError = {
      id: this.generateId(),
      timestamp: new Date(),
      category: 'websocket',
      severity: 'high',
      message: 'WebSocket Error: Connection failed',
      userMessage: 'Connection lost. Attempting to reconnect...',
      originalError: error,
      context
    };

    this.recordError(appError);
    return appError;
  }

  handleValidationError(errors: Record<string, string[]>, context?: Record<string, any>): AppError {
    const appError: AppError = {
      id: this.generateId(),
      timestamp: new Date(),
      category: 'validation',
      severity: 'medium',
      message: 'Validation Error',
      userMessage: 'Please check the form for errors and try again.',
      originalError: errors,
      context
    };

    this.recordError(appError);
    return appError;
  }

  handleError(error: any, category: ErrorCategory = 'unknown', context?: Record<string, any>): AppError {
    const appError: AppError = {
      id: this.generateId(),
      timestamp: new Date(),
      category,
      severity: 'medium',
      message: error.message || String(error),
      userMessage: 'An unexpected error occurred. Please try again.',
      originalError: error,
      context
    };

    this.recordError(appError);
    return appError;
  }

  private recordError(error: AppError): void {
    const history = this.errorHistory$.value;
    const updated = [error, ...history].slice(0, this.MAX_ERROR_HISTORY);
    this.errorHistory$.next(updated);
    this.logError(error);
    this.currentError$.next(error);
  }

  private logError(error: AppError): void {
    if (!this.enableConsoleLogging) return;

    console.warn('[ERROR] ' + error.category, {
      id: error.id,
      severity: error.severity,
      message: error.message
    });

    if (this.enableErrorToast && error.severity !== 'low') {
      this.notificationService.error(error.userMessage);
    }
  }

  getErrorHistory$(): Observable<AppError[]> {
    return this.errorHistory$.asObservable();
  }

  getCurrentError$(): Observable<AppError> {
    return this.currentError$.asObservable();
  }

  getRecentErrors(count: number = 10): AppError[] {
    return this.errorHistory$.value.slice(0, count);
  }

  clearErrorHistory(): void {
    this.errorHistory$.next([]);
  }

  getErrorStats(): Record<string, number> {
    const history = this.errorHistory$.value;
    return {
      total: history.length,
      critical: history.filter(e => e.severity === 'critical').length,
      high: history.filter(e => e.severity === 'high').length,
      medium: history.filter(e => e.severity === 'medium').length,
      low: history.filter(e => e.severity === 'low').length
    };
  }

  setConsoleLogging(enabled: boolean): void {
    this.enableConsoleLogging = enabled;
    this.saveSettings();
  }

  setErrorToastEnabled(enabled: boolean): void {
    this.enableErrorToast = enabled;
    this.saveSettings();
  }

  private categorizeHttpError(statusCode: number): ErrorCategory {
    if (statusCode === 401) return 'authentication';
    if (statusCode === 403) return 'authorization';
    if (statusCode >= 400 && statusCode < 500) return 'http';
    if (statusCode >= 500) return 'server';
    return 'network';
  }

  private getHttpErrorSeverity(statusCode: number): ErrorSeverity {
    if (statusCode >= 500) return 'high';
    if (statusCode === 401 || statusCode === 403) return 'medium';
    if (statusCode >= 400 && statusCode < 500) return 'low';
    return 'medium';
  }

  private generateId(): string {
    return 'error-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('errorHandlerSettings', JSON.stringify({
        consoleLogging: this.enableConsoleLogging,
        errorToast: this.enableErrorToast
      }));
    } catch {
      // Handle quota exceeded
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('errorHandlerSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.enableConsoleLogging = settings.consoleLogging ?? true;
        this.enableErrorToast = settings.errorToast ?? true;
      }
    } catch {
      // Handle parse error
    }
  }
}
