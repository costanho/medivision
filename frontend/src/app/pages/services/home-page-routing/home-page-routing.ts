import { Routes } from '@angular/router';

/**
 * Home Page Routes (Lazy-Loaded Child Routes)
 *
 * Public routes for the home/landing page, authentication pages, and error pages.
 * These routes do not require authentication and are loaded on-demand.
 * Lazy-loaded under /home path in app.routes.ts
 *
 * Routes (accessed as /home/* since parent path is 'home'):
 * - '/home' (empty path) - Landing page
 * - '/home/login' - Login page
 * - '/home/register' - Registration page
 * - '/home/404' - Not found page
 * - '/home/**' - Catch-all wildcard route (must be last)
 */
export const homePageRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../landing/landing.component')
      .then(m => m.LandingComponent),
    data: { title: 'Home' }
  },
  {
    path: 'login',
    loadComponent: () => import('../../../auth/pages/login/login.component')
      .then(m => m.LoginComponent),
    data: { title: 'Login' }
  },
  {
    path: 'register',
    loadComponent: () => import('../../../auth/pages/register/register.component')
      .then(m => m.RegisterComponent),
    data: { title: 'Register' }
  },
  {
    path: '404',
    loadComponent: () => import('../../not-found/not-found.component')
      .then(m => m.NotFoundComponent),
    data: { title: 'Page Not Found' }
  },
  {
    path: '**',
    loadComponent: () => import('../../not-found/not-found.component')
      .then(m => m.NotFoundComponent),
    data: { title: 'Page Not Found' }
  }
];
