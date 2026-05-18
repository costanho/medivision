import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../services/auth.service';

/**
 * User Context Interceptor
 *
 * The backend Direct Service expects the user email and role as custom headers
 * instead of extracting them from JWT token.
 *
 * This interceptor:
 * 1. Decodes the JWT token
 * 2. Extracts the user email from the "sub" claim
 * 3. Gets the user role from AuthService
 * 4. Adds X-User-Email and X-User-Role headers to all requests
 */
export const userContextInterceptor: HttpInterceptorFn = (request, next) => {
  const storageService = inject(StorageService);
  const authService = inject(AuthService);
  const token = storageService.getAccessToken();

  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const userEmail = payload.sub;

        if (userEmail) {
          const headers: any = {
            'X-User-Email': userEmail
          };

          // Get user role from AuthService
          const currentUser = authService.getCurrentUser();
          let role: string | null = null;

          // Try to get role from current user object
          if (currentUser && currentUser.role) {
            role = currentUser.role;
          } else {
            // Fallback: Try to get role from localStorage (set by fetchUserInfoAndSetRole)
            role = localStorage.getItem('userRole');
          }

          if (role) {
            // Ensure role has ROLE_ prefix
            if (!role.startsWith('ROLE_')) {
              role = 'ROLE_' + role;
            }
            headers['X-User-Role'] = role;
          } else {
            // Default to PATIENT if role not available
            headers['X-User-Role'] = 'ROLE_PATIENT';
          }

          request = request.clone({
            setHeaders: headers
          });
        }
      }
    } catch (e) {
      // Silently fail if JWT decode fails
    }
  }

  return next(request);
};
