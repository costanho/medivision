// ============================================================================
// CHUNK 1: IMPORTS + INTERFACES + CONSTRUCTOR
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────
// SECTION 1: ANGULAR CORE IMPORTS
// ─────────────────────────────────────────────────────────────────────────

import { Injectable } from '@angular/core';
// What: Allows Angular to inject this service into components
// Why: Services need this decorator to work with dependency injection
// Example: When LoginComponent asks for AuthService, Angular knows how to provide it


// ─────────────────────────────────────────────────────────────────────────
// SECTION 2: RXJS IMPORTS (Observable patterns)
// ─────────────────────────────────────────────────────────────────────────

import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, switchMap, map, catchError } from 'rxjs/operators';
// BehaviorSubject: A special Observable that:
//   - Always has a current value
//   - Emits that value to subscribers
//   - Notifies when value changes
// Usage: Track "who is logged in" across entire app
//
// Observable: A stream of data that arrives over time
// Usage: Components subscribe to get notified of changes
//
// tap(): Execute code without changing the data
// Usage: Save tokens to localStorage, then pass data to component
// Example: .pipe(tap(response => storage.save(response)))


// ─────────────────────────────────────────────────────────────────────────
// SECTION 3: OUR SERVICE IMPORTS
// ─────────────────────────────────────────────────────────────────────────

import { ApiService } from './api.service';
// What: Service for making HTTP requests to backend
// Usage: Call this.apiService.post('/auth/login', data)

import { StorageService } from './storage.service';
// What: Service for saving/retrieving tokens and user data
// Usage: Call this.storageService.setAccessToken(token)


// ═════════════════════════════════════════════════════════════════════════
// SECTION 4: INTERFACES (Data Type Definitions)
// ═════════════════════════════════════════════════════════════════════════

// What is an Interface?
// - Defines the shape/structure of data
// - Helps TypeScript catch errors
// - Documents what data we expect
// Example: If response doesn't have accessToken, TypeScript warns us

interface AuthResponse {
  // Response from backend when user logs in or registers

  accessToken: string;
  // JWT token to include in future API requests
  // Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  // Used in: Authorization: Bearer <accessToken>

  refreshToken: string;
  // Token to get new accessToken when it expires (24 hours)
  // Stored for later: refreshToken()

  user: {
    // User information from backend database

    id: number;
    // Unique ID in database
    // Example: 1, 2, 3, etc.

    email: string;
    // User's email (unique identifier)
    // Example: "john@test.com"

    fullName: string;
    // User's full name
    // Example: "John Doe"

    role: string;
    // What type of user
    // Options: "PATIENT", "DOCTOR", "ADMIN"
  };
}

interface LoginRequest {
  // Data user sends to backend to login

  email: string;
  // User's email address
  // Example: "john@test.com"

  password: string;
  // User's password (plain text, backend will hash)
  // Example: "myPassword123"
}

interface RegisterRequest {
  // Data user sends to backend to create new account
  // Similar to LoginRequest but with more fields

  fullName: string;
  // New user's full name
  // Example: "John Doe"

  email: string;
  // New user's email address
  // Example: "john@test.com"

  password: string;
  // New user's password
  // Example: "myPassword123"

  role: string;
  // What type of user account
  // Options: "PATIENT", "DOCTOR", "ADMIN"
  // Example: "PATIENT"
}


// ═════════════════════════════════════════════════════════════════════════
// SECTION 5: SERVICE CLASS START
// ═════════════════════════════════════════════════════════════════════════

@Injectable({
  providedIn: 'root'
})
// @Injectable: Decorator that tells Angular this is a service
// providedIn: 'root': Create ONE instance for entire app
//   - All components share the same instance
//   - So if Component A sets user, Component B sees it immediately
//   - No data duplication

export class AuthService {
  // Service for handling all authentication logic
  // Methods: login(), register(), logout()
  // State: currentUser, isAuthenticated
  // Observables: currentUser$, isAuthenticated$


  // ─────────────────────────────────────────────────────────────────────
  // SECTION 6: PRIVATE STATE (Internal tracking)
  // ─────────────────────────────────────────────────────────────────────

  // Private = Only methods inside this class can access
  // Why private? We want to control how state changes
  // Components should call methods, not change state directly

  private currentUserSubject = new BehaviorSubject<any>(null);
  // Tracks the currently logged-in user
  // Starts as null (no one logged in yet)
  // <any> means it can hold any data type
  //
  // Example values:
  //   null                   ← No user logged in
  //   { id: 1, email: "..." }  ← User logged in
  //
  // When we call: this.currentUserSubject.next(userData)
  // All subscribers get notified immediately
  // (Components listening to currentUser$ get the update)

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  // Tracks if user is authenticated (true/false)
  // Starts as false (not authenticated)
  // Simpler than checking if currentUser exists
  //
  // Example values:
  //   false  ← User not logged in
  //   true   ← User logged in
  //
  // Used by: Guards to check if route is protected

  private currentUserRoleSubject = new BehaviorSubject<string | null>(null);
  // 🆕 Tracks the currently logged-in user's role
  // Starts as null (no role yet)
  //
  // Example values:
  //   null           ← No user logged in
  //   "ROLE_PATIENT" ← Patient is logged in
  //   "ROLE_DOCTOR"  ← Doctor is logged in
  //   "ROLE_ADMIN"   ← Admin is logged in
  //
  // Used by: Components that need to render role-specific UI
  // Used by: Guards that check for specific roles


  // ─────────────────────────────────────────────────────────────────────
  // SECTION 7: PUBLIC OBSERVABLES (What components listen to)
  // ─────────────────────────────────────────────────────────────────────

  // Public = Components can access these
  // Observable = Components can subscribe to get notified of changes
  // $ = Convention meaning "this is an Observable"
  //
  // Why public Observable instead of direct access?
  // - Components can listen for changes
  // - But can't directly modify the state
  // - Forces them to use methods (login, logout, etc.)
  // - Safer and more predictable

  public currentUser$ = this.currentUserSubject.asObservable();
  // Observable stream of current user data
  //
  // Components subscribe:
  //   this.auth.currentUser$.subscribe(user => {
  //     console.log('User is:', user);
  //   });
  //
  // When user logs in/out, they get notified automatically


  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  // Observable stream of authentication status
  //
  // Components subscribe:
  //   this.auth.isAuthenticated$.subscribe(isLoggedIn => {
  //     if (isLoggedIn) {
  //       show dashboard
  //     } else {
  //       show login page
  //     }
  //   });
  //
  // When user logs in/out, they get notified automatically

  public currentUserRole$ = this.currentUserRoleSubject.asObservable();
  // 🆕 Observable stream of current user role
  //
  // Components subscribe:
  //   this.auth.currentUserRole$.subscribe(role => {
  //     if (role === 'ROLE_DOCTOR') {
  //       showDoctorDashboard();
  //     } else if (role === 'ROLE_PATIENT') {
  //       showPatientDashboard();
  //     }
  //   });
  //
  // When user logs in/out, role subscribers get notified


  // ─────────────────────────────────────────────────────────────────────
  // SECTION 8: CONSTRUCTOR (Initialize service)
  // ─────────────────────────────────────────────────────────────────────

  constructor(
    private apiService: ApiService,
    private storageService: StorageService
  ) {
    // constructor() runs when service is created (app starts)
    // Angular automatically injects the services we need

    // private apiService: ApiService
    // - Angular provides this service
    // - We store it as a property so methods can use it
    // - This is called "Dependency Injection"
    // - Benefits: Easy to test, decoupled, reusable

    // this.initializeAuth()
    // - When app starts, restore user session if they were logged in before
    // - User closes browser and comes back → should still be logged in!
    // - How? JWT token is saved in localStorage
    // - We load it and update state

    this.initializeAuth();
  }


  // ═════════════════════════════════════════════════════════════════════
  // SECTION 9: PUBLIC METHODS (CHUNK 2)
  // What: Components call these methods
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Register a new user
   *
   * @param data - User registration data (fullName, email, password, role)
   * @returns Observable<AuthResponse> - Observable that component subscribes to
   *
   * Flow:
   * 1. Component calls: auth.register({fullName, email, password, role})
   * 2. API sends POST /auth/register to backend
   * 3. Backend creates user, returns JWT tokens
   * 4. tap() operator saves tokens & user
   * 5. Observable completes, component gets response
   * 6. All subscribers to currentUser$ are notified
   *
   * Example usage in component:
   *   this.authService.register(formData).subscribe(
   *     (response) => {
   *       console.log('Registration successful!', response.user);
   *       this.router.navigate(['/dashboard']);
   *     },
   *     (error) => {
   *       console.log('Registration failed:', error);
   *     }
   *   );
   */
  public register(data: RegisterRequest): Observable<AuthResponse> {
    // Call API service to make HTTP POST request
    // Returns Observable (data not yet available)
    return this.apiService.post<AuthResponse>('/auth/register', data)
      .pipe(
        // tap() executes when response arrives, doesn't change data
        tap(response => {
          // Save tokens immediately
          console.log('[AuthService] Saving tokens from register response...');
          this.storageService.setAccessToken(response.accessToken);
          this.storageService.setRefreshToken(response.refreshToken);
          this.storageService.setUser(response.user);
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }),
        // After tokens are saved, fetch the role from /api/auth/me
        switchMap(response => {
          console.log('[AuthService] Fetching user role after registration...');
          return this.fetchUserInfoAndSetRole().pipe(
            // Return the original response so component gets it
            map(() => response),
            // If /auth/me fails, still return the original response
            // The login was successful; we just couldn't get the role
            catchError(error => {
              console.warn('[AuthService] Failed to fetch role after registration, but login succeeded:', error);
              return of(response);
            })
          );
        })
      );
    // Return Observable to component for subscription
  }


  /**
   * Login an existing user
   *
   * @param data - User login credentials (email, password)
   * @returns Observable<AuthResponse> - Observable that component subscribes to
   *
   * Flow:
   * 1. Component calls: auth.login({email, password})
   * 2. API sends POST /auth/login to backend
   * 3. Backend validates credentials, returns JWT tokens
   * 4. tap() operator saves tokens & user
   * 5. Observable completes, component gets response
   * 6. All subscribers to currentUser$ are notified
   *
   * Example usage in component:
   *   this.authService.login({email, password}).subscribe(
   *     (response) => {
   *       console.log('Login successful!');
   *       this.router.navigate(['/dashboard']);
   *     },
   *     (error) => {
   *       console.log('Login failed:', error);
   *       this.errorMessage = 'Invalid email or password';
   *     }
   *   );
   */
  public login(data: LoginRequest): Observable<AuthResponse> {
    // Call API service to make HTTP POST request
    return this.apiService.post<AuthResponse>('/auth/login', data)
      .pipe(
        // When response arrives from backend, save tokens
        tap(response => {
          // Save tokens immediately
          console.log('[AuthService] Saving tokens from login response...');
          this.storageService.setAccessToken(response.accessToken);
          this.storageService.setRefreshToken(response.refreshToken);
          this.storageService.setUser(response.user);
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }),
        // After tokens are saved, fetch the role from /api/auth/me
        switchMap(response => {
          console.log('[AuthService] Fetching user role after login...');
          return this.fetchUserInfoAndSetRole().pipe(
            // Return the original response so component gets it
            map(() => response),
            // If /auth/me fails, still return the original response
            // The login was successful; we just couldn't get the role
            catchError(error => {
              console.warn('[AuthService] Failed to fetch role after login, but login succeeded:', error);
              return of(response);
            })
          );
        })
      );
    // Return Observable to component
  }


  /**
   * Logout the current user
   *
   * This immediately clears everything without API call
   * (Backend doesn't need to know, JWT just won't be used)
   *
   * What happens:
   * 1. Clear localStorage (remove tokens and user)
   * 2. Update currentUserSubject to null
   * 3. Update isAuthenticatedSubject to false
   * 4. All subscribers get notified
   *
   * Example usage in component:
   *   logout() {
   *     this.authService.logout();
   *     this.router.navigate(['/login']);
   *   }
   */
  public logout(): void {
    // Step 1: Clear all stored data
    // This removes accessToken, refreshToken, and user from localStorage
    this.storageService.clear();

    // Step 2: Notify all subscribers: "No user logged in"
    // currentUser$ subscribers will receive: null
    // Header component will hide "Welcome John" message
    // Dashboard component will redirect to login
    this.currentUserSubject.next(null);

    // Step 3: Notify all subscribers: "Not authenticated"
    // isAuthenticated$ subscribers will receive: false
    // Guards will reject access to protected routes
    this.isAuthenticatedSubject.next(false);

    // Step 4: 🆕 Clear user role
    // currentUserRole$ subscribers will receive: null
    // Role-based UI will hide role-specific features
    this.currentUserRoleSubject.next(null);
    localStorage.removeItem('userRole');

    // No need to return anything - this is void (no return value)
  }


  /**
   * Refresh JWT token when it's expired or about to expire
   *
   * Tokens expire after 24 hours. Before they expire, call this
   * to get fresh tokens and stay logged in without re-entering password.
   *
   * @returns Observable<AuthResponse> - New tokens
   *
   * Flow:
   * 1. Token is about to expire (or expired)
   * 2. Component calls: auth.refreshToken()
   * 3. Get refreshToken from localStorage
   * 4. Send POST /auth/refresh with refreshToken
   * 5. Backend validates, returns new accessToken
   * 6. Save new token, update subscribers
   * 7. Continue using app without interruption
   *
   * Example usage in component/service:
   *   if (tokenAboutToExpire()) {
   *     this.authService.refreshToken().subscribe(
   *       (response) => {
   *         console.log('Token refreshed!');
   *       },
   *       (error) => {
   *         console.log('Refresh failed, redirect to login');
   *         this.router.navigate(['/login']);
   *       }
   *     );
   *   }
   */
  public refreshToken(): Observable<AuthResponse> {
    // Step 1: Get the refreshToken from localStorage
    const refreshToken = this.storageService.getRefreshToken();

    // Step 2: Check if refreshToken exists
    // If user never logged in, or cleared localStorage, refreshToken will be null
    if (!refreshToken) {
      // Throw error - user must login again
      throw new Error('No refresh token available');
    }

    // Step 3: Call API to get new accessToken
    // Send the old refreshToken to backend
    // Backend validates it, returns new accessToken
    return this.apiService.post<AuthResponse>('/auth/refresh', {
      refreshToken: refreshToken
    })
      .pipe(
        // When new token arrives, save it
        tap(response => {
          console.log('[AuthService] Saving new tokens from refresh response...');
          this.storageService.setAccessToken(response.accessToken);
          this.storageService.setRefreshToken(response.refreshToken);
          this.storageService.setUser(response.user);
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }),
        // After tokens are saved, fetch the role from /api/auth/me
        switchMap(response => {
          console.log('[AuthService] Fetching user role after token refresh...');
          return this.fetchUserInfoAndSetRole().pipe(
            // Return the original response so caller gets it
            map(() => response),
            // If /auth/me fails, still return the original response
            // The token refresh was successful; we just couldn't get the role
            catchError(error => {
              console.warn('[AuthService] Failed to fetch role after token refresh, but refresh succeeded:', error);
              return of(response);
            })
          );
        })
      );
  }


  // ═════════════════════════════════════════════════════════════════════
  // SECTION 10: SIMPLE GETTER METHODS
  // What: Check current state without subscriptions
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Check if user is currently authenticated
   *
   * @returns boolean - true if user is logged in, false if not
   *
   * Use this in guards, ngIf conditions, or logic that needs current state
   * (Not for listening to changes - use isAuthenticated$ Observable for that)
   *
   * Example:
   *   if (this.authService.isAuthenticated()) {
   *     allowNavigation();
   *   } else {
   *     redirectToLogin();
   *   }
   */
  public isAuthenticated(): boolean {
    // Return current value from BehaviorSubject
    // .value gives us the current value without subscribing
    return this.isAuthenticatedSubject.value;
  }


  /**
   * Get the currently logged-in user
   *
   * @returns any - User object with { id, email, fullName, role } or null
   *
   * Use this in components that need current user info
   * (Not for listening to changes - use currentUser$ Observable for that)
   *
   * Example:
   *   const currentUser = this.authService.getCurrentUser();
   *   console.log('Hello', currentUser.fullName);
   */
  public getCurrentUser(): any {
    // Return current value from BehaviorSubject
    // Will be user object if logged in, or null if not
    return this.currentUserSubject.value;
  }


  /**
   * 🆕 Get the currently logged-in user's role
   *
   * @returns string | null - Role like "ROLE_PATIENT", "ROLE_DOCTOR", "ROLE_ADMIN" or null
   *
   * Use this in components/guards that need to check user role
   * (Not for listening to changes - use currentUserRole$ Observable for that)
   *
   * Example:
   *   const role = this.authService.getCurrentRole();
   *   if (role === 'ROLE_DOCTOR') {
   *     showDoctorFeatures();
   *   }
   */
  public getCurrentRole(): string | null {
    // Return current value from BehaviorSubject
    // Will be role string if logged in, or null if not
    return this.currentUserRoleSubject.value;
  }


  /**
   * Fetch full user information from /auth/me endpoint
   *
   * This retrieves the complete user profile including all fields from the auth database
   *
   * @returns Observable<any> - Full user information
   *
   * Example:
   *   this.authService.getAuthUserInfo().subscribe(userInfo => {
   *     console.log('Full user info:', userInfo);
   *   });
   */
  public getAuthUserInfo(): Observable<any> {
    return this.apiService.get<any>('/auth/me');
  }


  // ═════════════════════════════════════════════════════════════════════
  // SECTION 11: PRIVATE HELPER METHODS (CHUNK 3)
  // What: Only this service uses these
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Private helper: Handle successful authentication response
   *
   * Called by: register(), login(), refreshToken()
   * Purpose: Save tokens and notify subscribers
   *
   * @param response - AuthResponse from backend with tokens and user
   *
   * What this does:
   * 1. Save accessToken to localStorage (needed for API requests)
   * 2. Save refreshToken to localStorage (needed when token expires)
   * 3. Save user data to localStorage (needed to show user info)
   * 4. Update currentUserSubject → notifies currentUser$ subscribers
   * 5. Update isAuthenticatedSubject → notifies isAuthenticated$ subscribers
   * 6. 🆕 Fetch full user info from /api/auth/me to get role
   * 7. 🆕 Update currentUserRoleSubject with user role
   *
   * Why important?
   * - Without saving tokens, next page refresh = user loses authentication
   * - Notifying subscribers = entire app updates instantly
   * - Header shows "Welcome John" without delay
   * - Dashboard shows real data immediately
   * - Guards allow access without checking backend
   * - Role is needed for role-based routing and UI
   */
  private handleAuthResponse(response: AuthResponse): void {
    console.log('[AuthService] handleAuthResponse called with response:', response);

    // ═════════════════════════════════════════════════════════════
    // STEP 1: Save accessToken to localStorage
    // ═════════════════════════════════════════════════════════════
    console.log('[AuthService] Saving accessToken to storage...');
    this.storageService.setAccessToken(response.accessToken);

    // ═════════════════════════════════════════════════════════════
    // STEP 2: Save refreshToken to localStorage
    // ═════════════════════════════════════════════════════════════
    console.log('[AuthService] Saving refreshToken to storage...');
    this.storageService.setRefreshToken(response.refreshToken);

    // ═════════════════════════════════════════════════════════════
    // STEP 3: Save user data to localStorage
    // ═════════════════════════════════════════════════════════════
    console.log('[AuthService] Saving user data to storage...');
    this.storageService.setUser(response.user);

    // ═════════════════════════════════════════════════════════════
    // STEP 4: Update currentUserSubject
    // ═════════════════════════════════════════════════════════════
    console.log('[AuthService] Updating currentUserSubject...');
    this.currentUserSubject.next(response.user);

    // ═════════════════════════════════════════════════════════════
    // STEP 5: Update isAuthenticatedSubject
    // ═════════════════════════════════════════════════════════════
    console.log('[AuthService] Setting isAuthenticated to true');
    this.isAuthenticatedSubject.next(true);

    // ═════════════════════════════════════════════════════════════
    // STEP 6: 🆕 Fetch full user info from /api/auth/me to get role
    // ═════════════════════════════════════════════════════════════
    // The login/register response doesn't include role
    // But /api/auth/me returns full UserInfoResponse with role
    // We need this for role-based routing
    console.log('[AuthService] Fetching user role from /api/auth/me...');
    this.fetchUserInfoAndSetRole();

    console.log('[AuthService] ✓ handleAuthResponse complete!');
  }


  /**
   * 🆕 Private helper: Fetch user info from /api/auth/me and set role
   *
   * Purpose: Get full user info including role after login
   * Called by: handleAuthResponse()
   *
   * Why needed?
   * - Login endpoint only returns tokens, not role
   * - /api/auth/me returns full UserInfoResponse with role
   * - Role is needed for role-based routing and UI
   *
   * Returns Observable so caller can wait for role to be fetched before proceeding
   */
  private fetchUserInfoAndSetRole(): Observable<any> {
    // Call /api/auth/me endpoint to get full user info
    // This endpoint is protected (requires JWT token)
    // We just saved the token, so this will work
    return this.apiService.get<any>('/auth/me').pipe(
      tap(
        (userInfo) => {
          // ✓ Successfully fetched user info
          console.log('[AuthService] Fetched user info from /api/auth/me:', userInfo);

          // Save the FULL user object to localStorage (has fullName, email, id, role)
          this.storageService.setUser(userInfo);
          console.log('[AuthService] ✓ User saved to localStorage');

          // Update currentUserSubject so components get the full user data
          this.currentUserSubject.next(userInfo);
          console.log('[AuthService] ✓ currentUserSubject updated with full user data');

          // Extract role from response
          const role = userInfo.role;
          console.log('[AuthService] User role:', role);

          // Save role to localStorage for persistence
          localStorage.setItem('userRole', role);

          // Update currentUserRoleSubject to notify subscribers
          // Components listening to currentUserRole$ will get the role
          this.currentUserRoleSubject.next(role);
          console.log('[AuthService] ✓ User role set and stored');
        }
      )
    );
    // Note: We don't catch errors here. If /api/auth/me fails,
    // the login/register Observable will fail, and the component will handle it.
    // This is OK because the user is still authenticated; they just can't determine their role.
  }


  /**
   * Private helper: Restore user session on app startup
   *
   * Called by: constructor (when app starts)
   * Purpose: Check if user was logged in before and restore session
   *
   * Scenario:
   * 1. User logs in → tokens saved in localStorage
   * 2. User closes browser
   * 3. App is shut down completely
   * 4. User opens browser again
   * 5. App starts from scratch
   * 6. initializeAuth() runs in constructor
   * 7. Checks: "Is user data in localStorage?"
   * 8. Yes? → Restore session (user stays logged in!)
   * 9. No? → Session stays empty (user sees login page)
   *
   * Why important?
   * - Without this: User must login every time they close browser
   * - With this: User stays logged in for 24 hours (token lifetime)
   * - Better UX: Less annoying for users
   * - Works across browser refreshes/tab switches
   *
   * Security note:
   * - JWT tokens are stored in localStorage (secure for web)
   * - Could use sessionStorage for more security (clears on browser close)
   * - For now, localStorage is standard practice
   */
  private initializeAuth(): void {
    // ═════════════════════════════════════════════════════════════
    // STEP 1: Check if user data exists in localStorage
    // ═════════════════════════════════════════════════════════════
    // When user logs in, we save: storage.setUser(userData)
    // Now we try to retrieve it
    // Will be null if no user was ever logged in
    // Will be user object if user was previously logged in
    const user = this.storageService.getUser();

    // ═════════════════════════════════════════════════════════════
    // STEP 2: Check if JWT token exists in localStorage
    // ═════════════════════════════════════════════════════════════
    // When user logs in, we save: storage.setAccessToken(token)
    // If token exists, user is still valid
    // If token doesn't exist, user never logged in (or logged out)
    const isLoggedIn = this.storageService.isLoggedIn();
    // isLoggedIn() returns: !!this.getAccessToken()
    // true if token exists, false if it doesn't

    console.log('[AuthService] Initializing auth state...');
    console.log('[AuthService] User from storage:', user ? user.email : 'NO USER');
    console.log('[AuthService] Token from storage:', isLoggedIn ? 'TOKEN EXISTS' : 'NO TOKEN');

    // ═════════════════════════════════════════════════════════════
    // STEP 3: Decide what to do
    // ═════════════════════════════════════════════════════════════
    if (isLoggedIn && user) {
      // CASE 1: Both token AND user data exist
      // → User was logged in before
      // → Restore the session!

      // Update state with stored user data
      // This is same as what happens after login
      // Notify subscribers: "User is logged in"
      this.currentUserSubject.next(user);

      // Update state: authenticated = true
      // Guards will allow access to protected routes
      // Components will show logged-in UI
      this.isAuthenticatedSubject.next(true);

      // 🆕 Restore role from localStorage
      const storedRole = localStorage.getItem('userRole');
      if (storedRole) {
        this.currentUserRoleSubject.next(storedRole);
        console.log('[AuthService] Session restored with role:', storedRole);
      }

      // Log for debugging
      console.log('[AuthService] ✓ Session restored:', user.email);

    } else {
      // CASE 2: No token OR no user data
      // → User was never logged in OR logged out
      // → Start with empty session

      // Make sure state is empty
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);

      // 🆕 Clear role
      this.currentUserRoleSubject.next(null);
      localStorage.removeItem('userRole');

      // Log for debugging
      console.log('[AuthService] ✗ No previous session found');
    }

    // ═════════════════════════════════════════════════════════════
    // THAT'S IT! Session initialized!
    // ═════════════════════════════════════════════════════════════
    // If user was logged in: ✓ Session restored (no login needed)
    // If user wasn't logged in: ✓ Start fresh (show login page)
  }

}
