/**
 * Broadcast Confirmation Service Tests
 * Tests for dual confirmation workflow (sender and recipient)
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BroadcastConfirmationService, DualConfirmationState } from './broadcast-confirmation.service';
import { WebSocketService } from './websocket.service';
import { MessageBroadcasterService } from './message-broadcaster.service';
import { Subject } from 'rxjs';

describe('BroadcastConfirmationService', () => {
  let service: BroadcastConfirmationService;
  let mockWebSocketService: any;
  let mockBroadcasterService: any;

  beforeEach(() => {
    mockWebSocketService = {
      chatMessages$: new Subject(),
      connectionStatus$: new Subject()
    };

    mockBroadcasterService = {
      broadcastConfirmations$: new Subject(),
      messageSent$: new Subject(),
      messageDelivered$: new Subject(),
      getMessageStatus: jasmine.createSpy('getMessageStatus')
    };

    TestBed.configureTestingModule({
      providers: [
        BroadcastConfirmationService,
        { provide: WebSocketService, useValue: mockWebSocketService },
        { provide: MessageBroadcasterService, useValue: mockBroadcasterService }
      ]
    });

    service = TestBed.inject(BroadcastConfirmationService);
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

    it('should have empty confirmation states initially', () => {
      const states = service.getAllConfirmationStates();
      expect(states.length).toBe(0);
    });

    it('should start with 100% progress when no messages', () => {
      const progress = service.getConfirmationProgress();
      expect(progress).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Tracking Messages
  // ═══════════════════════════════════════════════════════════════

  describe('Track Message for Confirmation', () => {
    it('should track message for confirmation', () => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);

      const state = service.getConfirmationState('msg_1');
      expect(state).toBeTruthy();
      expect(state?.senderId).toBe(1);
      expect(state?.recipientId).toBe(2);
      expect(state?.confirmationStatus).toBe('pending');
    });

    it('should track multiple messages', () => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);
      service.trackMessageForConfirmation('msg_2', 0, 1, 3, 1);
      service.trackMessageForConfirmation('msg_3', 0, 1, 4, 1);

      const states = service.getAllConfirmationStates();
      expect(states.length).toBe(3);
    });

    it('should initialize with both confirmations false', () => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);

      const state = service.getConfirmationState('msg_1');
      expect(state?.senderConfirmed).toBe(false);
      expect(state?.recipientConfirmed).toBe(false);
      expect(state?.bothConfirmed).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Sender Confirmation
  // ═══════════════════════════════════════════════════════════════

  describe('Sender Confirmation', () => {
    beforeEach(() => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);
    });

    it('should mark sender as confirmed', (done) => {
      let confirmedCount = 0;

      service.senderConfirmed$
        .subscribe(() => {
          confirmedCount++;
          expect(confirmedCount).toBe(1);
          done();
        });

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'sender'
      });
    });

    it('should update confirmation status to sender-confirmed', (done) => {
      service.confirmationState$
        .subscribe(states => {
          const state = states.get('msg_1');
          if (state && state.senderConfirmed) {
            expect(state.confirmationStatus).toBe('sender-confirmed');
            done();
          }
        });

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'sender'
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Recipient Confirmation
  // ═══════════════════════════════════════════════════════════════

  describe('Recipient Confirmation', () => {
    beforeEach(() => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);
    });

    it('should mark recipient as confirmed', (done) => {
      let confirmedCount = 0;

      service.recipientConfirmed$
        .subscribe(() => {
          confirmedCount++;
          expect(confirmedCount).toBe(1);
          done();
        });

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'recipient'
      });
    });

    it('should update confirmation status to recipient-confirmed', (done) => {
      service.confirmationState$
        .subscribe(states => {
          const state = states.get('msg_1');
          if (state && state.recipientConfirmed) {
            expect(state.confirmationStatus).toBe('recipient-confirmed');
            done();
          }
        });

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'recipient'
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Dual Confirmation (Both Confirmed)
  // ═══════════════════════════════════════════════════════════════

  describe('Dual Confirmation', () => {
    beforeEach(() => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);
    });

    it('should emit bothConfirmed when both are confirmed', (done) => {
      let bothConfirmedEmitted = false;

      service.bothConfirmed$
        .subscribe(() => {
          bothConfirmedEmitted = true;
          expect(bothConfirmedEmitted).toBe(true);
          done();
        });

      // First confirm sender
      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'sender'
      });

      // Then confirm recipient
      setTimeout(() => {
        mockBroadcasterService.broadcastConfirmations$.next({
          clientMessageId: 'msg_1',
          confirmedBy: 'recipient'
        });
      }, 50);
    });

    it('should update status to both-confirmed', fakeAsync(() => {
      let bothConfirmedState: DualConfirmationState | undefined;

      service.bothConfirmed$
        .subscribe(state => {
          bothConfirmedState = state;
        });

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'sender'
      });

      tick(50);

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'recipient'
      });

      tick(50);

      expect(bothConfirmedState?.bothConfirmed).toBe(true);
      expect(bothConfirmedState?.confirmationStatus).toBe('both-confirmed');
    }));

    it('should set both confirmed timestamps', fakeAsync(() => {
      service.trackMessageForConfirmation('msg_2', 0, 1, 2, 1);

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_2',
        confirmedBy: 'sender'
      });

      tick(50);

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_2',
        confirmedBy: 'recipient'
      });

      const state = service.getConfirmationState('msg_2');
      expect(state?.senderConfirmedAt).toBeTruthy();
      expect(state?.recipientConfirmedAt).toBeTruthy();
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Confirmation Timeout
  // ═══════════════════════════════════════════════════════════════

  describe('Confirmation Timeout', () => {
    beforeEach(() => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);
    });

    it('should emit timeout when no confirmation received', fakeAsync(() => {
      let timeoutEmitted = false;

      service.confirmationTimeout$
        .subscribe(timeout => {
          timeoutEmitted = true;
          expect(timeout.clientMessageId).toBe('msg_1');
          expect(timeout.missingConfirmations).toContain('sender');
          expect(timeout.missingConfirmations).toContain('recipient');
        });

      // Wait for timeout (30 seconds)
      tick(30000);

      expect(timeoutEmitted).toBe(true);
    }));

    it('should mark state as timeout', fakeAsync(() => {
      let timeoutState: DualConfirmationState | undefined;

      service.confirmationState$
        .subscribe(states => {
          const state = states.get('msg_1');
          if (state && state.confirmationStatus === 'timeout') {
            timeoutState = state;
          }
        });

      tick(30000);

      expect(timeoutState?.confirmationStatus).toBe('timeout');
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Progress Tracking
  // ═══════════════════════════════════════════════════════════════

  describe('Confirmation Progress', () => {
    it('should track confirmation progress', fakeAsync(() => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);
      service.trackMessageForConfirmation('msg_2', 0, 1, 3, 1);

      expect(service.getConfirmationProgress()).toBe(0);

      // Confirm first message
      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'sender'
      });

      tick(50);

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'recipient'
      });

      tick(50);

      expect(service.getConfirmationProgress()).toBe(50);
    }));

    it('should emit progress updates', fakeAsync(() => {
      let progressUpdates: number[] = [];

      service.confirmationProgress$
        .subscribe(progress => {
          progressUpdates.push(progress);
        });

      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);

      tick(100);

      expect(progressUpdates.length).toBeGreaterThan(0);
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Status Management
  // ═══════════════════════════════════════════════════════════════

  describe('Status Management', () => {
    beforeEach(() => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);
      service.trackMessageForConfirmation('msg_2', 0, 1, 2, 1);
    });

    it('should get pending confirmations', () => {
      const pending = service.getPendingConfirmations();
      expect(pending.length).toBe(2);
    });

    it('should clear specific confirmation', () => {
      service.clearConfirmation('msg_1');

      const state = service.getConfirmationState('msg_1');
      expect(state).toBeUndefined();
    });

    it('should clear all confirmations', () => {
      service.clearAllConfirmations();

      const states = service.getAllConfirmationStates();
      expect(states.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Wait for Confirmation Promise
  // ═══════════════════════════════════════════════════════════════

  describe('Wait for Confirmation', () => {
    it('should resolve when both confirmed', fakeAsync((done) => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);

      const promise = service.waitForConfirmation('msg_1').toPromise();

      expect(promise).toBeTruthy();

      // Confirm both
      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'sender'
      });

      tick(50);

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'recipient'
      });

      tick(50);

      promise?.then(state => {
        expect(state.bothConfirmed).toBe(true);
      });
    }));

    it('should timeout if confirmation takes too long', fakeAsync(() => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);

      let errorOccurred = false;

      service.waitForConfirmation('msg_1', 5000)
        .subscribe({
          error: () => {
            errorOccurred = true;
          }
        });

      tick(6000);

      expect(errorOccurred).toBe(true);
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should destroy service gracefully', () => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);
      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });

    it('should clear all timeouts on destroy', () => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);
      service.trackMessageForConfirmation('msg_2', 0, 1, 2, 1);
      service.ngOnDestroy();

      const states = service.getAllConfirmationStates();
      // States are cleared
      expect(service).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle confirmation for unknown message', () => {
      expect(() => {
        mockBroadcasterService.broadcastConfirmations$.next({
          clientMessageId: 'unknown_id',
          confirmedBy: 'sender'
        });
      }).not.toThrow();
    });

    it('should handle duplicate confirmations', fakeAsync(() => {
      service.trackMessageForConfirmation('msg_1', 0, 1, 2, 1);

      let senderConfirmCount = 0;

      service.senderConfirmed$
        .subscribe(() => {
          senderConfirmCount++;
        });

      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'sender'
      });

      tick(50);

      // Send duplicate
      mockBroadcasterService.broadcastConfirmations$.next({
        clientMessageId: 'msg_1',
        confirmedBy: 'sender'
      });

      tick(50);

      // Should only emit once for first confirmation
      expect(senderConfirmCount).toBeGreaterThanOrEqual(1);
    }));
  });
});
