import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Router } from '@angular/router';
import { ErrorInterceptor } from './error.interceptor';
import { ErrorHandlerService } from '@shared/services/error-handler.service';
import { AuthService } from '../services/auth.service';

describe('ErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let errorHandlerService: jasmine.SpyObj<ErrorHandlerService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', ['handleHttpError']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ErrorInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    errorHandlerService = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Mock the handleHttpError method to return an AppError
    errorHandlerService.handleHttpError.and.returnValue({
      id: 'error-123',
      timestamp: new Date(),
      category: 'http',
      severity: 'high',
      message: 'HTTP Error',
      userMessage: 'An error occurred',
      originalError: null
    });
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Request Interception', () => {
    it('should pass through successful requests', (done) => {
      httpClient.get('/api/test').subscribe(response => {
        expect(response).toEqual({ data: 'test' });
        done();
      });

      const req = httpMock.expectOne('/api/test');
      req.flush({ data: 'test' });
    });

    it('should not modify successful request headers', (done) => {
      httpClient.get('/api/test').subscribe(() => {
        done();
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers).toBeDefined();
      req.flush({ data: 'test' });
    });
  });

  describe('401 Unauthorized Handling', () => {
    it('should logout user on 401', (done) => {
      httpClient.get('/api/protected').subscribe({
        error: () => {
          expect(authService.logout).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should redirect to login on 401', (done) => {
      httpClient.get('/api/protected').subscribe({
        error: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/login']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle error handler on 401', (done) => {
      httpClient.get('/api/protected').subscribe({
        error: () => {
          expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should logout before redirect on 401', (done) => {
      let logoutCalled = false;
      let redirectCalled = false;

      authService.logout.and.callFake(() => {
        logoutCalled = true;
      });

      router.navigate.and.callFake(() => {
        redirectCalled = true;
        expect(logoutCalled).toBe(true);
        return Promise.resolve(true);
      });

      httpClient.get('/api/protected').subscribe({
        error: () => {
          expect(redirectCalled).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('403 Forbidden Handling', () => {
    it('should redirect to unauthorized on 403', (done) => {
      httpClient.get('/api/admin').subscribe({
        error: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/admin');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should not logout on 403', (done) => {
      httpClient.get('/api/admin').subscribe({
        error: () => {
          expect(authService.logout).not.toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/admin');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle error handler on 403', (done) => {
      httpClient.get('/api/admin').subscribe({
        error: () => {
          expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/admin');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Other Error Status Codes', () => {
    it('should handle 400 Bad Request', (done) => {
      httpClient.get('/api/test').subscribe({
        error: () => {
          expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
          expect(authService.logout).not.toHaveBeenCalled();
          expect(router.navigate).not.toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 404 Not Found', (done) => {
      httpClient.get('/api/notfound').subscribe({
        error: () => {
          expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/notfound');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 500 Server Error', (done) => {
      httpClient.get('/api/error').subscribe({
        error: () => {
          expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/error');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle 503 Service Unavailable', (done) => {
      httpClient.get('/api/unavailable').subscribe({
        error: () => {
          expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/unavailable');
      req.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
    });
  });

  describe('Context Passing', () => {
    it('should pass URL to error handler', (done) => {
      httpClient.get('/api/users/123').subscribe({
        error: () => {
          const call = errorHandlerService.handleHttpError.calls.mostRecent();
          expect(call.args[1]).toEqual(
            jasmine.objectContaining({
              url: '/api/users/123'
            })
          );
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/123');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should pass HTTP method to error handler', (done) => {
      httpClient.post('/api/users', { name: 'John' }).subscribe({
        error: () => {
          const call = errorHandlerService.handleHttpError.calls.mostRecent();
          expect(call.args[1]).toEqual(
            jasmine.objectContaining({
              method: 'POST'
            })
          );
          done();
        }
      });

      const req = httpMock.expectOne('/api/users');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should pass both URL and method for PUT request', (done) => {
      httpClient.put('/api/users/123', { name: 'Jane' }).subscribe({
        error: () => {
          const call = errorHandlerService.handleHttpError.calls.mostRecent();
          const context = call.args[1];
          expect(context.url).toBe('/api/users/123');
          expect(context.method).toBe('PUT');
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/123');
      req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    });

    it('should pass context for DELETE request', (done) => {
      httpClient.delete('/api/users/123').subscribe({
        error: () => {
          const call = errorHandlerService.handleHttpError.calls.mostRecent();
          const context = call.args[1];
          expect(context.method).toBe('DELETE');
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/123');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('Error Propagation', () => {
    it('should throw error after handling', (done) => {
      httpClient.get('/api/test').subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should throw AppError from error handler', (done) => {
      const appError = {
        id: 'error-456',
        timestamp: new Date(),
        category: 'server' as const,
        severity: 'high' as const,
        message: 'Server Error',
        userMessage: 'Something went wrong',
        originalError: null,
        statusCode: 500
      };

      errorHandlerService.handleHttpError.and.returnValue(appError);

      httpClient.get('/api/test').subscribe({
        error: (error) => {
          expect(error).toEqual(appError);
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Multiple Requests', () => {
    it('should handle multiple concurrent requests with different errors', (done) => {
      let completed = 0;

      httpClient.get('/api/test1').subscribe({
        error: () => {
          completed++;
          if (completed === 3) done();
        }
      });

      httpClient.get('/api/test2').subscribe({
        error: () => {
          completed++;
          if (completed === 3) done();
        }
      });

      httpClient.get('/api/test3').subscribe({
        error: () => {
          completed++;
          if (completed === 3) done();
        }
      });

      const req1 = httpMock.expectOne('/api/test1');
      const req2 = httpMock.expectOne('/api/test2');
      const req3 = httpMock.expectOne('/api/test3');

      req1.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
      req2.flush('Not Found', { status: 404, statusText: 'Not Found' });
      req3.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle mix of successful and failed requests', (done) => {
      let successCount = 0;
      let errorCount = 0;

      httpClient.get('/api/success').subscribe(() => {
        successCount++;
        if (successCount + errorCount === 2) done();
      });

      httpClient.get('/api/error').subscribe({
        error: () => {
          errorCount++;
          if (successCount + errorCount === 2) done();
        }
      });

      const successReq = httpMock.expectOne('/api/success');
      const errorReq = httpMock.expectOne('/api/error');

      successReq.flush({ data: 'success' });
      errorReq.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle error with no status code', (done) => {
      httpClient.get('/api/test').subscribe({
        error: () => {
          expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.error(new ErrorEvent('Network error'));
    });

    it('should not logout twice on 401', (done) => {
      authService.logout.calls.reset();

      httpClient.get('/api/test').subscribe({
        error: () => {
          expect(authService.logout).toHaveBeenCalledTimes(1);
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle requests with query parameters', (done) => {
      httpClient.get('/api/users?page=1&limit=10').subscribe({
        error: () => {
          const call = errorHandlerService.handleHttpError.calls.mostRecent();
          expect(call.args[1].url).toContain('page=1');
          done();
        }
      });

      const req = httpMock.expectOne('/api/users?page=1&limit=10');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle requests with URL fragments', (done) => {
      httpClient.get('/api/users#section').subscribe({
        error: () => {
          expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/users#section');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('Request Methods', () => {
    it('should handle GET request errors', (done) => {
      httpClient.get('/api/test').subscribe({
        error: () => {
          const call = errorHandlerService.handleHttpError.calls.mostRecent();
          expect(call.args[1].method).toBe('GET');
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle POST request errors', (done) => {
      httpClient.post('/api/users', {}).subscribe({
        error: () => {
          const call = errorHandlerService.handleHttpError.calls.mostRecent();
          expect(call.args[1].method).toBe('POST');
          done();
        }
      });

      const req = httpMock.expectOne('/api/users');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle PATCH request errors', (done) => {
      httpClient.patch('/api/users/1', {}).subscribe({
        error: () => {
          const call = errorHandlerService.handleHttpError.calls.mostRecent();
          expect(call.args[1].method).toBe('PATCH');
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/1');
      req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    });
  });

  describe('Authorization Flow', () => {
    it('should logout and redirect in correct order on 401', (done) => {
      const callOrder: string[] = [];

      authService.logout.and.callFake(() => {
        callOrder.push('logout');
      });

      router.navigate.and.callFake(() => {
        callOrder.push('navigate');
        return Promise.resolve(true);
      });

      httpClient.get('/api/protected').subscribe({
        error: () => {
          expect(callOrder).toEqual(['logout', 'navigate']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should not call logout for 403', (done) => {
      httpClient.get('/api/admin').subscribe({
        error: () => {
          expect(authService.logout).not.toHaveBeenCalled();
          expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/admin');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Error Handler Integration', () => {
    it('should always call handleHttpError', (done) => {
      httpClient.get('/api/test').subscribe({
        error: () => {
          expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should pass HttpErrorResponse to handler', (done) => {
      httpClient.get('/api/test').subscribe({
        error: () => {
          const call = errorHandlerService.handleHttpError.calls.mostRecent();
          const errorResponse = call.args[0];
          expect(errorResponse instanceof HttpErrorResponse).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle all HTTP error status codes', (done) => {
      const statusCodes = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];
      let completed = 0;

      statusCodes.forEach(status => {
        httpClient.get(`/api/test${status}`).subscribe({
          error: () => {
            expect(errorHandlerService.handleHttpError).toHaveBeenCalled();
            completed++;
            if (completed === statusCodes.length) done();
          }
        });
      });

      statusCodes.forEach(status => {
        const req = httpMock.expectOne(`/api/test${status}`);
        req.flush('Error', { status, statusText: 'Error' });
      });
    });
  });
});
