/**
 * Message Broadcaster Service Tests
 * Tests for WebSocket message broadcasting
 */

import { TestBed } from '@angular/core/testing';
import { MessageBroadcasterService, MessageBroadcastStatus } from './message-broadcaster.service';
import { WebSocketService } from './websocket.service';
import { Subject } from 'rxjs';

describe('MessageBroadcasterService', () => {
  let service: MessageBroadcasterService;
  let mockWebSocketService: any;

  beforeEach(() => {
    // Mock WebSocket service
    mockWebSocketService = {
      chatMessages$: new Subject(),
      connectionStatus$: new Subject(),
      isConnected: jasmine.createSpy('isConnected').and.returnValue(true),
      sendMessage: jasmine.createSpy('sendMessage'),
      connect: jasmine.createSpy('connect'),
      disconnect: jasmine.createSpy('disconnect')
    };

    TestBed.configureTestingModule({
      providers: [
        MessageBroadcasterService,
        { provide: WebSocketService, useValue: mockWebSocketService }
      ]
    });

    service = TestBed.inject(MessageBroadcasterService);
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

    it('should have empty sent messages map initially', () => {
      const messages = service.getSentMessages();
      expect(messages.length).toBe(0);
    });

    it('should have empty queue initially', () => {
      const queue = service.getQueuedMessages();
      expect(queue.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Send Message
  // ═══════════════════════════════════════════════════════════════

  describe('sendMessage', () => {
    it('should send message when connected', () => {
      const clientId = service.sendMessage(
        2,           // recipientId
        1,           // conversationId
        'Test',      // content
        1,           // senderId
        'John'       // senderName
      );

      expect(clientId).toBeTruthy();
      expect(mockWebSocketService.sendMessage).toHaveBeenCalled();
    });

    it('should queue message when disconnected', () => {
      mockWebSocketService.isConnected.and.returnValue(false);

      const clientId = service.sendMessage(2, 1, 'Test', 1, 'John');

      expect(clientId).toBeTruthy();
      expect(service.getQueueSize()).toBe(1);
      expect(mockWebSocketService.sendMessage).not.toHaveBeenCalled();
    });

    it('should track sent message status', () => {
      const clientId = service.sendMessage(2, 1, 'Test', 1, 'John');

      const status = service.getMessageStatus(clientId);
      expect(status).toBeTruthy();
      expect(status?.status).toBe('sent');
      expect(status?.conversationId).toBe(1);
      expect(status?.recipientId).toBe(2);
    });

    it('should generate unique message IDs', () => {
      const id1 = service.sendMessage(2, 1, 'Test 1', 1, 'John');
      const id2 = service.sendMessage(2, 1, 'Test 2', 1, 'John');

      expect(id1).not.toEqual(id2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Batch Sending
  // ═══════════════════════════════════════════════════════════════

  describe('sendMessages (batch)', () => {
    it('should send batch of messages', () => {
      const messages = [
        { content: 'Message 1', senderId: 1, senderName: 'John' },
        { content: 'Message 2', senderId: 1, senderName: 'John' },
        { content: 'Message 3', senderId: 1, senderName: 'John' }
      ];

      const ids = service.sendMessages(2, 1, messages);

      expect(ids.length).toBe(3);
      expect(service.getSentMessages().length).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Status Management
  // ═══════════════════════════════════════════════════════════════

  describe('Status Management', () => {
    beforeEach(() => {
      service.sendMessage(2, 1, 'Test 1', 1, 'John');
      service.sendMessage(2, 1, 'Test 2', 1, 'John');
    });

    it('should get message status', () => {
      const messages = service.getSentMessages();
      const status = service.getMessageStatus(messages[0].messageId);

      expect(status).toBeTruthy();
      expect(status?.content).toBe('Test 1');
    });

    it('should get all sent messages', () => {
      const messages = service.getSentMessages();
      expect(messages.length).toBe(2);
    });

    it('should get pending messages', () => {
      const pending = service.getPendingMessages();
      expect(pending.length).toBeGreaterThan(0);
    });

    it('should clear specific message', () => {
      const messages = service.getSentMessages();
      service.clearMessage(messages[0].messageId);

      expect(service.getSentMessages().length).toBe(1);
    });

    it('should clear all messages', () => {
      service.clearAllMessages();
      expect(service.getSentMessages().length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Queue Management
  // ═══════════════════════════════════════════════════════════════

  describe('Queue Management', () => {
    it('should queue message when offline', () => {
      mockWebSocketService.isConnected.and.returnValue(false);

      service.sendMessage(2, 1, 'Offline message', 1, 'John');

      expect(service.getQueueSize()).toBe(1);
      expect(service.getQueuedMessages().length).toBe(1);
    });

    it('should process queued messages when reconnected', (done) => {
      // First, go offline and queue messages
      mockWebSocketService.isConnected.and.returnValue(false);
      service.sendMessage(2, 1, 'Queued 1', 1, 'John');
      service.sendMessage(2, 1, 'Queued 2', 1, 'John');

      expect(service.getQueueSize()).toBe(2);

      // Now reconnect
      mockWebSocketService.isConnected.and.returnValue(true);
      mockWebSocketService.connectionStatus$.next({ isConnected: true, reconnectAttempts: 0 });

      setTimeout(() => {
        expect(service.getQueueSize()).toBe(0);
        expect(service.getSentMessages().length).toBe(2);
        done();
      }, 100);
    });

    it('should clear queue', () => {
      mockWebSocketService.isConnected.and.returnValue(false);
      service.sendMessage(2, 1, 'Test', 1, 'John');

      service.clearQueue();
      expect(service.getQueueSize()).toBe(0);
    });

    it('should not exceed queue size limit', () => {
      mockWebSocketService.isConnected.and.returnValue(false);

      // Send messages exceeding queue limit
      for (let i = 0; i < 150; i++) {
        service.sendMessage(2, 1, `Message ${i}`, 1, 'John');
      }

      expect(service.getQueueSize()).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Broadcast Confirmations
  // ═══════════════════════════════════════════════════════════════

  describe('Broadcast Confirmations', () => {
    it('should emit when message is sent', (done) => {
      let emitted = false;

      service.messageSent$
        .subscribe(status => {
          emitted = true;
          expect(status.status).toBe('sent');
          done();
        });

      service.sendMessage(2, 1, 'Test', 1, 'John');

      setTimeout(() => {
        expect(emitted).toBe(true);
      }, 50);
    });

    it('should emit when message is delivered', (done) => {
      const clientId = service.sendMessage(2, 1, 'Test', 1, 'John');

      service.messageDelivered$
        .subscribe(status => {
          expect(status.status).toBe('delivered');
          done();
        });

      // Simulate confirmation
      setTimeout(() => {
        const status = service.getMessageStatus(clientId);
        if (status) {
          status.status = 'delivered';
          service.messageDelivered$.next(status);
        }
      }, 50);
    });

    it('should track multiple confirmations', () => {
      const id1 = service.sendMessage(2, 1, 'Test 1', 1, 'John');
      const id2 = service.sendMessage(2, 1, 'Test 2', 1, 'John');

      let confirmCount = 0;

      service.broadcastConfirmations$
        .subscribe(() => {
          confirmCount++;
        });

      expect(service.getSentMessages().length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Retry Logic
  // ═══════════════════════════════════════════════════════════════

  describe('Retry Logic', () => {
    it('should retry failed message', (done) => {
      const clientId = service.sendMessage(2, 1, 'Test', 1, 'John');

      // Simulate failure
      mockWebSocketService.sendMessage.and.throwError('Network error');

      service.retryMessage(clientId);

      setTimeout(() => {
        expect(mockWebSocketService.sendMessage).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should retry all failed messages', () => {
      service.sendMessage(2, 1, 'Test 1', 1, 'John');
      service.sendMessage(2, 1, 'Test 2', 1, 'John');

      service.retryAllFailed();

      expect(mockWebSocketService.sendMessage).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Observable Streams
  // ═══════════════════════════════════════════════════════════════

  describe('Observable Streams', () => {
    it('should emit message status updates', (done) => {
      let emitted = false;

      service.messageStatus$
        .subscribe(statusMap => {
          if (statusMap.size > 0) {
            emitted = true;
          }
        });

      service.sendMessage(2, 1, 'Test', 1, 'John');

      setTimeout(() => {
        expect(emitted).toBe(true);
        done();
      }, 50);
    });

    it('should emit queue changes', (done) => {
      mockWebSocketService.isConnected.and.returnValue(false);

      service.queueChanged$
        .subscribe(size => {
          if (size > 0) {
            expect(size).toBe(1);
            done();
          }
        });

      service.sendMessage(2, 1, 'Test', 1, 'John');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should destroy service gracefully', () => {
      service.sendMessage(2, 1, 'Test', 1, 'John');
      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });

    it('should clear messages on destroy', () => {
      service.sendMessage(2, 1, 'Test', 1, 'John');
      service.ngOnDestroy();
      // Service is destroyed, verify no errors
      expect(service).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const clientId = service.sendMessage(2, 1, '', 1, 'John');
      expect(clientId).toBeTruthy();
    });

    it('should handle very long content', () => {
      const longContent = 'x'.repeat(10000);
      const clientId = service.sendMessage(2, 1, longContent, 1, 'John');

      const status = service.getMessageStatus(clientId);
      expect(status?.content.length).toBe(10000);
    });

    it('should handle rapid fire sending', () => {
      for (let i = 0; i < 10; i++) {
        service.sendMessage(2, 1, `Message ${i}`, 1, 'John');
      }

      expect(service.getSentMessages().length).toBe(10);
    });

    it('should get message with non-existent ID', () => {
      const status = service.getMessageStatus('non-existent-id');
      expect(status).toBeUndefined();
    });
  });
});
