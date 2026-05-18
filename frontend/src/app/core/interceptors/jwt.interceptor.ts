import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { tap, catchError } from 'rxjs';
import { throwError } from 'rxjs';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../services/auth.service';

/**
 * JWT Interceptor (Functional approach for Angular 14.3+)
 *
 * Automatically attaches JWT token to all HTTP requests that require authentication
 *
 * - Retrieves token from localStorage via StorageService
 * - Adds Authorization: Bearer {token} header to protected endpoints
 * - Skips auth for public endpoints (login, register, refresh)
 * - Logs all interceptor activity for debugging
 */
export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  // Get the StorageService and AuthService from dependency injection
  const storageService = inject(StorageService);
  const authService = inject(AuthService);

  // Get the JWT token from storage
  const token = storageService.getAccessToken();
  const currentUser = authService.getCurrentUser();

  // Debug logging
  console.log('[JwtInterceptor] ═══════════════════════════════════════════');
  console.log('[JwtInterceptor] Request URL:', request.url);
  console.log('[JwtInterceptor] Request Method:', request.method);
  console.log('[JwtInterceptor] Token exists:', !!token);
  if (token) {
    console.log('[JwtInterceptor] Token value:', `${token.substring(0, 30)}...${token.substring(token.length - 10)}`);
  }
  console.log('[JwtInterceptor] Current user email:', currentUser?.email);

  // Endpoints that do NOT need JWT (user not authenticated yet)
  const noAuthRequired = ['/auth/login', '/auth/register', '/auth/refresh'];
  const isNoAuthEndpoint = noAuthRequired.some(endpoint => request.url.includes(endpoint));

  // Add token and user email to request if it exists AND endpoint requires auth
  if (token && !isNoAuthEndpoint) {
    console.log('[JwtInterceptor] ✓ Adding Authorization and X-User-Email headers...');

    const headers: any = {
      Authorization: `Bearer ${token}`
    };

    // Extract email from JWT token (sub field is the email)
    // Try to get from currentUser first, fallback to decoding JWT
    let userEmail = currentUser?.email;

    if (!userEmail) {
      // Decode JWT to get email from 'sub' claim
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          // Add padding if needed
          const padded = payload + Array(5 - (payload.length % 4)).join('=');
          const decoded = JSON.parse(atob(padded));
          userEmail = decoded.sub || decoded.email;
          console.log('[JwtInterceptor] Extracted email from JWT token:', userEmail);
        }
      } catch (e) {
        console.warn('[JwtInterceptor] Failed to decode JWT:', e);
      }
    }

    // Add X-User-Email header with the email (required by backend for filtering)
    if (userEmail) {
      headers['X-User-Email'] = userEmail;
      console.log('[JwtInterceptor] ✓ Adding X-User-Email header:', userEmail);
    } else {
      console.warn('[JwtInterceptor] ⚠ No user email available for X-User-Email header');
    }

    request = request.clone({ setHeaders: headers });

    console.log('[JwtInterceptor] ✓ Headers added!');
    console.log('[JwtInterceptor] All headers:', request.headers.keys());
    console.log('[JwtInterceptor] Authorization header value:', request.headers.get('Authorization'));
    console.log('[JwtInterceptor] X-User-Email header value:', request.headers.get('X-User-Email'));
  } else if (!token && !isNoAuthEndpoint) {
    console.error('[JwtInterceptor] ✗ NO TOKEN but endpoint requires auth:', request.url);
  } else if (isNoAuthEndpoint) {
    console.log('[JwtInterceptor] - No auth needed for:', request.url);
  }

  console.log('[JwtInterceptor] ═══════════════════════════════════════════');

  // Execute request and handle response
  return next(request).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        console.log('[JwtInterceptor] ✓ Response received:', event.status, event.url);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      console.error('[JwtInterceptor] ✗ HTTP Error:', error.status, error.statusText);
      console.error('[JwtInterceptor] Error message:', error.message);
      console.error('[JwtInterceptor] Error body:', error.error);
      return throwError(() => error);
    })
  );
};
