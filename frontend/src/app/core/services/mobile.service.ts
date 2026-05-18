import { Injectable, HostListener } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Mobile & Device Optimization Service
 * ============================================================================
 * Provides utilities for detecting mobile devices, handling mobile-specific
 * interactions, and optimizing the app for iOS and Android.
 *
 * Features:
 * - Device type detection (iOS, Android, web)
 * - Screen size and orientation tracking
 * - Safe area inset management for notched devices
 * - Virtual keyboard detection
 * - Touch event handling
 * - Ionic platform detection
 */

@Injectable({
  providedIn: 'root'
})
export class MobileService {
  // Device detection observables
  private isMobileDevice$ = new BehaviorSubject<boolean>(false);
  private isIonicApp$ = new BehaviorSubject<boolean>(false);
  private isIOS$ = new BehaviorSubject<boolean>(false);
  private isAndroid$ = new BehaviorSubject<boolean>(false);
  private screenWidth$ = new BehaviorSubject<number>(0);
  private screenHeight$ = new BehaviorSubject<number>(0);
  private isPortrait$ = new BehaviorSubject<boolean>(true);
  private isSmallPhone$ = new BehaviorSubject<boolean>(false);
  private isTablet$ = new BehaviorSubject<boolean>(false);
  private virtualKeyboardVisible$ = new BehaviorSubject<boolean>(false);

  // Safe area insets for notched devices
  private safeAreaInsets$ = new BehaviorSubject<{
    top: number;
    right: number;
    bottom: number;
    left: number;
  }>({ top: 0, right: 0, bottom: 0, left: 0 });

  constructor() {
    this.initializeDeviceDetection();
    this.setupEventListeners();
  }

  /**
   * Initialize all device detection logic
   */
  private initializeDeviceDetection(): void {
    this.detectMobileDevice();
    this.detectIOSAndroid();
    this.detectIonicApp();
    this.detectScreenSize();
    this.updateSafeAreaInsets();
  }

  /**
   * Setup window event listeners for responsive updates
   */
  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('orientationchange', () => this.onOrientationChange());
    window.addEventListener('focusin', () => this.onKeyboardShow());
    window.addEventListener('focusout', () => this.onKeyboardHide());
  }

  /**
   * Detect if running on a mobile device
   */
  private detectMobileDevice(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobilePatterns = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const maxTouchPoints = navigator.maxTouchPoints || 0;

    const isMobile = mobilePatterns.test(userAgent) || maxTouchPoints > 0;
    this.isMobileDevice$.next(isMobile);

    console.log('[MobileService] Device detection:', {
      isMobile,
      userAgent: userAgent.substring(0, 50),
      maxTouchPoints
    });
  }

  /**
   * Detect iOS or Android specifically
   */
  private detectIOSAndroid(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    this.isIOS$.next(isIOS);
    this.isAndroid$.next(isAndroid);

    console.log('[MobileService] OS detection:', { isIOS, isAndroid });
  }

  /**
   * Detect if running as an Ionic application
   */
  private detectIonicApp(): void {
    const hasCapacitor = !!(window as any).Capacitor;
    const hasCordova = !!(window as any).cordova;

    this.isIonicApp$.next(hasCapacitor || hasCordova);

    console.log('[MobileService] Ionic detection:', { hasCapacitor, hasCordova });
  }

  /**
   * Detect screen size and device type
   */
  private detectScreenSize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.screenWidth$.next(width);
    this.screenHeight$.next(height);

    const isSmallPhone = width <= 375;
    const isTablet = width >= 768 && width < 1024;
    const isPortrait = height > width;

    this.isSmallPhone$.next(isSmallPhone);
    this.isTablet$.next(isTablet);
    this.isPortrait$.next(isPortrait);

    console.log('[MobileService] Screen detection:', {
      width,
      height,
      isSmallPhone,
      isTablet,
      isPortrait
    });
  }

  /**
   * Update safe area insets for notched devices
   */
  private updateSafeAreaInsets(): void {
    const root = getComputedStyle(document.documentElement);
    const insets = {
      top: parseInt(root.getPropertyValue('--safe-area-inset-top')) || 0,
      right: parseInt(root.getPropertyValue('--safe-area-inset-right')) || 0,
      bottom: parseInt(root.getPropertyValue('--safe-area-inset-bottom')) || 0,
      left: parseInt(root.getPropertyValue('--safe-area-inset-left')) || 0
    };

    this.safeAreaInsets$.next(insets);

    console.log('[MobileService] Safe area insets:', insets);
  }

  /**
   * Handle window resize events
   */
  private onWindowResize(): void {
    this.detectScreenSize();
    this.updateSafeAreaInsets();
  }

  /**
   * Handle orientation change events
   */
  private onOrientationChange(): void {
    setTimeout(() => {
      this.detectScreenSize();
      this.updateSafeAreaInsets();
    }, 100);
  }

  /**
   * Handle virtual keyboard show (iOS/Android)
   */
  private onKeyboardShow(): void {
    this.virtualKeyboardVisible$.next(true);
  }

  /**
   * Handle virtual keyboard hide (iOS/Android)
   */
  private onKeyboardHide(): void {
    this.virtualKeyboardVisible$.next(false);
  }

  // Observable getters
  get isMobileDevice(): Observable<boolean> {
    return this.isMobileDevice$.asObservable();
  }

  get isIonicApp(): Observable<boolean> {
    return this.isIonicApp$.asObservable();
  }

  get isIOS(): Observable<boolean> {
    return this.isIOS$.asObservable();
  }

  get isAndroid(): Observable<boolean> {
    return this.isAndroid$.asObservable();
  }

  get screenWidth(): Observable<number> {
    return this.screenWidth$.asObservable();
  }

  get screenHeight(): Observable<number> {
    return this.screenHeight$.asObservable();
  }

  get isPortrait(): Observable<boolean> {
    return this.isPortrait$.asObservable();
  }

  get isSmallPhone(): Observable<boolean> {
    return this.isSmallPhone$.asObservable();
  }

  get isTablet(): Observable<boolean> {
    return this.isTablet$.asObservable();
  }

  get virtualKeyboardVisible(): Observable<boolean> {
    return this.virtualKeyboardVisible$.asObservable();
  }

  get safeAreaInsets(): Observable<{ top: number; right: number; bottom: number; left: number }> {
    return this.safeAreaInsets$.asObservable();
  }

  // Synchronous getters for immediate access
  get isMobileDeviceSync(): boolean {
    return this.isMobileDevice$.value;
  }

  get isIonicAppSync(): boolean {
    return this.isIonicApp$.value;
  }

  get isIOSSync(): boolean {
    return this.isIOS$.value;
  }

  get isAndroidSync(): boolean {
    return this.isAndroid$.value;
  }

  get screenWidthSync(): number {
    return this.screenWidth$.value;
  }

  get screenHeightSync(): number {
    return this.screenHeight$.value;
  }

  get isPortraitSync(): boolean {
    return this.isPortrait$.value;
  }

  get isSmallPhoneSync(): boolean {
    return this.isSmallPhone$.value;
  }

  get isTabletSync(): boolean {
    return this.isTablet$.value;
  }

  get safeAreaInsetsSync(): { top: number; right: number; bottom: number; left: number } {
    return this.safeAreaInsets$.value;
  }

  /**
   * Request full-screen mode on mobile
   */
  requestFullScreen(): void {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  }

  /**
   * Exit full-screen mode
   */
  exitFullScreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  /**
   * Lock screen orientation (iOS/Android)
   */
  lockOrientation(orientation: 'portrait' | 'landscape'): void {
    const screen = window.screen as any;
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock(orientation).catch((err: any) => {
        console.log('[MobileService] Could not lock orientation:', err);
      });
    }
  }

  /**
   * Prevent zoom on double-tap
   */
  preventDoubleTapZoom(): void {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  /**
   * Get device info summary
   */
  getDeviceInfo(): {
    isMobile: boolean;
    isIonic: boolean;
    os: 'iOS' | 'Android' | 'Web';
    screenSize: 'small-phone' | 'phone' | 'tablet' | 'desktop';
    orientation: 'portrait' | 'landscape';
  } {
    const os = this.isIOSSync ? 'iOS' : this.isAndroidSync ? 'Android' : 'Web';

    let screenSize: 'small-phone' | 'phone' | 'tablet' | 'desktop' = 'desktop';
    if (this.isSmallPhoneSync) {
      screenSize = 'small-phone';
    } else if (this.screenWidthSync <= 480) {
      screenSize = 'phone';
    } else if (this.isTabletSync) {
      screenSize = 'tablet';
    }

    return {
      isMobile: this.isMobileDeviceSync,
      isIonic: this.isIonicAppSync,
      os,
      screenSize,
      orientation: this.isPortraitSync ? 'portrait' : 'landscape'
    };
  }
}
