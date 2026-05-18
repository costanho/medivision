/**
 * Notification Service
 * 
 * Comprehensive notification system with:
 * - Browser notifications (Notification API)
 * - Toast notifications (in-app)
 * - Sound notifications (audio playback)
 * - Unread message badges
 * - Tab title updates
 * - User preferences management
 */

import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'message';
export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

export interface NotificationSettings {
  enableBrowserNotifications: boolean;
  enableToastNotifications: boolean;
  enableSoundNotifications: boolean;
  enableBadge: boolean;
  soundVolume: number; // 0-1
  toastDuration: number; // ms
  toastPosition: NotificationPosition;
  requestBrowserPermission: boolean;
}

export interface ToastMessage {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration: number;
  dismissible: boolean;
  timestamp: Date;
}

export interface BrowserNotificationData {
  title: string;
  options: NotificationOptions;
  sound?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  /**
   * Default notification settings
   */
  private defaultSettings: NotificationSettings = {
    enableBrowserNotifications: true,
    enableToastNotifications: true,
    enableSoundNotifications: true,
    enableBadge: true,
    soundVolume: 0.7,
    toastDuration: 4000,
    toastPosition: 'top-right',
    requestBrowserPermission: true
  };

  /**
   * Current notification settings
   */
  private settings$ = new BehaviorSubject<NotificationSettings>(this.defaultSettings);

  /**
   * Unread message count
   */
  private unreadCount$ = new BehaviorSubject<number>(0);

  /**
   * Toast messages stream
   */
  private toastMessages$ = new Subject<ToastMessage>();

  /**
   * All toast messages
   */
  private allToasts$ = new BehaviorSubject<ToastMessage[]>([]);

  /**
   * Browser notification permission status
   */
  private browserPermissionStatus$ = new BehaviorSubject<NotificationPermission>('default');

  /**
   * Application is in focus
   */
  private isAppFocused = true;

  /**
   * Original document title
   */
  private originalTitle = typeof document !== 'undefined' ? document.title : '';

  /**
   * Audio context for sound notifications
   */
  private audioContext: AudioContext | null = null;

  /**
   * Notification sounds map
   */
  private sounds = new Map<string, HTMLAudioElement>();

  constructor(private ngZone: NgZone) {
    this.initializeBrowserNotifications();
    this.setupAppFocusTracking();
    this.loadSettings();
  }

  /**
   * Initialize browser notifications
   */
  private initializeBrowserNotifications(): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // Check current permission status
    this.browserPermissionStatus$.next(Notification.permission);

    // Request permission if needed
    if (Notification.permission === 'default' && this.defaultSettings.requestBrowserPermission) {
      this.requestBrowserNotificationPermission();
    }
  }

  /**
   * Setup app focus tracking
   */
  private setupAppFocusTracking(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('focus', () => {
      this.isAppFocused = true;
    });

    window.addEventListener('blur', () => {
      this.isAppFocused = false;
    });
  }

  /**
   * Request browser notification permission
   */
  requestBrowserNotificationPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      return Promise.resolve('denied');
    }

    return Notification.requestPermission().then(permission => {
      this.browserPermissionStatus$.next(permission);
      return permission;
    });
  }

  /**
   * Show toast notification
   */
  showToast(
    message: string,
    type: NotificationType = 'info',
    title?: string,
    duration?: number
  ): string {
    const settings = this.settings$.value;
    if (!settings.enableToastNotifications) {
      return '';
    }

    const id = this.generateId();
    const toast: ToastMessage = {
      id,
      type,
      title: title || this.getDefaultTitle(type),
      message,
      duration: duration || settings.toastDuration,
      dismissible: true,
      timestamp: new Date()
    };

    // Emit toast event
    this.toastMessages$.next(toast);

    // Add to all toasts
    const toasts = this.allToasts$.value;
    this.allToasts$.next([...toasts, toast]);

    // Auto-remove after duration
    if (toast.duration > 0) {
      setTimeout(() => this.removeToast(id), toast.duration);
    }

    return id;
  }

  /**
   * Remove toast notification
   */
  removeToast(id: string): void {
    const toasts = this.allToasts$.value;
    this.allToasts$.next(toasts.filter(t => t.id !== id));
  }

  /**
   * Get toast messages observable
   */
  getToastMessages$(): Observable<ToastMessage> {
    return this.toastMessages$.asObservable();
  }

  /**
   * Get all toasts observable
   */
  getAllToasts$(): Observable<ToastMessage[]> {
    return this.allToasts$.asObservable();
  }

  /**
   * Show browser notification
   */
  showBrowserNotification(
    title: string,
    options: Partial<NotificationOptions> = {}
  ): void {
    const settings = this.settings$.value;

    if (!settings.enableBrowserNotifications) {
      return;
    }

    // Don't show if app is focused
    if (this.isAppFocused) {
      this.showToast(options.body || '', 'info', title);
      return;
    }

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const notificationOptions: NotificationOptions = {
      icon: '/assets/icons/notification.png',
      badge: '/assets/icons/badge.png',
      ...options,
      tag: options.tag || 'message-notification',
      requireInteraction: false
    };

    const notification = new Notification(title, notificationOptions);

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Play sound if enabled
    if (settings.enableSoundNotifications) {
      this.playSound('message');
    }
  }

  /**
   * Play sound notification
   */
  playSound(soundName: string = 'message'): void {
    const settings = this.settings$.value;

    if (!settings.enableSoundNotifications) {
      return;
    }

    // Try to use cached audio element
    if (this.sounds.has(soundName)) {
      const audio = this.sounds.get(soundName)!;
      audio.volume = settings.soundVolume;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Silence errors from autoplay restrictions
      });
      return;
    }

    // Create new audio element
    const audio = new Audio(`/assets/sounds/${soundName}.mp3`);
    audio.volume = settings.soundVolume;

    this.sounds.set(soundName, audio);

    audio.play().catch(() => {
      // Handle autoplay restrictions
    });
  }

  /**
   * Update unread message count
   */
  setUnreadCount(count: number): void {
    this.unreadCount$.next(count);
    this.updatePageTitle();
  }

  /**
   * Increment unread count
   */
  incrementUnreadCount(amount: number = 1): void {
    const current = this.unreadCount$.value;
    this.setUnreadCount(current + amount);
  }

  /**
   * Decrement unread count
   */
  decrementUnreadCount(amount: number = 1): void {
    const current = Math.max(0, this.unreadCount$.value - amount);
    this.setUnreadCount(current);
  }

  /**
   * Clear unread count
   */
  clearUnreadCount(): void {
    this.setUnreadCount(0);
  }

  /**
   * Get unread count observable
   */
  getUnreadCount$(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  /**
   * Update page title with unread badge
   */
  private updatePageTitle(): void {
    const settings = this.settings$.value;
    const count = this.unreadCount$.value;

    if (!settings.enableBadge || count === 0) {
      if (typeof document !== 'undefined') {
        document.title = this.originalTitle;
      }
      return;
    }

    if (typeof document !== 'undefined') {
      document.title = `(${count}) ${this.originalTitle}`;
    }
  }

  /**
   * Get notification settings
   */
  getSettings$(): Observable<NotificationSettings> {
    return this.settings$.asObservable();
  }

  /**
   * Update notification settings
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    const current = this.settings$.value;
    const updated = { ...current, ...newSettings };
    this.settings$.next(updated);
    this.saveSettings(updated);
    this.updatePageTitle();
  }

  /**
   * Get browser notification permission status
   */
  getBrowserPermissionStatus$(): Observable<NotificationPermission> {
    return this.browserPermissionStatus$.asObservable();
  }

  /**
   * Get default title for notification type
   */
  private getDefaultTitle(type: NotificationType): string {
    const titles: Record<NotificationType, string> = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
      message: 'New Message'
    };
    return titles[type];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(settings: NotificationSettings): void {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch {
      // Handle localStorage quota exceeded
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.settings$.next({ ...this.defaultSettings, ...settings });
      }
    } catch {
      // Handle parse error
    }
  }

  /**
   * Show success notification
   */
  success(message: string, title?: string): string {
    return this.showToast(message, 'success', title || 'Success');
  }

  /**
   * Show error notification
   */
  error(message: string, title?: string): string {
    return this.showToast(message, 'error', title || 'Error');
  }

  /**
   * Show warning notification
   */
  warning(message: string, title?: string): string {
    return this.showToast(message, 'warning', title || 'Warning');
  }

  /**
   * Show info notification
   */
  info(message: string, title?: string): string {
    return this.showToast(message, 'info', title || 'Info');
  }

  /**
   * Clear all toasts
   */
  clearAllToasts(): void {
    this.allToasts$.next([]);
  }

  ngOnDestroy() {
    // Clean up
    this.sounds.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.sounds.clear();
  }
}
