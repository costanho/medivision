/**
 * Presence Broadcaster Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { PresenceBroadcasterService } from './presence-broadcaster.service';
import { WebSocketService } from './websocket.service';

describe('PresenceBroadcasterService', () => {
  let service: PresenceBroadcasterService;
  let mockWebSocketService: any;

  beforeEach(() => {
    mockWebSocketService = {
      send: jasmine.createSpy('send'),
      isConnected: jasmine.createSpy('isConnected').and.returnValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        PresenceBroadcasterService,
        { provide: WebSocketService, useValue: mockWebSocketService }
      ]
    });

    service = TestBed.inject(PresenceBroadcasterService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have default configuration', () => {
      const config = service.getConfig();
      expect(config.destination).toBe('/app/presence');
      expect(config.heartbeatInterval).toBe(30000);
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast user online', (done) => {
      service.broadcastSent.subscribe(status => {
        expect(status.status).toBe('online');
        done();
      });

      service.broadcastUserOnline(1);
    });

    it('should broadcast user offline', (done) => {
      service.broadcastSent.subscribe(status => {
        expect(status.status).toBe('offline');
        done();
      });

      service.broadcastUserOffline(1);
    });

    it('should send via WebSocket', (done) => {
      service.broadcastSent.subscribe(() => {
        expect(mockWebSocketService.send).toHaveBeenCalled();
        done();
      });

      service.broadcastUserOnline(1);
    });

    it('should return unique batch IDs', () => {
      const id1 = service.broadcastUserOnline(1);
      const id2 = service.broadcastUserOnline(1);

      expect(id1).not.toEqual(id2);
    });

    it('should queue when disconnected', (done) => {
      mockWebSocketService.isConnected.and.returnValue(false);

      service.broadcastSent.subscribe(status => {
        expect(status.broadcastStatus).toBe('pending');
        done();
      });

      service.broadcastUserOnline(1);
    });
  });

  describe('Heartbeat', () => {
    it('should start heartbeat', (done) => {
      service.startHeartbeat(1);

      setTimeout(() => {
        expect(mockWebSocketService.send).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should stop heartbeat', (done) => {
      service.startHeartbeat(1);
      service.stopHeartbeat();

      setTimeout(() => {
        // Reset mock call count
        mockWebSocketService.send.calls.reset();

        setTimeout(() => {
          // Should not be called after stopping
          expect(mockWebSocketService.send).not.toHaveBeenCalled();
          done();
        }, 100);
      }, 50);
    });
  });

  describe('Retry', () => {
    it('should retry failed broadcast', (done) => {
      const batchId = service.broadcastUserOnline(1);

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
      const batchId = service.broadcastUserOnline(1);
      const status = service.getBroadcastStatus(batchId);
      status!.retries = 3;

      const retried = service.retryBroadcast(batchId);
      expect(retried).toBe(false);
    });

    it('should not retry confirmed broadcasts', (done) => {
      const batchId = service.broadcastUserOnline(1);

      service.broadcastSent.subscribe(() => {
        const status = service.getBroadcastStatus(batchId);
        status!.broadcastStatus = 'confirmed';

        const retried = service.retryBroadcast(batchId);
        expect(retried).toBe(false);
        done();
      });
    });
  });

  describe('Status & Query', () => {
    it('should get broadcast status', (done) => {
      const batchId = service.broadcastUserOnline(1);

      service.broadcastSent.subscribe(() => {
        const status = service.getBroadcastStatus(batchId);
        expect(status).toBeDefined();
        expect(status?.batchId).toBe(batchId);
        done();
      });
    });

    it('should get all statuses', (done) => {
      service.broadcastUserOnline(1);
      service.broadcastUserOffline(2);

      service.broadcastSent.subscribe(() => {
        const statuses = service.getAllBroadcastStatuses();
        expect(statuses.length).toBeGreaterThanOrEqual(2);
        done();
      });
    });

    it('should get pending broadcasts', () => {
      mockWebSocketService.isConnected.and.returnValue(false);
      service.broadcastUserOnline(1);

      const pending = service.getPendingBroadcasts();
      expect(pending.length).toBeGreaterThan(0);
    });

    it('should get failed broadcasts on error', (done) => {
      mockWebSocketService.send.and.throwError('Send error');

      service.broadcastFailed.subscribe(() => {
        const failed = service.getFailedBroadcasts();
        expect(failed.length).toBeGreaterThan(0);
        done();
      });

      service.broadcastUserOnline(1);
    });
  });

  describe('Confirmation', () => {
    it('should confirm broadcast', (done) => {
      const batchId = service.broadcastUserOnline(1);

      service.broadcastConfirmed.subscribe(status => {
        expect(status.batchId).toBe(batchId);
        expect(status.broadcastStatus).toBe('confirmed');
        done();
      });

      service.confirmBroadcast(batchId);
    });
  });

  describe('Clear & Reset', () => {
    it('should clear broadcast history', (done) => {
      service.broadcastUserOnline(1);

      service.broadcastSent.subscribe(() => {
        expect(service.getAllBroadcastStatuses().length).toBeGreaterThan(0);

        service.clearBroadcastHistory();

        expect(service.getAllBroadcastStatuses().length).toBe(0);
        done();
      });
    });
  });

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      service.startHeartbeat(1);
      service.broadcastUserOnline(1);

      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
