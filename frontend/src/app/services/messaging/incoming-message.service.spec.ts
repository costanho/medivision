/**
 * Incoming Message Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { IncomingMessageService } from './incoming-message.service';
import { WebSocketService } from './websocket.service';
import { ChatMessageEvent } from './models';
import { Subject } from 'rxjs';

describe('IncomingMessageService', () => {
  let service: IncomingMessageService;
  let mockWebSocketService: any;

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
    mockWebSocketService = {
      chatMessages$: new Subject<ChatMessageEvent>(),
      connectionStatus$: new Subject()
    };

    TestBed.configureTestingModule({
      providers: [
        IncomingMessageService,
        { provide: WebSocketService, useValue: mockWebSocketService }
      ]
    });

    service = TestBed.inject(IncomingMessageService);
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

    it('should not be listening initially', () => {
      expect(service['isSubscribed']).toBe(false);
    });

    it('should have empty incoming messages initially', () => {
      const messages = service.getAllIncomingMessages();
      expect(messages.length).toBe(0);
    });

    it('should have zero total unread count initially', () => {
      const unread = service.getTotalUnreadCount();
      expect(unread).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Subscription Management
  // ═══════════════════════════════════════════════════════════════

  describe('Subscription', () => {
    it('should subscribe to messages', () => {
      service.subscribe(1);
      expect(service['isSubscribed']).toBe(true);
      expect(service['currentUserId']).toBe(1);
    });

    it('should not resubscribe if already subscribed', () => {
      service.subscribe(1);
      service.subscribe(1);
      expect(service['isSubscribed']).toBe(true);
    });

    it('should emit isListening on subscribe', (done) => {
      service.isListening$
        .subscribe(isListening => {
          if (isListening) {
            expect(isListening).toBe(true);
            done();
          }
        });

      service.subscribe(1);
    });

    it('should unsubscribe from messages', () => {
      service.subscribe(1);
      service.unsubscribe();
      expect(service['isSubscribed']).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Incoming Message Handling
  // ═══════════════════════════════════════════════════════════════

  describe('Incoming Messages', () => {
    beforeEach(() => {
      service.subscribe(1);  // Subscribe as user 1
    });

    it('should receive incoming message', (done) => {
      service.messageReceived$
        .subscribe(event => {
          expect(event.message.messageId).toBe(123);
          expect(event.isNewConversation).toBe(true);
          done();
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
    });

    it('should track incoming message', (done) => {
      service.messageReceived$
        .subscribe(() => {
          const message = service.getIncomingMessage(123);
          expect(message).toBeTruthy();
          expect(message?.content).toBe('Test message');
          done();
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
    });

    it('should ignore messages from self', (done) => {
      let messageReceived = false;

      service.messageReceived$
        .subscribe(() => {
          messageReceived = true;
        });

      const selfMessage = { ...mockMessage, senderId: 1 };
      mockWebSocketService.chatMessages$.next(selfMessage);

      setTimeout(() => {
        expect(messageReceived).toBe(false);
        done();
      }, 50);
    });

    it('should detect new conversation', (done) => {
      service.newConversation$
        .subscribe(message => {
          expect(message.conversationId).toBe(1);
          done();
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Unread Count Management
  // ═══════════════════════════════════════════════════════════════

  describe('Unread Counts', () => {
    beforeEach(() => {
      service.subscribe(1);
    });

    it('should increment unread count', (done) => {
      service.messageReceived$
        .subscribe(() => {
          const unread = service.getUnreadCount(1);
          expect(unread).toBe(1);
          done();
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
    });

    it('should track unread count per conversation', (done) => {
      let messageCount = 0;

      service.messageReceived$
        .subscribe(() => {
          messageCount++;

          if (messageCount === 2) {
            const unread = service.getUnreadCount(1);
            expect(unread).toBe(2);
            done();
          }
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
      mockWebSocketService.chatMessages$.next(mockMessage);
    });

    it('should get total unread count', (done) => {
      let messageCount = 0;

      service.messageReceived$
        .subscribe(() => {
          messageCount++;

          if (messageCount === 2) {
            const total = service.getTotalUnreadCount();
            expect(total).toBe(2);
            done();
          }
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
      mockWebSocketService.chatMessages$.next({ ...mockMessage, conversationId: 2 });
    });

    it('should mark conversation as read', () => {
      service['conversationUnreadCounts'].set(1, 5);
      service.markConversationAsRead(1);

      const unread = service.getUnreadCount(1);
      expect(unread).toBe(0);
    });

    it('should emit total unread changes', (done) => {
      let totalUnreadEmitted = false;

      service.totalUnread$
        .subscribe(total => {
          if (total > 0) {
            totalUnreadEmitted = true;
            expect(total).toBe(1);
            done();
          }
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Conversation Context
  // ═══════════════════════════════════════════════════════════════

  describe('Conversation Context', () => {
    beforeEach(() => {
      service.subscribe(1);
    });

    it('should set current conversation', () => {
      service.setCurrentConversation(1);
      expect(service['currentConversationId']).toBe(1);
    });

    it('should detect if message is from current conversation', (done) => {
      service.setCurrentConversation(1);

      service.messageReceived$
        .subscribe(event => {
          expect(event.metadata.isInCurrentConversation).toBe(true);
          done();
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
    });

    it('should detect if message is not from current conversation', (done) => {
      service.setCurrentConversation(99);

      service.messageReceived$
        .subscribe(event => {
          expect(event.metadata.isInCurrentConversation).toBe(false);
          done();
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Observable Streams
  // ═══════════════════════════════════════════════════════════════

  describe('Observable Streams', () => {
    beforeEach(() => {
      service.subscribe(1);
    });

    it('should emit messageReceived event', (done) => {
      let emitted = false;

      service.messageReceived$
        .subscribe(() => {
          emitted = true;
        });

      mockWebSocketService.chatMessages$.next(mockMessage);

      setTimeout(() => {
        expect(emitted).toBe(true);
        done();
      }, 50);
    });

    it('should emit conversationUpdated event', (done) => {
      service.conversationUpdated$
        .subscribe(event => {
          expect(event.conversationId).toBe(1);
          expect(event.newUnreadCount).toBe(1);
          done();
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
    });

    it('should emit unreadCountChanged', (done) => {
      service.unreadCountChanged$
        .subscribe(counts => {
          if (counts.size > 0) {
            expect(counts.get(1)).toBe(1);
            done();
          }
        });

      mockWebSocketService.chatMessages$.next(mockMessage);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    beforeEach(() => {
      service.subscribe(1);
    });

    it('should handle multiple messages', () => {
      for (let i = 0; i < 10; i++) {
        mockWebSocketService.chatMessages$.next({
          ...mockMessage,
          messageId: i
        });
      }

      const messages = service.getAllIncomingMessages();
      expect(messages.length).toBe(10);
    });

    it('should handle rapid messages', () => {
      let receivedCount = 0;

      service.messageReceived$
        .subscribe(() => {
          receivedCount++;
        });

      for (let i = 0; i < 5; i++) {
        mockWebSocketService.chatMessages$.next({
          ...mockMessage,
          messageId: i
        });
      }

      expect(receivedCount).toBe(5);
    });

    it('should clear conversation messages', () => {
      service['incomingMessages'].set(1, mockMessage);
      service['incomingMessages'].set(2, mockMessage);

      service.clearConversationMessages(1);

      expect(service.getConversationIncomingMessages(1).length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      service.subscribe(1);
      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
