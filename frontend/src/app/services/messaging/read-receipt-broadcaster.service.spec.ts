/**
 * Read Receipt Broadcaster Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { ReadReceiptBroadcasterService } from './read-receipt-broadcaster.service';
import { WebSocketService } from './websocket.service';

describe('ReadReceiptBroadcasterService', () => {
  let service: ReadReceiptBroadcasterService;
  let mockWebSocketService: any;

  beforeEach(() => {
    mockWebSocketService = {
      send: jasmine.createSpy('send'),
      isConnected: jasmine.createSpy('isConnected').and.returnValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        ReadReceiptBroadcasterService,
        { provide: WebSocketService, useValue: mockWebSocketService }
      ]
    });

    service = TestBed.inject(ReadReceiptBroadcasterService);
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
  });

  // ═══════════════════════════════════════════════════════════════
  // Broadcasting
  // ═══════════════════════════════════════════════════════════════

  describe('Broadcasting', () => {
    it('should broadcast single read receipt', (done) => {
      service.broadcastSent$
        .subscribe(status => {
          expect(status.messageIds.length).toBe(1);
          expect(status.conversationId).toBe(1);
          done();
        });

      service.broadcastReadReceipt(123, 1, 2, 'Reader Name');
    });

    it('should broadcast batch read receipts', (done) => {
      service.broadcastSent$
        .subscribe(status => {
          expect(status.messageIds.length).toBe(3);
          done();
        });

      service.broadcastReadReceiptBatch([1, 2, 3], 1, 2, 'Reader Name');
    });

    it('should send via WebSocket', (done) => {
      service.broadcastSent$
        .subscribe(() => {
          expect(mockWebSocketService.send).toHaveBeenCalled();
          done();
        });

      service.broadcastReadReceipt(123, 1, 2, 'Reader Name');
    });

    it('should return batch ID', () => {
      const batchId = service.broadcastReadReceipt(123, 1, 2, 'Reader Name');

      expect(batchId).toBeDefined();
      expect(typeof batchId).toBe('string');
      expect(batchId.startsWith('read-receipt-')).toBe(true);
    });

    it('should queue broadcast when not connected', (done) => {
      mockWebSocketService.isConnected.and.returnValue(false);

      service.broadcastSent$
        .subscribe(status => {
          expect(status.status).toBe('pending');
          done();
        });

      service.broadcastReadReceipt(123, 1, 2, 'Reader Name');
    });

    it('should create unique batch IDs', () => {
      const batchId1 = service.broadcastReadReceipt(1, 1, 2, 'Reader');
      const batchId2 = service.broadcastReadReceipt(2, 1, 2, 'Reader');

      expect(batchId1).not.toEqual(batchId2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Status & Query
  // ═══════════════════════════════════════════════════════════════

  describe('Status & Query', () => {
    it('should get broadcast status', (done) => {
      const batchId = service.broadcastReadReceipt(123, 1, 2, 'Reader');

      service.broadcastSent$
        .subscribe(() => {
          const status = service.getBroadcastStatus(batchId);
          expect(status).toBeDefined();
          expect(status?.batchId).toBe(batchId);
          done();
        });
    });

    it('should get all broadcast statuses', (done) => {
      service.broadcastReadReceipt(1, 1, 2, 'Reader');
      service.broadcastReadReceipt(2, 1, 2, 'Reader');

      service.broadcastSent$
        .subscribe(() => {
          const statuses = service.getAllBroadcastStatuses();
          expect(statuses.length).toBeGreaterThanOrEqual(2);
          done();
        });
    });

    it('should get pending broadcasts when disconnected', (done) => {
      mockWebSocketService.isConnected.and.returnValue(false);

      service.broadcastReadReceipt(123, 1, 2, 'Reader');

      setTimeout(() => {
        const pending = service.getPendingBroadcasts();
        expect(pending.length).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should get failed broadcasts', (done) => {
      service.broadcastFailed$
        .subscribe(() => {
          const failed = service.getFailedBroadcasts();
          expect(failed.length).toBeGreaterThan(0);
          done();
        });

      mockWebSocketService.send.and.throwError('Send error');
      service.broadcastReadReceipt(123, 1, 2, 'Reader');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Retry
  // ═══════════════════════════════════════════════════════════════

  describe('Retry', () => {
    it('should retry failed broadcast', (done) => {
      let retryAttempted = false;

      service.broadcastSent$
        .subscribe(status => {
          if (status.retries > 0) {
            retryAttempted = true;
          }
        });

      const batchId = service.broadcastReadReceipt(123, 1, 2, 'Reader');

      // Wait for timeout
      setTimeout(() => {
        const retried = service.retryBroadcast(batchId);
        expect(retried).toBe(true);
        done();
      }, 100);
    });

    it('should respect max retries', (done) => {
      const batchId = service.broadcastReadReceipt(123, 1, 2, 'Reader');

      let status = service.getBroadcastStatus(batchId);
      status!.retries = 3;  // Max retries

      const retried = service.retryBroadcast(batchId);
      expect(retried).toBe(false);
      done();
    });

    it('should not retry confirmed broadcasts', (done) => {
      const batchId = service.broadcastReadReceipt(123, 1, 2, 'Reader');

      service.broadcastSent$
        .subscribe(() => {
          const status = service.getBroadcastStatus(batchId);
          status!.status = 'confirmed';

          const retried = service.retryBroadcast(batchId);
          expect(retried).toBe(false);
          done();
        });
    });

    it('should increment retry count', (done) => {
      const batchId = service.broadcastReadReceipt(123, 1, 2, 'Reader');

      service.broadcastSent$
        .subscribe(() => {
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
  // Observable Streams
  // ═══════════════════════════════════════════════════════════════

  describe('Observable Streams', () => {
    it('should emit broadcastSent event', (done) => {
      service.broadcastSent$
        .subscribe(status => {
          expect(status.status).toBe('sent');
          done();
        });

      service.broadcastReadReceipt(123, 1, 2, 'Reader');
    });

    it('should emit broadcastFailed event on error', (done) => {
      mockWebSocketService.send.and.throwError('Send error');

      service.broadcastFailed$
        .subscribe(status => {
          expect(status.status).toBe('failed');
          expect(status.error).toBeDefined();
          done();
        });

      service.broadcastReadReceipt(123, 1, 2, 'Reader');
    });

    it('should provide broadcast status map', (done) => {
      service.broadcastStatus$
        .subscribe(statusMap => {
          if (statusMap.size > 0) {
            expect(statusMap.size).toBeGreaterThan(0);
            done();
          }
        });

      service.broadcastReadReceipt(123, 1, 2, 'Reader');
    });

    it('should emit broadcastConfirmed event', (done) => {
      const batchId = service.broadcastReadReceipt(123, 1, 2, 'Reader');

      service.broadcastSent$
        .subscribe(() => {
          const status = service.getBroadcastStatus(batchId);
          status!.status = 'confirmed';
          status!.confirmedAt = new Date();

          service.broadcastConfirmed$
            .subscribe(confirmation => {
              expect(confirmation.batchId).toBe(batchId);
              done();
            });
        });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Clear & Reset
  // ═══════════════════════════════════════════════════════════════

  describe('Clear & Reset', () => {
    it('should clear broadcast history', (done) => {
      service.broadcastReadReceipt(123, 1, 2, 'Reader');

      service.broadcastSent$
        .subscribe(() => {
          expect(service.getAllBroadcastStatuses().length).toBeGreaterThan(0);

          service.clearBroadcastHistory();

          expect(service.getAllBroadcastStatuses().length).toBe(0);
          done();
        });
    });

    it('should clear pending broadcasts', (done) => {
      mockWebSocketService.isConnected.and.returnValue(false);

      service.broadcastReadReceipt(123, 1, 2, 'Reader');

      setTimeout(() => {
        expect(service.getPendingBroadcasts().length).toBeGreaterThan(0);

        service.clearBroadcastHistory();

        expect(service.getPendingBroadcasts().length).toBe(0);
        done();
      }, 100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle rapid broadcasts', (done) => {
      for (let i = 0; i < 10; i++) {
        service.broadcastReadReceipt(i, 1, 2, 'Reader');
      }

      service.broadcastSent$
        .subscribe(() => {
          expect(service.getAllBroadcastStatuses().length).toBeGreaterThan(0);
          done();
        });
    });

    it('should handle large message batches', (done) => {
      const messageIds = Array.from({ length: 100 }, (_, i) => i + 1);

      service.broadcastSent$
        .subscribe(status => {
          expect(status.messageIds.length).toBe(100);
          done();
        });

      service.broadcastReadReceiptBatch(messageIds, 1, 2, 'Reader');
    });

    it('should handle connection state changes', (done) => {
      mockWebSocketService.isConnected.and.returnValue(false);

      const batchId = service.broadcastReadReceipt(123, 1, 2, 'Reader');
      const status1 = service.getBroadcastStatus(batchId);
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
        service.broadcastReadReceipt(123, 1, 2, 'Reader');
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
      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
