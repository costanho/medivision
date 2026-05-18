// Polyfill for global object (needed for stompjs/sockjs-client in browser environment)
if (typeof window !== 'undefined' && !(window as any).global) {
  (window as any).global = window;
}

import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { jwtInterceptor } from './app/core/interceptors/jwt.interceptor';
import { ErrorInterceptor } from './app/core/interceptors/error.interceptor';
import { userContextInterceptor } from './app/core/interceptors/user-context.interceptor';
import { HttpLoggingInterceptor } from './app/core/interceptors/http-logging.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    // Register HTTP interceptors
    // CLASS-BASED: ErrorInterceptor, HttpLoggingInterceptor (for error handling and logging)
    // FUNCTIONAL: jwtInterceptor, userContextInterceptor (lighter weight for auth)
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: HttpLoggingInterceptor, multi: true },
    provideHttpClient(
      withInterceptors([jwtInterceptor, userContextInterceptor])
    ),
  ],
});
