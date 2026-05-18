/**
 * Typing Indicator Broadcaster Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { TypingIndicatorBroadcasterService } from './typing-indicator-broadcaster.service';
import { WebSocketService } from './websocket.service';

describe('TypingIndicatorBroadcasterService', () => {
  let service: TypingIndicatorBroadcasterService;
  let mockWebSocketService: any;

  beforeEach(() => {
    mockWebSocketService = {
      send: jasmine.createSpy('send'),
      isConnected: jasmine.createSpy('isConnected').and.returnValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        TypingIndicatorBroadcasterService,
        { provide: WebSocketService, useValue: mockWebSocketService }
      ]
    });

    service = TestBed.inject(TypingIndicatorBroadcasterService);
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

    it('should have default configuration', () => {
      const config = service.getConfig();
      expect(config.destination).toBe('/app/typing-indicator');
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelay).toBe(2000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  describe('Configuration', () => {
    it('should update configuration', () => {
      service.setConfig({
        destination: '/app/custom-typing',
        maxRetries: 5
      });

      const config = service.getConfig();
      expect(config.destination).toBe('/app/custom-typing');
      expect(config.maxRetries).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Broadcasting
  // ═══════════════════════════════════════════════════════════════

  describe('Broadcasting', () => {
    it('should broadcast typing indicator', (done) => {
      service.broadcastSent.subscribe(status => {
        expect(status.messageType).toBe('typing');
        expect(status.conversationId).toBe(1);
        done();
      });

      service.broadcastTyping(1, 2, 'User Name');
    });

    it('should broadcast stopped typing', (done) => {
      service.broadcastSent.subscribe(status => {
        expect(status.messageType).toBe('stopped_typing');
        expect(status.conversationId).toBe(1);
        done();
      });

      service.broadcastStoppedTyping(1, 2, 'User Name');
    });

    it('should send via WebSocket', (done) => {
      service.broadcastSent.subscribe(() => {
        expect(mockWebSocketService.send).toHaveBeenCalled();
        done();
      });

      service.broadcastTyping(1, 2, 'User Name');
    });

    it('should return batch ID', () => {
      const batchId = service.broadcastTyping(1, 2, 'User Name');

      expect(batchId).toBeDefined();
      expect(typeof batchId).toBe('string');
      expect(batchId.startsWith('typing-')).toBe(true);
    });

    it('should queue broadcast when not connected', (done) => {
      mockWebSocketService.isConnected.and.returnValue(false);

      service.broadcastSent.subscribe(status => {
        expect(status.status).toBe('pending');
        done();
      });

      service.broadcastTyping(1, 2, 'User Name');
    });

    it('should create unique batch IDs', () => {
      const batchId1 = service.broadcastTyping(1, 2, 'User1');
      const batchId2 = service.broadcastTyping(1, 3, 'User2');

      expect(batchId1).not.toEqual(batchId2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Status & Query
  // ═══════════════════════════════════════════════════════════════

  describe('Status & Query', () => {
    it('should get broadcast status', (done) => {
      const batchId = service.broadcastTyping(1, 2, 'User');

      service.broadcastSent.subscribe(() => {
        const status = service.getBroadcastStatus(batchId);
        expect(status).toBeDefined();
        expect(status?.batchId).toBe(batchId);
        done();
      });
    });

    it('should get all broadcast statuses', (done) => {
      service.broadcastTyping(1, 2, 'User');
      service.broadcastTyping(1, 3, 'User2');

      service.broadcastSent.subscribe(() => {
        const statuses = service.getAllBroadcastStatuses();
        expect(statuses.length).toBeGreaterThanOrEqual(2);
        done();
      });
    });

    it('should get pending broadcasts when disconnected', (done) => {
      mockWebSocketService.isConnected.and.returnValue(false);

      service.broadcastTyping(1, 2, 'User');

      setTimeout(() => {
        const pending = service.getPendingBroadcasts();
        expect(pending.length).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should get failed broadcasts on error', (done) => {
      mockWebSocketService.send.and.throwError('Send error');

      service.broadcastFailed.subscribe(() => {
        const failed = service.getFailedBroadcasts();
        expect(failed.length).toBeGreaterThan(0);
        done();
      });

      service.broadcastTyping(1, 2, 'User');
    });

    it('should get conversation broadcasts', (done) => {
      service.broadcastTyping(1, 2, 'User');
      service.broadcastTyping(2, 3, 'User2');

      service.broadcastSent.subscribe(() => {
        const conv1Broadcasts = service.getConversationBroadcasts(1);
        expect(conv1Broadcasts.length).toBeGreaterThan(0);
        expect(conv1Broadcasts.every(b => b.conversationId === 1)).toBe(true);
        done();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Retry
  // ═══════════════════════════════════════════════════════════════

  describe('Retry', () => {
    it('should retry failed broadcast', (done) => {
      const batchId = service.broadcastTyping(1, 2, 'User');

      service.broadcastSent.subscribe(status => {
        if (status.retries > 0) {
          expect(status.retries).toBe(1);
          done();
        }
      });

      setTimeout(() => {
        service.retryBroadcast(batchId);
      }, 100);
    });

    it('should respect max retries', () => {
      const batchId = service.broadcastTyping(1, 2, 'User');

      const status = service.getBroadcastStatus(batchId);
      status!.retries = 3; // Max retries

      const retried = service.retryBroadcast(batchId);
      expect(retried).toBe(false);
    });

    it('should not retry confirmed broadcasts', (done) => {
      const batchId = service.broadcastTyping(1, 2, 'User');

      service.broadcastSent.subscribe(() => {
        const status = service.getBroadcastStatus(batchId);
        status!.status = 'confirmed';

        const retried = service.retryBroadcast(batchId);
        expect(retried).toBe(false);
        done();
      });
    });

    it('should increment retry count', (done) => {
      const batchId = service.broadcastTyping(1, 2, 'User');

      service.broadcastSent.subscribe(() => {
        const beforeRetry = service.getBroadcastStatus(batchId);
        expect(beforeRetry?.retries).toBe(0);

        service.retryBroadcast(batchId);

        const afterRetry = service.getBroadcastStatus(batchId);
        expect(afterRetry?.retries).toBe(1);
        done();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Confirmation
  // ═══════════════════════════════════════════════════════════════

  describe('Confirmation', () => {
    it('should confirm broadcast', (done) => {
      const batchId = service.broadcastTyping(1, 2, 'User');

      service.broadcastConfirmed.subscribe(status => {
        expect(status.batchId).toBe(batchId);
        expect(status.status).toBe('confirmed');
        done();
      });

      service.confirmBroadcast(batchId);
    });

    it('should set confirmation timestamp', (done) => {
      const batchId = service.broadcastTyping(1, 2, 'User');

      service.broadcastConfirmed.subscribe(status => {
        expect(status.confirmedAt).toBeDefined();
        done();
      });

      service.confirmBroadcast(batchId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Observable Streams
  // ═══════════════════════════════════════════════════════════════

  describe('Observable Streams', () => {
    it('should emit broadcastSent event', (done) => {
      service.broadcastSent.subscribe(status => {
        expect(status.status).toBe('sent');
        done();
      });

      service.broadcastTyping(1, 2, 'User');
    });

    it('should emit broadcastFailed event on error', (done) => {
      mockWebSocketService.send.and.throwError('Send error');

      service.broadcastFailed.subscribe(status => {
        expect(status.status).toBe('failed');
        expect(status.error).toBeDefined();
        done();
      });

      service.broadcastTyping(1, 2, 'User');
    });

    it('should provide broadcast status map', (done) => {
      service.broadcastStatus.subscribe(statusMap => {
        if (statusMap.size > 0) {
          expect(statusMap.size).toBeGreaterThan(0);
          done();
        }
      });

      service.broadcastTyping(1, 2, 'User');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Clear & Reset
  // ═══════════════════════════════════════════════════════════════

  describe('Clear & Reset', () => {
    it('should clear broadcast history', (done) => {
      service.broadcastTyping(1, 2, 'User');

      service.broadcastSent.subscribe(() => {
        expect(service.getAllBroadcastStatuses().length).toBeGreaterThan(0);

        service.clearBroadcastHistory();

        expect(service.getAllBroadcastStatuses().length).toBe(0);
        done();
      });
    });

    it('should clear conversation broadcasts', (done) => {
      service.broadcastTyping(1, 2, 'User');
      service.broadcastTyping(2, 3, 'User2');

      service.broadcastSent.subscribe(() => {
        service.clearConversationBroadcasts(1);

        const conv1Broadcasts = service.getConversationBroadcasts(1);
        expect(conv1Broadcasts.length).toBe(0);

        const conv2Broadcasts = service.getConversationBroadcasts(2);
        expect(conv2Broadcasts.length).toBeGreaterThan(0);
        done();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle rapid broadcasts', (done) => {
      let broadcastCount = 0;

      service.broadcastSent.subscribe(() => {
        broadcastCount++;
      });

      for (let i = 0; i < 10; i++) {
        service.broadcastTyping(1, 2 + i, `User ${i}`);
      }

      service.broadcastSent.subscribe(() => {
        if (broadcastCount >= 10) {
          expect(service.getAllBroadcastStatuses().length).toBeGreaterThanOrEqual(10);
          done();
        }
      });
    });

    it('should handle connection state changes', (done) => {
      mockWebSocketService.isConnected.and.returnValue(false);

      const batchId = service.broadcastTyping(1, 2, 'User');
      let status1 = service.getBroadcastStatus(batchId);
      expect(status1?.status).toBe('pending');

      mockWebSocketService.isConnected.and.returnValue(true);

      service.retryBroadcast(batchId);

      setTimeout(() => {
        const status2 = service.getBroadcastStatus(batchId);
        expect(status2?.status).toBe('sent');
        done();
      }, 100);
    });

    it('should handle WebSocket send error gracefully', () => {
      mockWebSocketService.send.and.throwError('Network error');

      expect(() => {
        service.broadcastTyping(1, 2, 'User');
      }).not.toThrow();
    });

    it('should handle unknown batch ID', () => {
      const status = service.getBroadcastStatus('unknown-batch-id');
      expect(status).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      service.broadcastTyping(1, 2, 'User');

      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
