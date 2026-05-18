import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

/**
 * CareNexus Root Application Component
 * ============================================================================
 * Initializes Ionic-specific mobile features for iOS and Android
 *
 * Features:
 * - Status bar customization (iOS & Android)
 * - Keyboard plugin integration
 * - Hardware back button handling
 * - App state listeners (pause/resume)
 * - Platform-specific initialization
 * - Safe area support
 */

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private backButtonSubscription: any;

  constructor(
    private platform: Platform,
    private router: Router
  ) {
    this.initializeApp();
  }

  ngOnInit(): void {
    try {
      this.setupPlatformListeners();
    } catch (error) {
      console.warn('[AppComponent] Platform listeners setup failed:', error);
    }
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

  /**
   * Initialize the Ionic application with platform-specific features
   */
  private initializeApp(): void {
    this.platform.ready().then(async () => {
      console.log('[AppComponent] Platform ready:', this.platform.platforms());

      // Initialize status bar for iOS
      await this.initializeStatusBar();

      // Initialize keyboard behavior
      await this.initializeKeyboard();

      // Handle app pause/resume
      await this.handleAppStateChanges();

      // Setup back button handler
      await this.setupBackButtonHandler();

      // Log platform info
      this.logPlatformInfo();
    });
  }

  /**
   * Initialize Status Bar styling for native apps
   */
  private async initializeStatusBar(): Promise<void> {
    try {
      // Only run on native platforms (iOS/Android), not on web or mobileweb
      if (!this.platform.is('mobileweb') && this.isNativeEnvironment()) {
        try {
          // Dynamically import StatusBar for native apps only
          // Use string concatenation to avoid Vite static analysis
          const moduleName = '@capacitor/status-bar'.split('/').join('/');
          // @ts-ignore - Capacitor plugins are optional dependencies
          const { StatusBar } = await (window as any).__capacitorStatusBar ||
            import(/* @vite-ignore */ moduleName).catch(() => ({}));

          if (StatusBar) {
            // Set status bar style for both iOS and Android
            await StatusBar.setStyle({ style: 'light' });

            // Set status bar color to match app theme (CareNexus purple)
            await StatusBar.setBackgroundColor({ color: '#667eea' });

            // Handle overlay mode for iOS
            if (this.platform.is('ios')) {
              await StatusBar.setOverlaysWebView({ overlay: true });
            }

            console.log('[AppComponent] Status bar initialized');
          }
        } catch {
          // Plugin not available, this is expected in web/dev environment
        }
      }
    } catch (error) {
      console.warn('[AppComponent] Status bar initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Initialize keyboard plugin for better mobile UX
   */
  private async initializeKeyboard(): Promise<void> {
    try {
      if (!this.platform.is('mobileweb') && this.isNativeEnvironment()) {
        try {
          // Dynamically import Keyboard for native apps only
          // Use string concatenation to avoid Vite static analysis
          const moduleName = '@capacitor/keyboard'.split('/').join('/');
          // @ts-ignore - Capacitor plugins are optional dependencies
          const { Keyboard } = await (window as any).__capacitorKeyboard ||
            import(/* @vite-ignore */ moduleName).catch(() => ({}));

          if (Keyboard) {
            // Prevent keyboard from pushing content up on scroll
            await Keyboard.setAccessoryBarVisible({ isVisible: false });

            // Listen for keyboard events
            Keyboard.addListener('keyboardWillShow', () => {
              document.body.classList.add('keyboard-open');
              console.log('[AppComponent] Keyboard shown');
            });

            Keyboard.addListener('keyboardWillHide', () => {
              document.body.classList.remove('keyboard-open');
              console.log('[AppComponent] Keyboard hidden');
            });

            console.log('[AppComponent] Keyboard listeners initialized');
          }
        } catch {
          // Plugin not available, this is expected in web/dev environment
        }
      }
    } catch (error) {
      console.warn('[AppComponent] Keyboard initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Setup hardware back button handler
   */
  private async setupBackButtonHandler(): Promise<void> {
    try {
      if (!this.platform.is('mobileweb') && this.isNativeEnvironment()) {
        try {
          // Dynamically import App for native apps only
          // Use string concatenation to avoid Vite static analysis
          const moduleName = '@capacitor/app'.split('/').join('/');
          // @ts-ignore - Capacitor plugins are optional dependencies
          const { App } = await (window as any).__capacitorApp ||
            import(/* @vite-ignore */ moduleName).catch(() => ({}));

          if (App && App.addListener) {
            this.backButtonSubscription = App.addListener('backButton', async () => {
              // Check if we're on the login/register page
              const currentUrl = this.router.url;

              if (currentUrl === '/login' || currentUrl === '/register' || currentUrl === '/') {
                // On auth pages or home, minimize app instead of closing
                await App.minimizeApp();
              } else {
                // Navigate back
                window.history.back();
              }
            });

            console.log('[AppComponent] Back button handler initialized');
          }
        } catch {
          // Plugin not available, this is expected in web/dev environment
        }
      }
    } catch (error) {
      console.warn('[AppComponent] Back button handler failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Setup app state change listeners (pause/resume)
   */
  private async handleAppStateChanges(): Promise<void> {
    try {
      if (!this.platform.is('mobileweb') && this.isNativeEnvironment()) {
        try {
          // Dynamically import App for native apps only
          // Use string concatenation to avoid Vite static analysis
          const moduleName = '@capacitor/app'.split('/').join('/');
          // @ts-ignore - Capacitor plugins are optional dependencies
          const { App } = await (window as any).__capacitorApp ||
            import(/* @vite-ignore */ moduleName).catch(() => ({}));

          if (App && App.addListener) {
            // App pause (backgrounded)
            App.addListener('pause', () => {
              console.log('[AppComponent] App paused - save state here');
              document.body.classList.add('app-paused');
            });

            // App resume (brought to foreground)
            App.addListener('resume', () => {
              console.log('[AppComponent] App resumed - refresh data here');
              document.body.classList.remove('app-paused');
            });

            // App destroy (closing)
            App.addListener('destroy', () => {
              console.log('[AppComponent] App destroying');
            });

            console.log('[AppComponent] App state listeners initialized');
          }
        } catch {
          // Plugin not available, this is expected in web/dev environment
        }
      }
    } catch (error) {
      console.warn('[AppComponent] App state listeners failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Setup platform-specific listeners
   */
  private setupPlatformListeners(): void {
    // Listen for window resize (orientation change)
    window.addEventListener('orientationchange', () => {
      console.log('[AppComponent] Orientation changed');
    });

    // Handle viewport changes if visualViewport is available
    const viewport = (window as any).visualViewport;
    if (viewport) {
      window.addEventListener('visualviewport', () => {
        const vp = (window as any).visualViewport;
        if (vp) {
          console.log('[AppComponent] Viewport changed:', {
            width: vp.width,
            height: vp.height,
            offsetTop: vp.offsetTop
          });
        }
      });
    }
  }

  /**
   * Log platform and device information
   */
  private logPlatformInfo(): void {
    const platformInfo = {
      platforms: this.platform.platforms(),
      isIOS: this.platform.is('ios'),
      isAndroid: this.platform.is('android'),
      isMobileWeb: this.platform.is('mobileweb'),
      isCapacitor: this.platform.is('capacitor'),
      isCordova: this.platform.is('cordova'),
      isElectron: this.platform.is('electron'),
      isDesktop: this.platform.is('desktop'),
      isTablet: this.platform.is('tablet'),
      isMobile: this.platform.is('mobile'),
      userAgent: navigator.userAgent.substring(0, 100)
    };

    console.log('[AppComponent] Platform Info:', platformInfo);
  }

  /**
   * Check if running in a native environment (iOS/Android with Capacitor)
   */
  private isNativeEnvironment(): boolean {
    return !!(window as any).CapacitorConsoleHandler || !!(window as any).Capacitor;
  }

  /**
   * Get current platform for template usage if needed
   */
  get isNativeApp(): boolean {
    return this.platform.is('ios') || this.platform.is('android');
  }

  get isIOS(): boolean {
    return this.platform.is('ios');
  }

  get isAndroid(): boolean {
    return this.platform.is('android');
  }
}
