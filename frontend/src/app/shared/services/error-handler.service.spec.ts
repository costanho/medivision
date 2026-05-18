import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlerService, AppError, ErrorCategory, ErrorSeverity } from './error-handler.service';
import { NotificationService } from './notification.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let notificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    // Create spy object for NotificationService
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['error']);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(ErrorHandlerService);
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('handleHttpError', () => {
    it('should handle 400 Bad Request', () => {
      const error = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(400);
      expect(result.category).toBe('http');
      expect(result.severity).toBe('low');
      expect(result.message).toBe('Bad Request');
      expect(result.userMessage).toBe('Invalid request. Please check your input.');
    });

    it('should handle 401 Unauthorized', () => {
      const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(401);
      expect(result.category).toBe('authentication');
      expect(result.severity).toBe('medium');
      expect(result.message).toBe('Unauthorized');
      expect(result.userMessage).toBe('Session expired. Please log in again.');
    });

    it('should handle 403 Forbidden', () => {
      const error = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(403);
      expect(result.category).toBe('authorization');
      expect(result.severity).toBe('medium');
      expect(result.message).toBe('Forbidden');
      expect(result.userMessage).toBe('You do not have permission to access this.');
    });

    it('should handle 404 Not Found', () => {
      const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(404);
      expect(result.category).toBe('http');
      expect(result.severity).toBe('low');
      expect(result.message).toBe('Not Found');
      expect(result.userMessage).toBe('The requested resource was not found.');
    });

    it('should handle 409 Conflict', () => {
      const error = new HttpErrorResponse({ status: 409, statusText: 'Conflict' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(409);
      expect(result.category).toBe('http');
      expect(result.severity).toBe('low');
      expect(result.userMessage).toBe('There was a conflict. Please try again.');
    });

    it('should handle 422 Validation Failed', () => {
      const error = new HttpErrorResponse({ status: 422, statusText: 'Unprocessable Entity' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(422);
      expect(result.category).toBe('http');
      expect(result.severity).toBe('low');
      expect(result.userMessage).toBe('The data you provided is invalid.');
    });

    it('should handle 429 Rate Limited', () => {
      const error = new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(429);
      expect(result.severity).toBe('low');
      expect(result.userMessage).toBe('Too many requests. Please wait a moment.');
    });

    it('should handle 500 Server Error', () => {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(500);
      expect(result.category).toBe('server');
      expect(result.severity).toBe('high');
      expect(result.message).toBe('Server Error');
      expect(result.userMessage).toBe('Server error. Please try again later.');
    });

    it('should handle 502 Bad Gateway', () => {
      const error = new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(502);
      expect(result.category).toBe('server');
      expect(result.severity).toBe('high');
      expect(result.userMessage).toBe('Service unavailable. Please try again later.');
    });

    it('should handle 503 Service Unavailable', () => {
      const error = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(503);
      expect(result.category).toBe('server');
      expect(result.severity).toBe('high');
      expect(result.userMessage).toBe('Service unavailable. Please try again later.');
    });

    it('should handle 504 Gateway Timeout', () => {
      const error = new HttpErrorResponse({ status: 504, statusText: 'Gateway Timeout' });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(504);
      expect(result.category).toBe('server');
      expect(result.severity).toBe('high');
      expect(result.userMessage).toBe('The request took too long. Please try again.');
    });

    it('should handle unmapped status codes', () => {
      const error = new HttpErrorResponse({ status: 418, statusText: "I'm a teapot" });
      const result = service.handleHttpError(error);

      expect(result.statusCode).toBe(418);
      expect(result.message).toBe('HTTP Error');
      expect(result.userMessage).toBe('An error occurred. Please try again.');
    });

    it('should include context in error', () => {
      const error = new HttpErrorResponse({ status: 500 });
      const context = { endpoint: '/api/users', method: 'POST' };
      const result = service.handleHttpError(error, context);

      expect(result.context).toEqual(context);
    });

    it('should include URL from error', () => {
      const error = new HttpErrorResponse({
        status: 404,
        url: 'http://localhost:8081/api/users/123'
      });
      const result = service.handleHttpError(error);

      expect(result.url).toBe('http://localhost:8081/api/users/123');
    });

    it('should generate unique error IDs', () => {
      const error = new HttpErrorResponse({ status: 500 });
      const result1 = service.handleHttpError(error);
      const result2 = service.handleHttpError(error);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(/^error-/);
      expect(result2.id).toMatch(/^error-/);
    });

    it('should set timestamp', () => {
      const error = new HttpErrorResponse({ status: 500 });
      const before = new Date();
      const result = service.handleHttpError(error);
      const after = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should trigger error notification for high severity', (done) => {
      spyOn(service, 'setErrorToastEnabled').and.callThrough();
      const error = new HttpErrorResponse({ status: 500 });
      service.handleHttpError(error);

      setTimeout(() => {
        expect(notificationService.error).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('handleWebSocketError', () => {
    it('should handle WebSocket errors', () => {
      const error = new Error('Connection refused');
      const result = service.handleWebSocketError(error);

      expect(result.category).toBe('websocket');
      expect(result.severity).toBe('high');
      expect(result.message).toBe('WebSocket Error: Connection failed');
      expect(result.userMessage).toBe('Connection lost. Attempting to reconnect...');
    });

    it('should include context in WebSocket error', () => {
      const error = new Error('Connection lost');
      const context = { url: 'ws://localhost:8080/socket', reconnectAttempt: 3 };
      const result = service.handleWebSocketError(error, context);

      expect(result.context).toEqual(context);
    });

    it('should generate unique WebSocket error IDs', () => {
      const error = new Error('Connection lost');
      const result1 = service.handleWebSocketError(error);
      const result2 = service.handleWebSocketError(error);

      expect(result1.id).not.toBe(result2.id);
    });

    it('should set timestamp for WebSocket error', () => {
      const error = new Error('Connection lost');
      const before = new Date();
      const result = service.handleWebSocketError(error);
      const after = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('handleValidationError', () => {
    it('should handle validation errors', () => {
      const errors = {
        email: ['Email is required', 'Email must be valid'],
        password: ['Password must be at least 8 characters']
      };
      const result = service.handleValidationError(errors);

      expect(result.category).toBe('validation');
      expect(result.severity).toBe('medium');
      expect(result.message).toBe('Validation Error');
      expect(result.userMessage).toBe('Please check the form for errors and try again.');
      expect(result.originalError).toEqual(errors);
    });

    it('should handle empty validation errors', () => {
      const errors = {};
      const result = service.handleValidationError(errors);

      expect(result.category).toBe('validation');
      expect(result.severity).toBe('medium');
    });

    it('should include context in validation error', () => {
      const errors = { email: ['Invalid email'] };
      const context = { formName: 'registerForm' };
      const result = service.handleValidationError(errors, context);

      expect(result.context).toEqual(context);
    });
  });

  describe('handleError', () => {
    it('should handle generic errors with default category', () => {
      const error = new Error('Something went wrong');
      const result = service.handleError(error);

      expect(result.category).toBe('unknown');
      expect(result.severity).toBe('medium');
      expect(result.message).toBe('Something went wrong');
      expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    });

    it('should handle generic errors with specific category', () => {
      const error = new Error('Network timeout');
      const result = service.handleError(error, 'network');

      expect(result.category).toBe('network');
    });

    it('should handle non-Error objects', () => {
      const result = service.handleError('String error');

      expect(result.message).toBe('String error');
    });

    it('should include context in generic error', () => {
      const error = new Error('Processing failed');
      const context = { operation: 'data-sync' };
      const result = service.handleError(error, 'unknown', context);

      expect(result.context).toEqual(context);
    });
  });

  describe('Error History', () => {
    it('should track error history', (done) => {
      const error = new HttpErrorResponse({ status: 500 });
      service.handleHttpError(error);

      service.getErrorHistory$().subscribe(history => {
        expect(history.length).toBe(1);
        expect(history[0].statusCode).toBe(500);
        done();
      });
    });

    it('should maintain max history size of 50', () => {
      const error = new HttpErrorResponse({ status: 500 });

      // Add 60 errors
      for (let i = 0; i < 60; i++) {
        service.handleHttpError(error);
      }

      const history = service.getRecentErrors(100);
      expect(history.length).toBe(50);
    });

    it('should not exceed max history after rapid errors', () => {
      for (let i = 0; i < 100; i++) {
        service.handleHttpError(new HttpErrorResponse({ status: 500 }));
      }

      const stats = service.getErrorStats();
      expect(stats['total']).toBe(50);
    });

    it('should return recent errors in correct order', () => {
      const error1 = new HttpErrorResponse({ status: 400 });
      const error2 = new HttpErrorResponse({ status: 500 });
      const error3 = new HttpErrorResponse({ status: 404 });

      service.handleHttpError(error1);
      service.handleHttpError(error2);
      service.handleHttpError(error3);

      const recent = service.getRecentErrors(3);
      expect(recent[0].statusCode).toBe(404);  // Most recent first
      expect(recent[1].statusCode).toBe(500);
      expect(recent[2].statusCode).toBe(400);  // Oldest
    });

    it('should clear error history', (done) => {
      const error = new HttpErrorResponse({ status: 500 });
      service.handleHttpError(error);
      service.clearErrorHistory();

      service.getErrorHistory$().subscribe(history => {
        expect(history.length).toBe(0);
        done();
      });
    });

    it('should get recent errors with limit', () => {
      const error = new HttpErrorResponse({ status: 500 });

      for (let i = 0; i < 10; i++) {
        service.handleHttpError(error);
      }

      const recent = service.getRecentErrors(5);
      expect(recent.length).toBe(5);
    });

    it('should get recent errors default limit of 10', () => {
      const error = new HttpErrorResponse({ status: 500 });

      for (let i = 0; i < 20; i++) {
        service.handleHttpError(error);
      }

      const recent = service.getRecentErrors();
      expect(recent.length).toBe(10);
    });
  });

  describe('Error Statistics', () => {
    it('should calculate error statistics', () => {
      service.handleHttpError(new HttpErrorResponse({ status: 500 })); // high
      service.handleHttpError(new HttpErrorResponse({ status: 500 })); // high
      service.handleHttpError(new HttpErrorResponse({ status: 401 })); // medium
      service.handleHttpError(new HttpErrorResponse({ status: 400 })); // low
      service.handleHttpError(new HttpErrorResponse({ status: 400 })); // low

      const stats = service.getErrorStats();

      expect(stats['total']).toBe(5);
      expect(stats['critical']).toBe(0);
      expect(stats['high']).toBe(2);
      expect(stats['medium']).toBe(1);
      expect(stats['low']).toBe(2);
    });

    it('should return empty stats when no errors', () => {
      const stats = service.getErrorStats();

      expect(stats['total']).toBe(0);
      expect(stats['critical']).toBe(0);
      expect(stats['high']).toBe(0);
      expect(stats['medium']).toBe(0);
      expect(stats['low']).toBe(0);
    });

    it('should update stats after clearing history', () => {
      service.handleHttpError(new HttpErrorResponse({ status: 500 }));
      service.clearErrorHistory();

      const stats = service.getErrorStats();
      expect(stats['total']).toBe(0);
    });
  });

  describe('Observable Streams', () => {
    it('should emit current error', (done) => {
      const error = new HttpErrorResponse({ status: 500 });
      service.handleHttpError(error);

      service.getCurrentError$().subscribe(appError => {
        expect(appError.statusCode).toBe(500);
        done();
      });
    });

    it('should emit multiple current errors', (done) => {
      const error1 = new HttpErrorResponse({ status: 400 });
      const error2 = new HttpErrorResponse({ status: 500 });

      let emissionCount = 0;

      service.getCurrentError$().subscribe(appError => {
        emissionCount++;

        if (emissionCount === 1) {
          expect(appError.statusCode).toBe(400);
        } else if (emissionCount === 2) {
          expect(appError.statusCode).toBe(500);
          done();
        }
      });

      service.handleHttpError(error1);
      service.handleHttpError(error2);
    });

    it('should emit error history observable', (done) => {
      const error = new HttpErrorResponse({ status: 500 });
      service.handleHttpError(error);

      service.getErrorHistory$().subscribe(history => {
        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('Configuration', () => {
    it('should toggle console logging', () => {
      service.setConsoleLogging(false);
      const error = new HttpErrorResponse({ status: 500 });

      spyOn(console, 'warn');
      service.handleHttpError(error);

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should toggle error toast notifications', () => {
      service.setErrorToastEnabled(false);
      const error = new HttpErrorResponse({ status: 500 });

      service.handleHttpError(error);

      expect(notificationService.error).not.toHaveBeenCalled();
    });

    it('should persist console logging setting to localStorage', () => {
      service.setConsoleLogging(false);

      const saved = localStorage.getItem('errorHandlerSettings');
      const settings = JSON.parse(saved || '{}');

      expect(settings.consoleLogging).toBe(false);
    });

    it('should persist toast notification setting to localStorage', () => {
      service.setErrorToastEnabled(false);

      const saved = localStorage.getItem('errorHandlerSettings');
      const settings = JSON.parse(saved || '{}');

      expect(settings.errorToast).toBe(false);
    });

    it('should load settings from localStorage on init', () => {
      localStorage.setItem('errorHandlerSettings', JSON.stringify({
        consoleLogging: false,
        errorToast: false
      }));

      // Create new service instance to trigger loadSettings
      TestBed.resetTestingModule();
      const notificationSpy = jasmine.createSpyObj('NotificationService', ['error']);
      TestBed.configureTestingModule({
        providers: [
          ErrorHandlerService,
          { provide: NotificationService, useValue: notificationSpy }
        ]
      });

      const newService = TestBed.inject(ErrorHandlerService);
      const error = new HttpErrorResponse({ status: 500 });

      spyOn(console, 'warn');
      newService.handleHttpError(error);

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should use default settings if localStorage is empty', () => {
      localStorage.clear();

      TestBed.resetTestingModule();
      const notificationSpy = jasmine.createSpyObj('NotificationService', ['error']);
      TestBed.configureTestingModule({
        providers: [
          ErrorHandlerService,
          { provide: NotificationService, useValue: notificationSpy }
        ]
      });

      const newService = TestBed.inject(ErrorHandlerService);
      spyOn(console, 'warn');

      const error = new HttpErrorResponse({ status: 500 });
      newService.handleHttpError(error);

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('Error Categorization', () => {
    it('should categorize 4xx client errors as http', () => {
      const error = new HttpErrorResponse({ status: 418 });
      const result = service.handleHttpError(error);

      expect(result.category).toBe('http');
    });

    it('should categorize 5xx server errors as server', () => {
      const error = new HttpErrorResponse({ status: 510 });
      const result = service.handleHttpError(error);

      expect(result.category).toBe('server');
    });

    it('should categorize 401 as authentication', () => {
      const error = new HttpErrorResponse({ status: 401 });
      const result = service.handleHttpError(error);

      expect(result.category).toBe('authentication');
    });

    it('should categorize 403 as authorization', () => {
      const error = new HttpErrorResponse({ status: 403 });
      const result = service.handleHttpError(error);

      expect(result.category).toBe('authorization');
    });
  });

  describe('Error Severity', () => {
    it('should assign low severity to 4xx errors', () => {
      const error = new HttpErrorResponse({ status: 400 });
      const result = service.handleHttpError(error);

      expect(result.severity).toBe('low');
    });

    it('should assign medium severity to 401 and 403', () => {
      const error401 = new HttpErrorResponse({ status: 401 });
      const error403 = new HttpErrorResponse({ status: 403 });

      const result401 = service.handleHttpError(error401);
      const result403 = service.handleHttpError(error403);

      expect(result401.severity).toBe('medium');
      expect(result403.severity).toBe('medium');
    });

    it('should assign high severity to 5xx errors', () => {
      const error = new HttpErrorResponse({ status: 500 });
      const result = service.handleHttpError(error);

      expect(result.severity).toBe('high');
    });
  });

  describe('Error Storage Interface', () => {
    it('should store original error object', () => {
      const httpError = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
      const result = service.handleHttpError(httpError);

      expect(result.originalError).toEqual(httpError);
    });

    it('should store validation error details', () => {
      const validationErrors = {
        email: ['Invalid'],
        password: ['Too short']
      };
      const result = service.handleValidationError(validationErrors);

      expect(result.originalError).toEqual(validationErrors);
    });

    it('should generate consistent error ID format', () => {
      const error = new HttpErrorResponse({ status: 500 });
      const result = service.handleHttpError(error);

      expect(result.id).toMatch(/^error-\d+-[a-z0-9]+$/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null context', () => {
      const error = new HttpErrorResponse({ status: 500 });
      const result = service.handleHttpError(error, null as any);

      expect(result).toBeDefined();
    });

    it('should handle undefined context', () => {
      const error = new HttpErrorResponse({ status: 500 });
      const result = service.handleHttpError(error, undefined);

      expect(result).toBeDefined();
    });

    it('should handle error with no status code', () => {
      const error = new HttpErrorResponse({});
      const result = service.handleHttpError(error);

      expect(result).toBeDefined();
      expect(result.message).toBe('HTTP Error');
    });

    it('should handle localStorage quota exceeded gracefully', () => {
      // Mock localStorage to throw quota exceeded error
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');

      expect(() => {
        service.setConsoleLogging(false);
      }).not.toThrow();
    });

    it('should handle localStorage parse error gracefully', () => {
      localStorage.setItem('errorHandlerSettings', 'invalid json');

      // Should not throw on init
      TestBed.resetTestingModule();
      const notificationSpy = jasmine.createSpyObj('NotificationService', ['error']);
      TestBed.configureTestingModule({
        providers: [
          ErrorHandlerService,
          { provide: NotificationService, useValue: notificationSpy }
        ]
      });

      expect(() => TestBed.inject(ErrorHandlerService)).not.toThrow();
    });

    it('should handle multiple rapid errors', () => {
      for (let i = 0; i < 100; i++) {
        service.handleHttpError(new HttpErrorResponse({ status: 500 }));
      }

      const stats = service.getErrorStats();
      expect(stats['total']).toBe(50); // Max history size
    });
  });

  describe('Console Logging', () => {
    beforeEach(() => {
      spyOn(console, 'warn');
    });

    it('should log errors to console by default', () => {
      const error = new HttpErrorResponse({ status: 500 });
      service.handleHttpError(error);

      expect(console.warn).toHaveBeenCalledWith(
        '[ERROR] server',
        jasmine.objectContaining({
          severity: 'high',
          message: 'Server Error'
        })
      );
    });

    it('should not log when console logging disabled', () => {
      service.setConsoleLogging(false);
      const error = new HttpErrorResponse({ status: 500 });

      service.handleHttpError(error);

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should log with error severity', () => {
      const error = new HttpErrorResponse({ status: 500 });
      service.handleHttpError(error);

      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching('ERROR'),
        jasmine.anything()
      );
    });

    it('should not call toast for low severity errors', () => {
      const error = new HttpErrorResponse({ status: 400 });
      service.handleHttpError(error);

      expect(notificationService.error).not.toHaveBeenCalled();
    });

    it('should call toast for medium and high severity errors', () => {
      service.handleHttpError(new HttpErrorResponse({ status: 401 })); // medium
      service.handleHttpError(new HttpErrorResponse({ status: 500 })); // high

      expect(notificationService.error).toHaveBeenCalledTimes(2);
    });
  });
});
