import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';

export interface HttpRequestLog {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status: number | null;
  statusText: string | null;
  requestSize: number;
  responseSize: number;
  duration: number;
  headers: Record<string, string>;
  body?: any;
  response?: any;
  error?: any;
}

@Injectable()
export class HttpLoggingInterceptor implements HttpInterceptor {
  private requestLogs: HttpRequestLog[] = [];
  private readonly MAX_LOGS = 100;
  private enableLogging = true;
  private enableConsoleLogging = true;

  constructor() {
    // Expose logging control to window for DevTools access
    (window as any).httpLogging = {
      getLogs: () => this.getLogs(),
      clearLogs: () => this.clearLogs(),
      enableLogging: (enabled: boolean) => this.setLoggingEnabled(enabled),
      enableConsole: (enabled: boolean) => this.setConsoleLoggingEnabled(enabled),
      getLogsByUrl: (urlPattern: string) => this.getLogsByUrl(urlPattern),
      getLogsByMethod: (method: string) => this.getLogsByMethod(method),
      getLogsByStatus: (status: number) => this.getLogsByStatus(status),
      exportLogs: () => this.exportLogsAsJson(),
      exportCsv: () => this.exportLogsAsCsv()
    };
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.enableLogging) {
      return next.handle(req);
    }

    const logEntry: HttpRequestLog = {
      id: this.generateId(),
      timestamp: new Date(),
      method: req.method,
      url: req.url,
      status: null,
      statusText: null,
      requestSize: this.getRequestSize(req),
      responseSize: 0,
      duration: 0,
      headers: this.extractHeaders(req),
      body: this.extractBody(req)
    };

    const startTime = performance.now();

    if (this.enableConsoleLogging) {
      this.logRequest(logEntry);
    }

    return next.handle(req).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          logEntry.status = event.status;
          logEntry.statusText = event.statusText;
          logEntry.responseSize = this.getResponseSize(event);
          logEntry.response = this.extractResponseBody(event);
          logEntry.duration = Math.round(performance.now() - startTime);

          if (this.enableConsoleLogging) {
            this.logResponse(logEntry);
          }

          this.addLog(logEntry);
        }
      }),
      catchError((error: HttpErrorResponse | any) => {
        logEntry.status = error.status || null;
        logEntry.statusText = error.statusText || 'Unknown Error';
        logEntry.responseSize = this.getErrorResponseSize(error);
        logEntry.error = this.extractErrorBody(error);
        logEntry.duration = Math.round(performance.now() - startTime);

        if (this.enableConsoleLogging) {
          this.logError(logEntry);
        }

        this.addLog(logEntry);

        return throwError(() => error);
      }),
      finalize(() => {
        // Log is already added in tap or catchError
      })
    );
  }

  private extractHeaders(req: HttpRequest<any>): Record<string, string> {
    const headers: Record<string, string> = {};
    req.headers.keys().forEach(key => {
      const value = req.headers.get(key);
      if (value) {
        // Hide sensitive headers
        if (key.toLowerCase() === 'authorization') {
          headers[key] = '[REDACTED]';
        } else if (key.toLowerCase() === 'cookie') {
          headers[key] = '[REDACTED]';
        } else {
          headers[key] = value;
        }
      }
    });
    return headers;
  }

  private extractBody(req: HttpRequest<any>): any {
    if (!req.body) return undefined;
    if (typeof req.body === 'string' || req.body instanceof ArrayBuffer) {
      return '[Binary Data]';
    }
    return req.body;
  }

  private extractResponseBody(response: HttpResponse<any>): any {
    if (!response.body) return undefined;
    if (typeof response.body === 'string' || response.body instanceof ArrayBuffer) {
      return '[Binary Data]';
    }
    return response.body;
  }

  private extractErrorBody(error: any): any {
    if (!error.error) return undefined;
    if (typeof error.error === 'string' || error.error instanceof ArrayBuffer) {
      return '[Binary Data]';
    }
    return error.error;
  }

  private getRequestSize(req: HttpRequest<any>): number {
    let size = req.url.length;
    if (req.body) {
      if (typeof req.body === 'string') {
        size += req.body.length;
      } else if (typeof req.body === 'object') {
        size += JSON.stringify(req.body).length;
      }
    }
    return size;
  }

  private getResponseSize(response: HttpResponse<any>): number {
    if (!response.body) return 0;
    if (typeof response.body === 'string') {
      return response.body.length;
    }
    return JSON.stringify(response.body).length;
  }

  private getErrorResponseSize(error: any): number {
    if (!error.error) return 0;
    if (typeof error.error === 'string') {
      return error.error.length;
    }
    return JSON.stringify(error.error).length;
  }

  private logRequest(log: HttpRequestLog): void {
    console.group(`📤 ${log.method} ${log.url}`);
    console.log('Timestamp:', log.timestamp.toISOString());
    console.log('Headers:', log.headers);
    if (log.body) {
      console.log('Body:', log.body);
    }
    console.groupEnd();
  }

  private logResponse(log: HttpRequestLog): void {
    const statusColor = log.status && log.status >= 200 && log.status < 300 ? '%cgreen' : '%cred';
    console.group(
      `📥 ${log.method} ${log.url} %c${log.status} ${log.statusText} %c(${log.duration}ms)`,
      statusColor,
      'color: blue'
    );
    console.log('Response:', log.response);
    console.log('Size:', `${log.responseSize} bytes`);
    console.groupEnd();
  }

  private logError(log: HttpRequestLog): void {
    console.group(`❌ ${log.method} ${log.url} ${log.status} ${log.statusText}`);
    console.error('Error:', log.error);
    console.log('Duration:', `${log.duration}ms`);
    console.groupEnd();
  }

  private addLog(log: HttpRequestLog): void {
    this.requestLogs.unshift(log);
    if (this.requestLogs.length > this.MAX_LOGS) {
      this.requestLogs.pop();
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API for DevTools access

  getLogs(): HttpRequestLog[] {
    return this.requestLogs;
  }

  clearLogs(): void {
    this.requestLogs = [];
    console.log('HTTP logs cleared');
  }

  setLoggingEnabled(enabled: boolean): void {
    this.enableLogging = enabled;
    console.log(`HTTP logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  setConsoleLoggingEnabled(enabled: boolean): void {
    this.enableConsoleLogging = enabled;
    console.log(`Console logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  getLogsByUrl(urlPattern: string): HttpRequestLog[] {
    const regex = new RegExp(urlPattern, 'i');
    return this.requestLogs.filter(log => regex.test(log.url));
  }

  getLogsByMethod(method: string): HttpRequestLog[] {
    return this.requestLogs.filter(log => log.method.toUpperCase() === method.toUpperCase());
  }

  getLogsByStatus(status: number): HttpRequestLog[] {
    return this.requestLogs.filter(log => log.status === status);
  }

  exportLogsAsJson(): string {
    return JSON.stringify(this.requestLogs, null, 2);
  }

  exportLogsAsCsv(): string {
    if (this.requestLogs.length === 0) return '';

    const headers = ['ID', 'Timestamp', 'Method', 'URL', 'Status', 'Duration (ms)', 'Request Size', 'Response Size'];
    const rows = this.requestLogs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.method,
      log.url,
      log.status ?? 'Pending',
      log.duration,
      log.requestSize,
      log.responseSize
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Get statistics about HTTP requests
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageDuration: number;
    totalDataTransferred: number;
    requestsByMethod: Record<string, number>;
    requestsByStatus: Record<number, number>;
  } {
    const stats = {
      totalRequests: this.requestLogs.length,
      successfulRequests: this.requestLogs.filter(log => log.status && log.status >= 200 && log.status < 300).length,
      failedRequests: this.requestLogs.filter(log => log.status && (log.status < 200 || log.status >= 400)).length,
      averageDuration: this.requestLogs.length > 0 ? Math.round(this.requestLogs.reduce((sum, log) => sum + log.duration, 0) / this.requestLogs.length) : 0,
      totalDataTransferred: this.requestLogs.reduce((sum, log) => sum + log.responseSize, 0),
      requestsByMethod: this.getRequestsByMethod(),
      requestsByStatus: this.getRequestsByStatus()
    };

    return stats;
  }

  private getRequestsByMethod(): Record<string, number> {
    const methods: Record<string, number> = {};
    this.requestLogs.forEach(log => {
      methods[log.method] = (methods[log.method] || 0) + 1;
    });
    return methods;
  }

  private getRequestsByStatus(): Record<number, number> {
    const statuses: Record<number, number> = {};
    this.requestLogs.forEach(log => {
      if (log.status) {
        statuses[log.status] = (statuses[log.status] || 0) + 1;
      }
    });
    return statuses;
  }

  /**
   * Print formatted statistics to console
   */
  printStats(): void {
    const stats = this.getStats();
    console.group('📊 HTTP Request Statistics');
    console.log('Total Requests:', stats.totalRequests);
    console.log('Successful:', stats.successfulRequests);
    console.log('Failed:', stats.failedRequests);
    console.log('Average Duration:', `${stats.averageDuration}ms`);
    console.log('Total Data:', `${(stats.totalDataTransferred / 1024).toFixed(2)} KB`);
    console.log('By Method:', stats.requestsByMethod);
    console.log('By Status:', stats.requestsByStatus);
    console.groupEnd();
  }
}
