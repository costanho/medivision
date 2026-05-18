/**
 * Notification Service
 * Handles message notifications, sounds, and user alerts
 *
 * Features:
 * - Browser notifications (if permission granted)
 * - Notification sounds (if enabled)
 * - Silent mode support
 * - Sound volume control
 * - Notification settings persistence
 * - Focus detection (don't notify if focused)
 * - Customizable notification text
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ChatMessageEvent } from './models';

/**
 * Notification Settings
 * User preferences for notifications
 */
export interface NotificationSettings {
  soundEnabled: boolean;         // Play sound on message
  browserNotificationEnabled: boolean;  // Show browser notification
  silentMode: boolean;           // Don't notify when focused
  volume: number;                // 0-100
  vibrationEnabled: boolean;     // Vibrate on mobile
}

/**
 * Notification Sound
 * Available notification sounds
 */
export type NotificationSound = 'default' | 'bell' | 'chime' | 'notification' | 'ping' | 'pop';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  // Configuration
  private readonly STORAGE_KEY = 'messaging_notification_settings';
  private readonly DEFAULT_VOLUME = 70;
  private readonly NOTIFICATION_SOUND_URL = '/assets/sounds/notification';
  private readonly DEFAULT_SOUND: NotificationSound = 'default';

  // Settings
  private settingsSubject = new BehaviorSubject<NotificationSettings>(
    this.getDefaultSettings()
  );
  public settings$ = this.settingsSubject.asObservable();

  // State
  private isWindowFocused = true;
  private audioContext: AudioContext | null = null;
  private audioElements = new Map<NotificationSound, HTMLAudioElement>();

  // Observable streams
  private notificationPlayedSubject = new Subject<{
    sound: NotificationSound;
    volume: number;
  }>();
  public notificationPlayed$ = this.notificationPlayedSubject.asObservable();

  private settingsChangedSubject = new Subject<NotificationSettings>();
  public settingsChanged$ = this.settingsChangedSubject.asObservable();

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor() {
    this.initializeNotifications();
    this.loadSettings();
    this.setupWindowFocusDetection();
    this.preloadSounds();
  }

  /**
   * Initialize browser notifications
   */
  private initializeNotifications(): void {
    console.log('[Notification] Service initialized');

    // Request notification permission if available
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
        .then(permission => {
          console.log('[Notification] Permission:', permission);
        })
        .catch(error => {
          console.error('[Notification] Permission error:', error);
        });
    }
  }

  /**
   * Setup window focus detection
   * Used for silent mode (don't notify if focused)
   */
  private setupWindowFocusDetection(): void {
    window.addEventListener('focus', () => {
      this.isWindowFocused = true;
      console.log('[Notification] Window focused');
    });

    window.addEventListener('blur', () => {
      this.isWindowFocused = false;
      console.log('[Notification] Window blurred');
    });
  }

  /**
   * Preload notification sounds
   */
  private preloadSounds(): void {
    const sounds: NotificationSound[] = ['default', 'bell', 'chime', 'notification', 'ping', 'pop'];

    sounds.forEach(sound => {
      const audio = new Audio();
      audio.src = `${this.NOTIFICATION_SOUND_URL}-${sound}.mp3`;
      audio.preload = 'auto';
      audio.volume = this.settingsSubject.value.volume / 100;

      // Handle loading errors
      audio.addEventListener('error', () => {
        console.warn(`[Notification] Failed to load sound: ${sound}`);
      });

      this.audioElements.set(sound, audio);
    });

    console.log('[Notification] Sounds preloaded');
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Notifications
  // ═══════════════════════════════════════════════════════════════

  /**
   * Notify user of new message
   */
  public notifyMessage(
    message: ChatMessageEvent,
    options?: {
      sound?: NotificationSound;
      title?: string;
      body?: string;
    }
  ): void {
    const settings = this.settingsSubject.value;

    console.log('[Notification] Notifying message:', {
      soundEnabled: settings.soundEnabled,
      browserNotificationEnabled: settings.browserNotificationEnabled,
      silentMode: settings.silentMode,
      isFocused: this.isWindowFocused
    });

    // Check if should notify
    if (settings.silentMode && this.isWindowFocused) {
      console.log('[Notification] Silent mode and focused - skipping notification');
      return;
    }

    // Play sound if enabled
    if (settings.soundEnabled) {
      const sound = options?.sound || this.DEFAULT_SOUND;
      this.playSound(sound);
    }

    // Show browser notification if enabled
    if (settings.browserNotificationEnabled && 'Notification' in window) {
      this.showBrowserNotification(message, options);
    }

    // Vibrate if enabled and supported
    if (settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);  // Vibration pattern
    }

    console.log('[Notification] User notified');
  }

  /**
   * Play notification sound
   */
  public playSound(sound: NotificationSound = this.DEFAULT_SOUND): void {
    const settings = this.settingsSubject.value;

    if (!settings.soundEnabled) {
      console.log('[Notification] Sound disabled');
      return;
    }

    const audioElement = this.audioElements.get(sound);

    if (!audioElement) {
      console.warn('[Notification] Sound not found:', sound);
      return;
    }

    try {
      // Reset and play
      audioElement.currentTime = 0;
      audioElement.volume = settings.volume / 100;
      audioElement.play()
        .catch(error => {
          console.warn('[Notification] Audio play failed:', error);
        });

      this.notificationPlayedSubject.next({
        sound,
        volume: settings.volume
      });

      console.log('[Notification] Sound played:', sound);
    } catch (error) {
      console.error('[Notification] Error playing sound:', error);
    }
  }

  /**
   * Show browser notification
   */
  public showBrowserNotification(
    message: ChatMessageEvent,
    options?: {
      title?: string;
      body?: string;
      icon?: string;
      badge?: string;
    }
  ): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log('[Notification] Browser notifications not available or not permitted');
      return;
    }

    try {
      const title = options?.title || `New message from ${message.senderName}`;
      const body = options?.body || message.content.substring(0, 100);

      const notification = new Notification(title, {
        body,
        icon: options?.icon || '/assets/images/icon.png',
        badge: options?.badge || '/assets/images/badge.png',
        tag: `message-${message.messageId}`,
        requireInteraction: false
      });

      // Click handler
      notification.addEventListener('click', () => {
        window.focus();
        notification.close();
      });

      console.log('[Notification] Browser notification shown:', title);
    } catch (error) {
      console.error('[Notification] Browser notification error:', error);
    }
  }

  /**
   * Close all notifications
   */
  public closeAllNotifications(): void {
    // Close audio if playing
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    console.log('[Notification] All notifications closed');
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API: Settings Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current settings
   */
  public getSettings(): NotificationSettings {
    return this.settingsSubject.value;
  }

  /**
   * Update settings
   */
  public updateSettings(settings: Partial<NotificationSettings>): void {
    const current = this.settingsSubject.value;
    const updated: NotificationSettings = { ...current, ...settings };

    // Update audio volumes
    if (settings.volume !== undefined) {
      this.audioElements.forEach(audio => {
        audio.volume = settings.volume! / 100;
      });
    }

    this.settingsSubject.next(updated);
    this.settingsChangedSubject.next(updated);
    this.saveSettings(updated);

    console.log('[Notification] Settings updated:', updated);
  }

  /**
   * Enable sound notifications
   */
  public enableSound(): void {
    this.updateSettings({ soundEnabled: true });
  }

  /**
   * Disable sound notifications
   */
  public disableSound(): void {
    this.updateSettings({ soundEnabled: false });
  }

  /**
   * Enable browser notifications
   */
  public enableBrowserNotifications(): void {
    this.updateSettings({ browserNotificationEnabled: true });
  }

  /**
   * Disable browser notifications
   */
  public disableBrowserNotifications(): void {
    this.updateSettings({ browserNotificationEnabled: false });
  }

  /**
   * Enable silent mode (don't notify when focused)
   */
  public enableSilentMode(): void {
    this.updateSettings({ silentMode: true });
  }

  /**
   * Disable silent mode
   */
  public disableSilentMode(): void {
    this.updateSettings({ silentMode: false });
  }

  /**
   * Set volume (0-100)
   */
  public setVolume(volume: number): void {
    const clipped = Math.max(0, Math.min(100, volume));
    this.updateSettings({ volume: clipped });
  }

  /**
   * Enable vibration
   */
  public enableVibration(): void {
    this.updateSettings({ vibrationEnabled: true });
  }

  /**
   * Disable vibration
   */
  public disableVibration(): void {
    this.updateSettings({ vibrationEnabled: false });
  }

  /**
   * Test sound
   */
  public testSound(sound: NotificationSound = this.DEFAULT_SOUND): void {
    console.log('[Notification] Testing sound:', sound);
    const previousSetting = this.settingsSubject.value.soundEnabled;

    // Temporarily enable sound
    const originalSettings = this.settingsSubject.value;
    this.settingsSubject.next({ ...originalSettings, soundEnabled: true });

    this.playSound(sound);

    // Restore settings
    this.settingsSubject.next(originalSettings);
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Settings Persistence
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get default settings
   */
  private getDefaultSettings(): NotificationSettings {
    return {
      soundEnabled: true,
      browserNotificationEnabled: true,
      silentMode: true,  // Don't notify when focused
      volume: this.DEFAULT_VOLUME,
      vibrationEnabled: true
    };
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored) as NotificationSettings;
        this.settingsSubject.next(settings);
        console.log('[Notification] Settings loaded from storage');
      }
    } catch (error) {
      console.error('[Notification] Error loading settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(settings: NotificationSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      console.log('[Notification] Settings saved to storage');
    } catch (error) {
      console.error('[Notification] Error saving settings:', error);
    }
  }

  /**
   * Reset settings to defaults
   */
  public resetSettings(): void {
    const defaults = this.getDefaultSettings();
    this.settingsSubject.next(defaults);
    this.saveSettings(defaults);
    console.log('[Notification] Settings reset to defaults');
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Cleanup service
   */
  ngOnDestroy(): void {
    console.log('[Notification] Destroying service');
    this.closeAllNotifications();
    this.audioElements.clear();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
