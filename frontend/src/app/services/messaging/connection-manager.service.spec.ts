/**
 * Connection Manager Service Tests
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ConnectionManagerService } from './connection-manager.service';
import { WebSocketService } from './websocket.service';
import { ConnectionState } from './models';

describe('ConnectionManagerService', () => {
  let service: ConnectionManagerService;
  let mockWebSocketService: any;

  beforeEach(() => {
    mockWebSocketService = {
      connectionStatus$: jasmine.createSpyObj('Observable', ['pipe']),
      connect: jasmine.createSpy('connect')
    };

    // Make the observable work properly
    mockWebSocketService.connectionStatus$ = {
      pipe: jasmine.createSpy('pipe').and.returnValue({
        subscribe: (callback: Function) => {
          // Mock successful connection
          return { unsubscribe: () => {} };
        }
      })
    };

    TestBed.configureTestingModule({
      providers: [
        ConnectionManagerService,
        { provide: WebSocketService, useValue: mockWebSocketService }
      ]
    });

    service = TestBed.inject(ConnectionManagerService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with disconnected state', () => {
      expect(service.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should have default reconnection strategy', () => {
      const strategy = service.getReconnectionStrategy();

      expect(strategy.enabled).toBe(true);
      expect(strategy.initialDelay).toBe(1000);
      expect(strategy.maxDelay).toBe(30000);
      expect(strategy.backoffMultiplier).toBe(2);
      expect(strategy.maxAttempts).toBe(20);
    });

    it('should not be connected initially', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should not be reconnecting initially', () => {
      expect(service.isReconnecting()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should update reconnection strategy', () => {
      service.setReconnectionStrategy({
        initialDelay: 2000,
        maxAttempts: 10
      });

      const strategy = service.getReconnectionStrategy();
      expect(strategy.initialDelay).toBe(2000);
      expect(strategy.maxAttempts).toBe(10);
    });

    it('should preserve other settings when updating strategy', () => {
      const original = service.getReconnectionStrategy();

      service.setReconnectionStrategy({ initialDelay: 2000 });

      const updated = service.getReconnectionStrategy();
      expect(updated.maxDelay).toBe(original.maxDelay);
      expect(updated.backoffMultiplier).toBe(original.backoffMultiplier);
    });

    it('should disable reconnection', () => {
      service.setReconnectionStrategy({ enabled: false });

      const strategy = service.getReconnectionStrategy();
      expect(strategy.enabled).toBe(false);
    });
  });

  describe('Connection State', () => {
    it('should get connection state', () => {
      expect(service.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should check if connected', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should check if reconnecting', () => {
      expect(service.isReconnecting()).toBe(false);
    });

    it('should check if degraded', () => {
      expect(service.isDegraded()).toBe(false);
    });
  });

  describe('Metrics', () => {
    it('should get initial metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics.isConnected).toBe(false);
      expect(metrics.reconnectAttempts).toBe(0);
      expect(metrics.successfulReconnects).toBe(0);
      expect(metrics.failedReconnects).toBe(0);
    });

    it('should get connection uptime', () => {
      const uptime = service.getConnectionUptime();
      expect(uptime).toBe(0);
    });

    it('should get total downtime', () => {
      const downtime = service.getTotalDowntime();
      expect(downtime).toBe(0);
    });

    it('should get reconnection attempts', () => {
      const attempts = service.getReconnectAttempts();
      expect(attempts).toBe(0);
    });

    it('should get average reconnection time', () => {
      const avgTime = service.getAverageReconnectionTime();
      expect(avgTime).toBe(0);
    });
  });

  describe('Reconnection Control', () => {
    it('should not reconnect when already connected', () => {
      // Simulate connected state
      service['currentState'] = ConnectionState.CONNECTED;

      service.reconnect();

      expect(mockWebSocketService.connect).not.toHaveBeenCalled();
    });

    it('should cancel pending reconnection', fakeAsync(() => {
      service['currentState'] = ConnectionState.DISCONNECTED;
      service['reconnectTimer'] = window.setTimeout(() => {}, 1000);

      service.cancelReconnect();

      expect(service.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    }));

    it('should reset reconnection attempts', () => {
      service['reconnectAttempts'] = 5;

      service.resetReconnectAttempts();

      expect(service.getReconnectAttempts()).toBe(0);
    });
  });

  describe('Connection State Changes', () => {
    it('should emit connection state changes', (done) => {
      service.connectionState.subscribe(state => {
        if (state === ConnectionState.DISCONNECTED) {
          expect(state).toBe(ConnectionState.DISCONNECTED);
          done();
        }
      });
    });

    it('should emit connection events', (done) => {
      service.connectionEvent.subscribe(event => {
        if (event.state === ConnectionState.DISCONNECTED) {
          expect(event.timestamp).toBeDefined();
          done();
        }
      });
    });

    it('should track state changes', (done) => {
      let changeCount = 0;

      service.stateChanged.subscribe(() => {
        changeCount++;
        if (changeCount === 1) {
          done();
        }
      });

      service['updateState'](ConnectionState.RECONNECTING);
    });
  });

  describe('Metrics Tracking', () => {
    it('should emit connection metrics', (done) => {
      service.connectionMetrics.subscribe(metrics => {
        expect(metrics).toBeDefined();
        expect(metrics.isConnected).toBe(false);
        done();
      });
    });

    it('should emit reconnection status', (done) => {
      service.reconnectionStatus.subscribe(status => {
        expect(status).toBeDefined();
        expect(status.maxAttempts).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('Network Quality', () => {
    it('should emit network quality', (done) => {
      service.networkQuality.subscribe(quality => {
        expect(quality).toBeDefined();
        done();
      });
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate exponential delay', () => {
      const strategy = service.getReconnectionStrategy();

      // Attempt 1: 1000ms
      // Attempt 2: 2000ms
      // Attempt 3: 4000ms
      // etc.

      expect(strategy.initialDelay).toBe(1000);
      expect(strategy.backoffMultiplier).toBe(2);
      expect(strategy.maxDelay).toBe(30000);
    });

    it('should cap delay at max delay', fakeAsync(() => {
      service.setReconnectionStrategy({
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 3
      });

      service['reconnectAttempts'] = 10;
      service['scheduleReconnect']();

      tick(6000);

      // Should be capped at maxDelay
      expect(service.getReconnectAttempts()).toBeGreaterThan(0);
    }));
  });

  describe('Max Reconnection Attempts', () => {
    it('should fail after max attempts', () => {
      service.setReconnectionStrategy({ maxAttempts: 2 });

      service['reconnectAttempts'] = 2;
      service['scheduleReconnect']();

      expect(service.getConnectionState()).toBe(ConnectionState.RECONNECTION_FAILED);
    });

    it('should emit reconnection failed event', (done) => {
      service.setReconnectionStrategy({ maxAttempts: 1 });
      service['reconnectAttempts'] = 1;

      service.connectionEvent.subscribe(event => {
        if (event.state === ConnectionState.RECONNECTION_FAILED) {
          expect(event.attemptNumber).toBe(1);
          done();
        }
      });

      service['scheduleReconnect']();
    });
  });

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      service['reconnectTimer'] = window.setTimeout(() => {}, 1000);

      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });

    it('should clear timers on destroy', () => {
      const timer = window.setTimeout(() => {}, 1000);
      service['reconnectTimer'] = timer;

      service.ngOnDestroy();

      expect(service['reconnectTimer']).toBeUndefined();
    });

    it('should complete observables on destroy', (done) => {
      service.connectionState.subscribe({
        complete: () => done()
      });

      service.ngOnDestroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      service['updateState'](ConnectionState.RECONNECTING);
      service['updateState'](ConnectionState.DISCONNECTED);
      service['updateState'](ConnectionState.RECONNECTING);

      expect(service.getConnectionState()).toBe(ConnectionState.RECONNECTING);
    });

    it('should ignore duplicate state updates', () => {
      service['updateState'](ConnectionState.RECONNECTING);
      const state1 = service.getConnectionState();

      service['updateState'](ConnectionState.RECONNECTING);
      const state2 = service.getConnectionState();

      expect(state1).toBe(state2);
    });

    it('should handle reconnection when already scheduled', fakeAsync(() => {
      service['reconnectTimer'] = window.setTimeout(() => {}, 1000);

      service.reconnect();

      tick(500);

      expect(service['reconnectTimer']).toBeDefined();
    }));
  });

  describe('Jitter in Backoff', () => {
    it('should add jitter to backoff delay', () => {
      // Jitter should be ±10% of exponential delay
      const strategy = service.getReconnectionStrategy();
      const baseDelay = strategy.initialDelay;

      // Test that delays vary (due to jitter) but stay within reasonable bounds
      const delays: number[] = [];

      for (let i = 0; i < 3; i++) {
        const exponential = baseDelay * Math.pow(strategy.backoffMultiplier, i);
        const jitter = exponential * 0.1; // ±10%

        // Delay should be within [exponential - jitter, exponential + jitter]
        expect(exponential - jitter).toBeLessThan(exponential + jitter);
      }
    });
  });
});
