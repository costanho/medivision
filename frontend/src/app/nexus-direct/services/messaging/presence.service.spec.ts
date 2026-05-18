/**
 * Presence Service Tests
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PresenceService } from './presence.service';
import { UserPresenceEvent, UserOnlineEvent, UserOfflineEvent } from './models';

describe('PresenceService', () => {
  let service: PresenceService;

  const mockPresenceEvent: UserPresenceEvent = {
    eventType: 'presence',
    userId: 2,
    userName: 'John Doe',
    email: 'john@example.com',
    status: 'online',
    lastSeenAt: new Date(),
    timestamp: new Date()
  };

  const mockOnlineEvent: UserOnlineEvent = {
    eventType: 'user_online',
    userId: 2,
    userName: 'John Doe',
    email: 'john@example.com',
    timestamp: new Date(),
    comingOnlineAt: new Date()
  };

  const mockOfflineEvent: UserOfflineEvent = {
    eventType: 'user_offline',
    userId: 2,
    userName: 'John Doe',
    email: 'john@example.com',
    timestamp: new Date(),
    lastSeenAt: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PresenceService]
    });

    service = TestBed.inject(PresenceService);
    service.setCurrentUser(1, 'Test User', 'test@example.com');
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  // ═══════════════════════════════════════════════════════════════
  // Service Initialization
  // ═══════════════════════════════════════════════════════════════

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should set current user', () => {
      service.setCurrentUser(1, 'Test User');
      expect(service).toBeTruthy();
    });

    it('should have default configuration', () => {
      const config = service.getConfig();
      expect(config.presenceCheckInterval).toBe(60000);
      expect(config.offlineTimeout).toBe(120000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  describe('Configuration', () => {
    it('should update configuration', () => {
      service.setConfig({
        presenceCheckInterval: 30000,
        offlineTimeout: 90000
      });

      const config = service.getConfig();
      expect(config.presenceCheckInterval).toBe(30000);
      expect(config.offlineTimeout).toBe(90000);
    });

    it('should set format type', () => {
      service.setConfig({ formatType: 'absolute' });

      const config = service.getConfig();
      expect(config.formatType).toBe('absolute');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // User Online/Offline
  // ═══════════════════════════════════════════════════════════════

  describe('User Online/Offline', () => {
    it('should mark user as online', (done) => {
      service.userOnline.subscribe(event => {
        expect(event.userId).toBe(1);
        done();
      });

      service.markUserOnline();
    });

    it('should mark user as offline', (done) => {
      service.markUserOnline();

      service.userOffline.subscribe(event => {
        expect(event.userId).toBe(1);
        done();
      });

      service.markUserOffline();
    });

    it('should track online status', () => {
      service.markUserOnline();
      expect(service.isUserOnline(1)).toBe(true);

      service.markUserOffline();
      expect(service.isUserOnline(1)).toBe(false);
    });

    it('should set coming online timestamp', (done) => {
      service.userOnline.subscribe(event => {
        expect(event.comingOnlineAt).toBeDefined();
        done();
      });

      service.markUserOnline();
    });

    it('should set last seen timestamp', (done) => {
      service.markUserOnline();

      service.userOffline.subscribe(event => {
        expect(event.lastSeenAt).toBeDefined();
        done();
      });

      service.markUserOffline();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Incoming Presence Events
  // ═══════════════════════════════════════════════════════════════

  describe('Incoming Presence Events', () => {
    it('should handle presence event from other user', (done) => {
      service.presenceEvent$.subscribe(event => {
        expect(event.eventType).toBe('presence');
        expect(event.userId).toBe(2);
        done();
      });

      service.handlePresenceEvent(mockPresenceEvent);
    });

    it('should handle user online event', (done) => {
      service.userOnline.subscribe(event => {
        expect(event.userId).toBe(2);
        done();
      });

      service.handleUserOnlineEvent(mockOnlineEvent);
    });

    it('should handle user offline event', (done) => {
      service.handleUserOnlineEvent(mockOnlineEvent);

      service.userOffline.subscribe(event => {
        expect(event.userId).toBe(2);
        done();
      });

      service.handleUserOfflineEvent(mockOfflineEvent);
    });

    it('should update presence state on event', () => {
      service.handlePresenceEvent(mockPresenceEvent);

      const state = service.getUserPresenceState(2);
      expect(state?.isOnline).toBe(true);
      expect(state?.status).toBe('online');
    });

    it('should not process own presence events', (done) => {
      let eventReceived = false;

      service.presenceEvent$.subscribe(() => {
        eventReceived = true;
      });

      const ownEvent: UserPresenceEvent = {
        ...mockPresenceEvent,
        userId: 1 // Same as current user
      };

      service.handlePresenceEvent(ownEvent);

      setTimeout(() => {
        expect(eventReceived).toBe(false);
        done();
      }, 100);
    });

    it('should handle batch presence events', () => {
      const events = [
        mockPresenceEvent,
        { ...mockPresenceEvent, userId: 3, userName: 'Jane Doe' }
      ];

      service.handleBatchPresenceEvents(events);

      const allStates = service.getAllPresenceStates();
      expect(allStates.length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Presence Queries
  // ═══════════════════════════════════════════════════════════════

  describe('Presence Queries', () => {
    it('should check if user is online', () => {
      service.handlePresenceEvent(mockPresenceEvent);

      const isOnline = service.isUserOnline(2);
      expect(isOnline).toBe(true);
    });

    it('should get user presence status', () => {
      service.handlePresenceEvent(mockPresenceEvent);

      const status = service.getUserPresenceStatus(2);
      expect(status).toBe('online');
    });

    it('should get last seen timestamp', () => {
      service.handlePresenceEvent(mockPresenceEvent);

      const lastSeen = service.getUserLastSeen(2);
      expect(lastSeen).toBeDefined();
    });

    it('should get formatted presence status', () => {
      service.handlePresenceEvent(mockPresenceEvent);

      const formatted = service.getFormattedPresenceStatus(2);
      expect(formatted).toBe('Online now');
    });

    it('should get all presence states', () => {
      service.handlePresenceEvent(mockPresenceEvent);
      service.handlePresenceEvent({ ...mockPresenceEvent, userId: 3 });

      const allStates = service.getAllPresenceStates();
      expect(allStates.length).toBe(2);
    });

    it('should count online users', () => {
      service.handlePresenceEvent(mockPresenceEvent);
      service.handlePresenceEvent({ ...mockPresenceEvent, userId: 3 });

      const count = service.getOnlineUsersCount();
      expect(count).toBe(2);
    });

    it('should get user presence state', () => {
      service.handlePresenceEvent(mockPresenceEvent);

      const state = service.getUserPresenceState(2);
      expect(state?.userId).toBe(2);
      expect(state?.isOnline).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Observable Streams
  // ═══════════════════════════════════════════════════════════════

  describe('Observable Streams', () => {
    it('should provide user presence status observable', (done) => {
      service.userPresenceStatus$(2).subscribe(status => {
        if (status === 'online') {
          expect(status).toBe('online');
          done();
        }
      });

      service.handlePresenceEvent(mockPresenceEvent);
    });

    it('should provide is user online observable', (done) => {
      service.isUserOnline$(2).subscribe(isOnline => {
        if (isOnline) {
          expect(isOnline).toBe(true);
          done();
        }
      });

      service.handlePresenceEvent(mockPresenceEvent);
    });

    it('should provide online indicator observable', (done) => {
      service.onlineIndicator$(2).subscribe(indicator => {
        if (indicator === 'Online now') {
          expect(indicator).toBe('Online now');
          done();
        }
      });

      service.handlePresenceEvent(mockPresenceEvent);
    });

    it('should provide presence states map observable', (done) => {
      service.presenceStates.subscribe(statesMap => {
        if (statesMap.size > 0) {
          expect(statesMap.has(2)).toBe(true);
          done();
        }
      });

      service.handlePresenceEvent(mockPresenceEvent);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Time Formatting
  // ═══════════════════════════════════════════════════════════════

  describe('Time Formatting', () => {
    it('should format online status as Online now', () => {
      service.handlePresenceEvent(mockPresenceEvent);

      const formatted = service.getFormattedPresenceStatus(2);
      expect(formatted).toBe('Online now');
    });

    it('should format offline status with relative time', () => {
      const pastEvent: UserPresenceEvent = {
        ...mockPresenceEvent,
        status: 'offline',
        lastSeenAt: new Date(Date.now() - 3600000) // 1 hour ago
      };

      service.handlePresenceEvent(pastEvent);

      const formatted = service.getFormattedPresenceStatus(2);
      expect(formatted).toContain('ago');
    });

    it('should format with absolute time when configured', () => {
      service.setConfig({ formatType: 'absolute' });
      service.handlePresenceEvent(mockPresenceEvent);

      const formatted = service.getFormattedPresenceStatus(2);
      // Should be in time format like "3:30 PM"
      expect(formatted).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Clear & Reset
  // ═══════════════════════════════════════════════════════════════

  describe('Clear & Reset', () => {
    it('should clear user presence', () => {
      service.handlePresenceEvent(mockPresenceEvent);
      expect(service.isUserOnline(2)).toBe(true);

      service.clearUserPresence(2);
      expect(service.isUserOnline(2)).toBe(false);
    });

    it('should clear all presence', () => {
      service.handlePresenceEvent(mockPresenceEvent);
      service.handlePresenceEvent({ ...mockPresenceEvent, userId: 3 });

      service.clearAllPresence();

      expect(service.getOnlineUsersCount()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle rapid status changes', () => {
      for (let i = 0; i < 10; i++) {
        service.markUserOnline();
        service.markUserOffline();
      }

      expect(service.isUserOnline(1)).toBe(false);
    });

    it('should handle multiple users', () => {
      for (let i = 2; i <= 5; i++) {
        service.handlePresenceEvent({
          ...mockPresenceEvent,
          userId: i,
          userName: `User ${i}`
        });
      }

      expect(service.getOnlineUsersCount()).toBe(4);
    });

    it('should handle user without context', () => {
      const newService = new PresenceService();

      expect(() => {
        newService.markUserOnline();
      }).not.toThrow();

      newService.ngOnDestroy();
    });

    it('should return offline for unknown user', () => {
      const status = service.getUserPresenceStatus(999);
      expect(status).toBe('offline');
    });

    it('should return Offline for unknown user formatted status', () => {
      const formatted = service.getFormattedPresenceStatus(999);
      expect(formatted).toBe('Offline');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      service.markUserOnline();

      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
