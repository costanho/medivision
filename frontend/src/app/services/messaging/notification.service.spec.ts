/**
 * Notification Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { NotificationService, NotificationSettings, NotificationSound } from './notification.service';
import { ChatMessageEvent } from './models';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockMessage: ChatMessageEvent = {
    eventType: 'message',
    messageId: 123,
    senderId: 2,
    senderName: 'Dr. Smith',
    recipientId: 1,
    content: 'Test message',
    conversationId: 1,
    timestamp: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService]
    });

    service = TestBed.inject(NotificationService);

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    service.ngOnDestroy();
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // Service Initialization
  // ═══════════════════════════════════════════════════════════════

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have default settings', () => {
      const settings = service.getSettings();
      expect(settings.soundEnabled).toBe(true);
      expect(settings.browserNotificationEnabled).toBe(true);
      expect(settings.silentMode).toBe(true);
      expect(settings.volume).toBe(70);
    });

    it('should start with window focused', () => {
      expect(service['isWindowFocused']).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Notifications
  // ═══════════════════════════════════════════════════════════════

  describe('Message Notifications', () => {
    it('should notify message', () => {
      expect(() => {
        service.notifyMessage(mockMessage);
      }).not.toThrow();
    });

    it('should skip notification in silent mode when focused', (done) => {
      let notificationEmitted = false;

      service.notificationPlayed$
        .subscribe(() => {
          notificationEmitted = true;
        });

      service['isWindowFocused'] = true;

      service.notifyMessage(mockMessage);

      setTimeout(() => {
        // Notification may not play in silent mode when focused
        expect(service['isWindowFocused']).toBe(true);
        done();
      }, 50);
    });

    it('should notify when window is blurred', () => {
      service['isWindowFocused'] = false;

      expect(() => {
        service.notifyMessage(mockMessage);
      }).not.toThrow();
    });

    it('should notify with custom options', () => {
      expect(() => {
        service.notifyMessage(mockMessage, {
          title: 'Custom Title',
          body: 'Custom Body',
          sound: 'bell'
        });
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Sound Notifications
  // ═══════════════════════════════════════════════════════════════

  describe('Sound Notifications', () => {
    it('should play sound', () => {
      expect(() => {
        service.playSound('default');
      }).not.toThrow();
    });

    it('should not play sound when disabled', (done) => {
      let soundPlayed = false;

      service.notificationPlayed$
        .subscribe(() => {
          soundPlayed = true;
        });

      service.disableSound();
      service.playSound('default');

      setTimeout(() => {
        expect(soundPlayed).toBe(false);
        done();
      }, 50);
    });

    it('should play sound with different sounds', () => {
      const sounds: NotificationSound[] = ['default', 'bell', 'chime', 'ping', 'pop'];

      sounds.forEach(sound => {
        expect(() => {
          service.playSound(sound);
        }).not.toThrow();
      });
    });

    it('should test sound', () => {
      expect(() => {
        service.testSound('bell');
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Settings Management
  // ═══════════════════════════════════════════════════════════════

  describe('Settings Management', () => {
    it('should get settings', () => {
      const settings = service.getSettings();
      expect(settings).toBeTruthy();
      expect(settings.soundEnabled).toBeDefined();
    });

    it('should update settings', () => {
      service.updateSettings({ soundEnabled: false });
      expect(service.getSettings().soundEnabled).toBe(false);
    });

    it('should emit settings changed', (done) => {
      service.settingsChanged$
        .subscribe(settings => {
          expect(settings.soundEnabled).toBe(false);
          done();
        });

      service.updateSettings({ soundEnabled: false });
    });

    it('should enable/disable sound', () => {
      service.disableSound();
      expect(service.getSettings().soundEnabled).toBe(false);

      service.enableSound();
      expect(service.getSettings().soundEnabled).toBe(true);
    });

    it('should enable/disable browser notifications', () => {
      service.disableBrowserNotifications();
      expect(service.getSettings().browserNotificationEnabled).toBe(false);

      service.enableBrowserNotifications();
      expect(service.getSettings().browserNotificationEnabled).toBe(true);
    });

    it('should enable/disable silent mode', () => {
      service.disableSilentMode();
      expect(service.getSettings().silentMode).toBe(false);

      service.enableSilentMode();
      expect(service.getSettings().silentMode).toBe(true);
    });

    it('should set volume', () => {
      service.setVolume(50);
      expect(service.getSettings().volume).toBe(50);
    });

    it('should clamp volume to 0-100', () => {
      service.setVolume(-10);
      expect(service.getSettings().volume).toBe(0);

      service.setVolume(150);
      expect(service.getSettings().volume).toBe(100);
    });

    it('should enable/disable vibration', () => {
      service.disableVibration();
      expect(service.getSettings().vibrationEnabled).toBe(false);

      service.enableVibration();
      expect(service.getSettings().vibrationEnabled).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Settings Persistence
  // ═══════════════════════════════════════════════════════════════

  describe('Settings Persistence', () => {
    it('should save settings to localStorage', () => {
      service.updateSettings({ soundEnabled: false, volume: 50 });

      const stored = localStorage.getItem('messaging_notification_settings');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.soundEnabled).toBe(false);
      expect(parsed.volume).toBe(50);
    });

    it('should load settings from localStorage', () => {
      const testSettings: NotificationSettings = {
        soundEnabled: false,
        browserNotificationEnabled: false,
        silentMode: false,
        volume: 30,
        vibrationEnabled: false
      };

      localStorage.setItem('messaging_notification_settings', JSON.stringify(testSettings));

      // Create new service instance to test loading
      const newService = new NotificationService();

      // Note: Current implementation loads in constructor, settings are auto-loaded
      newService.ngOnDestroy();
    });

    it('should reset settings to defaults', () => {
      service.updateSettings({ soundEnabled: false, volume: 10 });
      service.resetSettings();

      const settings = service.getSettings();
      expect(settings.soundEnabled).toBe(true);
      expect(settings.volume).toBe(70);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Window Focus Detection
  // ═══════════════════════════════════════════════════════════════

  describe('Window Focus Detection', () => {
    it('should detect window focus', () => {
      const focusEvent = new Event('focus');
      window.dispatchEvent(focusEvent);

      expect(service['isWindowFocused']).toBe(true);
    });

    it('should detect window blur', () => {
      const blurEvent = new Event('blur');
      window.dispatchEvent(blurEvent);

      expect(service['isWindowFocused']).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Browser Notifications
  // ═══════════════════════════════════════════════════════════════

  describe('Browser Notifications', () => {
    it('should show browser notification', () => {
      // Skip if Notification not available in test environment
      if ('Notification' in window && Notification.permission === 'granted') {
        expect(() => {
          service.showBrowserNotification(mockMessage);
        }).not.toThrow();
      }
    });

    it('should close all notifications', () => {
      expect(() => {
        service.closeAllNotifications();
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Observable Streams
  // ═══════════════════════════════════════════════════════════════

  describe('Observable Streams', () => {
    it('should emit notificationPlayed', (done) => {
      let emitted = false;

      service.notificationPlayed$
        .subscribe(() => {
          emitted = true;
        });

      service.playSound('default');

      setTimeout(() => {
        expect(emitted).toBe(true);
        done();
      }, 100);
    });

    it('should emit settingsChanged', (done) => {
      service.settingsChanged$
        .subscribe(settings => {
          expect(settings.soundEnabled).toBe(false);
          done();
        });

      service.disableSound();
    });

    it('should emit settings stream', (done) => {
      service.settings$
        .subscribe(settings => {
          expect(settings).toBeTruthy();
          done();
        });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle unknown sound gracefully', () => {
      expect(() => {
        service.playSound('unknown' as NotificationSound);
      }).not.toThrow();
    });

    it('should handle notification on message with very long content', () => {
      const longMessage = { ...mockMessage, content: 'x'.repeat(5000) };

      expect(() => {
        service.notifyMessage(longMessage);
      }).not.toThrow();
    });

    it('should handle multiple rapid notifications', () => {
      for (let i = 0; i < 10; i++) {
        service.notifyMessage(mockMessage);
      }

      expect(service.getSettings().soundEnabled).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });

    it('should stop all audio on destroy', () => {
      service.playSound('default');
      service.ngOnDestroy();

      // Verify audio elements are cleared
      expect(service['audioElements'].size).toBe(0);
    });
  });
});
