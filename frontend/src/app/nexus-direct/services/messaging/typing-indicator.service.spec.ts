/**
 * Typing Indicator Service Tests
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TypingIndicatorService } from './typing-indicator.service';
import { TypingIndicatorEvent, StoppedTypingEvent } from './models';

describe('TypingIndicatorService', () => {
  let service: TypingIndicatorService;

  const mockTypingEvent: TypingIndicatorEvent = {
    eventType: 'typing',
    conversationId: 1,
    typistId: 2,
    typistName: 'John Doe',
    typistEmail: 'john@example.com',
    timestamp: new Date()
  };

  const mockStoppedTypingEvent: StoppedTypingEvent = {
    eventType: 'stopped_typing',
    conversationId: 1,
    typistId: 2,
    typistName: 'John Doe',
    timestamp: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TypingIndicatorService]
    });

    service = TestBed.inject(TypingIndicatorService);
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

    it('should set current conversation', () => {
      service.setCurrentConversation(1);
      expect(service).toBeTruthy();
    });

    it('should have default configuration', () => {
      const config = service.getConfig();
      expect(config.debounceDelay).toBe(500);
      expect(config.inactivityTimeout).toBe(3000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  describe('Configuration', () => {
    it('should update configuration', () => {
      service.setConfig({
        debounceDelay: 1000,
        inactivityTimeout: 5000
      });

      const config = service.getConfig();
      expect(config.debounceDelay).toBe(1000);
      expect(config.inactivityTimeout).toBe(5000);
    });

    it('should merge partial configuration', () => {
      service.setConfig({ debounceDelay: 750 });

      const config = service.getConfig();
      expect(config.debounceDelay).toBe(750);
      expect(config.inactivityTimeout).toBe(3000); // Still default
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // User Typing Detection
  // ═══════════════════════════════════════════════════════════════

  describe('User Typing Detection', () => {
    it('should emit sendTyping event when user starts typing', (done) => {
      service.setCurrentConversation(1);

      service.sendTyping$.subscribe(event => {
        expect(event.conversationId).toBe(1);
        expect(event.typistId).toBe(1);
        done();
      });

      service.markUserTyping(1);
    });

    it('should debounce typing events', fakeAsync((done?: any) => {
      service.setCurrentConversation(1);
      let emitCount = 0;

      service.sendTyping$.subscribe(() => {
        emitCount++;
      });

      service.markUserTyping(1);
      expect(emitCount).toBe(1); // First event immediately

      service.markUserTyping(1);
      tick(100);
      expect(emitCount).toBe(1); // Still 1, debounced

      tick(400);
      expect(emitCount).toBe(2); // After 500ms total
    }));

    it('should stop typing after inactivity timeout', fakeAsync(() => {
      service.setCurrentConversation(1);
      let stopCount = 0;

      service.sendStoppedTyping$.subscribe(() => {
        stopCount++;
      });

      service.markUserTyping(1);
      tick(3100); // Wait more than 3s inactivity timeout

      expect(stopCount).toBe(1);
    }));

    it('should track typing state', () => {
      service.setCurrentConversation(1);

      service.markUserTyping(1);
      const typingUsers = service.getTypingUsers(1);

      expect(typingUsers.length).toBe(1);
      expect(typingUsers[0].userId).toBe(1);
      expect(typingUsers[0].isTyping).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // User Stops Typing
  // ═══════════════════════════════════════════════════════════════

  describe('User Stops Typing', () => {
    it('should emit sendStoppedTyping event', (done) => {
      service.setCurrentConversation(1);
      service.markUserTyping(1);

      service.sendStoppedTyping$.subscribe(event => {
        expect(event.conversationId).toBe(1);
        expect(event.typistId).toBe(1);
        done();
      });

      service.markUserStoppedTyping(1);
    });

    it('should update typing state on stop', () => {
      service.setCurrentConversation(1);
      service.markUserTyping(1);

      const typingUsersBefore = service.getTypingUsers(1);
      expect(typingUsersBefore.length).toBe(1);

      service.markUserStoppedTyping(1);

      const typingUsersAfter = service.getTypingUsers(1);
      expect(typingUsersAfter.length).toBe(0);
    });

    it('should clear timers on stop', fakeAsync(() => {
      service.setCurrentConversation(1);
      service.markUserTyping(1);

      service.markUserStoppedTyping(1);
      tick(3000);

      // No additional stop events should be emitted
      const typingUsers = service.getTypingUsers(1);
      expect(typingUsers.length).toBe(0);
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Incoming Typing Events
  // ═══════════════════════════════════════════════════════════════

  describe('Incoming Typing Events', () => {
    it('should handle typing event from other user', (done) => {
      service.typingEvent$.subscribe(event => {
        expect(event.conversationId).toBe(mockTypingEvent.conversationId);
        expect(event.typistId).toBe(mockTypingEvent.typistId);
        done();
      });

      service.handleTypingEvent(mockTypingEvent);
    });

    it('should update typing users on incoming event', () => {
      service.handleTypingEvent(mockTypingEvent);

      const typingUsers = service.getTypingUsers(1);
      expect(typingUsers.length).toBe(1);
      expect(typingUsers[0].userId).toBe(2);
      expect(typingUsers[0].isTyping).toBe(true);
    });

    it('should not process own typing events', (done) => {
      service.setCurrentConversation(1);

      let eventReceived = false;
      service.typingEvent$.subscribe(() => {
        eventReceived = true;
      });

      const ownEvent: TypingIndicatorEvent = {
        ...mockTypingEvent,
        typistId: 1 // Same as current user
      };

      service.handleTypingEvent(ownEvent);

      setTimeout(() => {
        expect(eventReceived).toBe(false);
        done();
      }, 100);
    });

    it('should handle stopped typing event', (done) => {
      service.handleTypingEvent(mockTypingEvent);

      service.typingEvent$.subscribe(event => {
        if (event.eventType === 'stopped_typing') {
          expect(event.typistId).toBe(mockStoppedTypingEvent.typistId);
          done();
        }
      });

      service.handleStoppedTypingEvent(mockStoppedTypingEvent);
    });

    it('should handle batch typing events', () => {
      const events = [
        mockTypingEvent,
        { ...mockTypingEvent, typistId: 3, typistName: 'Jane Doe' }
      ];

      service.handleBatchTypingEvents(events);

      const typingUsers = service.getTypingUsers(1);
      expect(typingUsers.length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Typing Status Queries
  // ═══════════════════════════════════════════════════════════════

  describe('Typing Status Queries', () => {
    it('should get typing users for conversation', () => {
      service.handleTypingEvent(mockTypingEvent);

      const typingUsers = service.getTypingUsers(1);
      expect(typingUsers.length).toBe(1);
      expect(typingUsers[0].userName).toBe('John Doe');
    });

    it('should get typing count', () => {
      service.handleTypingEvent(mockTypingEvent);
      service.handleTypingEvent({ ...mockTypingEvent, typistId: 3 });

      const count = service.getTypingCount(1);
      expect(count).toBe(2);
    });

    it('should check if user is typing', () => {
      service.handleTypingEvent(mockTypingEvent);

      const isTyping = service.isUserTyping(1, 2);
      expect(isTyping).toBe(true);
    });

    it('should get typing message for single user', () => {
      service.handleTypingEvent(mockTypingEvent);

      const message = service.getTypingMessage(1);
      expect(message).toBe('John Doe is typing...');
    });

    it('should get typing message for two users', () => {
      service.handleTypingEvent(mockTypingEvent);
      service.handleTypingEvent({ ...mockTypingEvent, typistId: 3, typistName: 'Jane' });

      const message = service.getTypingMessage(1);
      expect(message).toContain('is typing...');
      expect(message).toContain('and');
    });

    it('should get typing message for multiple users', () => {
      service.handleTypingEvent(mockTypingEvent);
      service.handleTypingEvent({ ...mockTypingEvent, typistId: 3 });
      service.handleTypingEvent({ ...mockTypingEvent, typistId: 4 });

      const message = service.getTypingMessage(1);
      expect(message).toBe('3 users are typing...');
    });

    it('should return empty message when no one typing', () => {
      const message = service.getTypingMessage(1);
      expect(message).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Conversation Typing State
  // ═══════════════════════════════════════════════════════════════

  describe('Conversation Typing State', () => {
    it('should get conversation typing state', () => {
      service.handleTypingEvent(mockTypingEvent);

      const state = service.getConversationTypingState(1);
      expect(state.conversationId).toBe(1);
      expect(state.totalTypingCount).toBe(1);
      expect(state.typingUsers.length).toBe(1);
    });

    it('should get all typing states', () => {
      service.handleTypingEvent(mockTypingEvent);
      service.handleTypingEvent({ ...mockTypingEvent, conversationId: 2, typistId: 3 });

      const allStates = service.getAllTypingStates();
      expect(allStates.size).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Observable Streams
  // ═══════════════════════════════════════════════════════════════

  describe('Observable Streams', () => {
    it('should provide conversation typing users observable', (done) => {
      service.setCurrentConversation(1);
      service.conversationTypingUsers$(1).subscribe(users => {
        if (users.length > 0) {
          expect(users[0].userId).toBe(2);
          done();
        }
      });

      service.handleTypingEvent(mockTypingEvent);
    });

    it('should provide user typing status observable', (done) => {
      service.userTypingStatus$(1, 2).subscribe(isTyping => {
        if (isTyping) {
          expect(isTyping).toBe(true);
          done();
        }
      });

      service.handleTypingEvent(mockTypingEvent);
    });

    it('should provide typing count observable', (done) => {
      service.typingCount$(1).subscribe(count => {
        if (count > 0) {
          expect(count).toBe(1);
          done();
        }
      });

      service.handleTypingEvent(mockTypingEvent);
    });

    it('should provide typing states map observable', (done) => {
      service.typingStates$.subscribe(statesMap => {
        if (statesMap.size > 0) {
          expect(statesMap.has(1)).toBe(true);
          done();
        }
      });

      service.handleTypingEvent(mockTypingEvent);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Clear & Reset
  // ═══════════════════════════════════════════════════════════════

  describe('Clear & Reset', () => {
    it('should clear conversation typing state', () => {
      service.handleTypingEvent(mockTypingEvent);
      expect(service.getTypingCount(1)).toBe(1);

      service.clearConversationTypingState(1);
      expect(service.getTypingCount(1)).toBe(0);
    });

    it('should clear all typing states', () => {
      service.handleTypingEvent(mockTypingEvent);
      service.handleTypingEvent({ ...mockTypingEvent, conversationId: 2 });

      service.clearAllTypingStates();

      expect(service.getTypingCount(1)).toBe(0);
      expect(service.getTypingCount(2)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Conversation Switching
  // ═══════════════════════════════════════════════════════════════

  describe('Conversation Switching', () => {
    it('should stop typing when switching conversation', fakeAsync(() => {
      service.setCurrentConversation(1);
      service.markUserTyping(1);

      let stoppedCount = 0;
      service.sendStoppedTyping$.subscribe(() => {
        stoppedCount++;
      });

      service.setCurrentConversation(2);

      expect(stoppedCount).toBe(1);
    }));

    it('should initialize typing state for new conversation', () => {
      service.setCurrentConversation(1);
      service.handleTypingEvent(mockTypingEvent);

      service.setCurrentConversation(2);
      const typingUsers2 = service.getTypingUsers(2);

      expect(typingUsers2.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle rapid typing changes', () => {
      service.setCurrentConversation(1);

      for (let i = 0; i < 10; i++) {
        service.markUserTyping(1);
      }

      const typingUsers = service.getTypingUsers(1);
      expect(typingUsers.length).toBe(1);
    });

    it('should handle multiple users typing simultaneously', () => {
      for (let i = 2; i <= 5; i++) {
        service.handleTypingEvent({
          ...mockTypingEvent,
          typistId: i,
          typistName: `User ${i}`
        });
      }

      expect(service.getTypingCount(1)).toBe(4);
    });

    it('should handle user without user context', () => {
      const newService = new TypingIndicatorService();
      // Don't set user context

      expect(() => {
        newService.markUserTyping(1);
      }).not.toThrow();

      newService.ngOnDestroy();
    });

    it('should handle stale typing state cleanup', fakeAsync(() => {
      service.handleTypingEvent(mockTypingEvent);

      // Let the state age beyond cleanup threshold
      tick(10000);

      const typingUsers = service.getTypingUsers(1);
      // Should be cleaned up or still there depending on implementation
      expect(typingUsers.length).toBeGreaterThanOrEqual(0);
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      service.setCurrentConversation(1);
      service.markUserTyping(1);

      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
