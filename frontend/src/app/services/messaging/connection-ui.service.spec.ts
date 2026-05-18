/**
 * Connection UI Service Tests
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ConnectionUiService, ConnectionNotification } from './connection-ui.service';
import { ConnectionManagerService } from './connection-manager.service';
import { ConnectionState } from './models';
import { Subject } from 'rxjs';

describe('ConnectionUiService', () => {
  let service: ConnectionUiService;
  let mockConnectionManager: any;
  let connectionStateSubject: Subject<ConnectionState>;
  let connectionEventSubject: Subject<any>;

  beforeEach(() => {
    connectionStateSubject = new Subject<ConnectionState>();
    connectionEventSubject = new Subject<any>();

    mockConnectionManager = {
      connectionState: connectionStateSubject.asObservable(),
      connectionEvent: connectionEventSubject.asObservable(),
      getReconnectionStrategy: jasmine.createSpy('getReconnectionStrategy').and.returnValue({
        maxAttempts: 20
      }),
      reconnect: jasmine.createSpy('reconnect')
    };

    TestBed.configureTestingModule({
      providers: [
        ConnectionUiService,
        { provide: ConnectionManagerService, useValue: mockConnectionManager }
      ]
    });

    service = TestBed.inject(ConnectionUiService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    connectionStateSubject.complete();
    connectionEventSubject.complete();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have initial status display', () => {
      const display = service.getStatusDisplay();
      expect(display).toBeDefined();
      expect(display.state).toBeDefined();
    });

    it('should start with hidden banner', () => {
      expect(service.isBannerShown()).toBe(false);
    });

    it('should start with no notifications', () => {
      expect(service.getActiveNotifications().length).toBe(0);
    });
  });

  describe('Status Display', () => {
    it('should get status display', () => {
      const display = service.getStatusDisplay();

      expect(display.mainText).toBeDefined();
      expect(display.subText).toBeDefined();
      expect(display.iconClass).toBeDefined();
      expect(display.colorClass).toBeDefined();
    });

    it('should get status message', () => {
      const message = service.getStatusMessage(ConnectionState.CONNECTED);

      expect(message).toBe('Connected');
    });

    it('should get status description', () => {
      const description = service.getStatusDescription(ConnectionState.DISCONNECTED);

      expect(description).toContain('Offline');
    });

    it('should get icon class', () => {
      const icon = service.getIconClass(ConnectionState.CONNECTED);

      expect(icon).toBeDefined();
    });

    it('should get color class', () => {
      const color = service.getColorClass(ConnectionState.DISCONNECTED);

      expect(color).toBeDefined();
    });

    it('should report animation status', () => {
      const animated = service.isStatusAnimated(ConnectionState.RECONNECTING);

      expect(animated).toBe(true);
    });

    it('should report retry button visibility', () => {
      const showRetry = service.shouldShowRetryButton(ConnectionState.DISCONNECTED);

      expect(showRetry).toBe(true);
    });

    it('should format full status text', () => {
      const text = service.getFullStatusText(ConnectionState.CONNECTED, false);

      expect(text).toBe('Connected');
    });

    it('should format full status text with details', () => {
      const text = service.getFullStatusText(ConnectionState.DISCONNECTED, true);

      expect(text).toContain('Disconnected');
      expect(text).toContain('-');
    });
  });

  describe('Connected State Display', () => {
    it('should show connected status', () => {
      const display = service.getStatusDisplay(ConnectionState.CONNECTED);

      expect(display.mainText).toBe('Connected');
      expect(display.colorClass).toContain('success');
      expect(display.isAnimated).toBe(false);
      expect(display.showRetryButton).toBe(false);
    });

    it('should have check circle icon', () => {
      const display = service.getStatusDisplay(ConnectionState.CONNECTED);

      expect(display.iconClass).toContain('check');
    });
  });

  describe('Disconnected State Display', () => {
    it('should show disconnected status', () => {
      const display = service.getStatusDisplay(ConnectionState.DISCONNECTED);

      expect(display.mainText).toBe('Disconnected');
      expect(display.colorClass).toContain('warning');
      expect(display.showRetryButton).toBe(true);
    });

    it('should have wifi off icon', () => {
      const display = service.getStatusDisplay(ConnectionState.DISCONNECTED);

      expect(display.iconClass).toContain('wifi-off');
    });
  });

  describe('Reconnecting State Display', () => {
    it('should show reconnecting status', () => {
      const display = service.getStatusDisplay(ConnectionState.RECONNECTING);

      expect(display.mainText).toBe('Reconnecting...');
      expect(display.isAnimated).toBe(true);
    });

    it('should have sync icon', () => {
      const display = service.getStatusDisplay(ConnectionState.RECONNECTING);

      expect(display.iconClass).toContain('sync');
    });
  });

  describe('Notifications', () => {
    it('should add notification', () => {
      const notification = service.addNotification({
        type: 'info',
        message: 'Test notification',
        dismissible: true,
        autoClose: false
      });

      expect(notification.id).toBeDefined();
      expect(notification.message).toBe('Test notification');
      expect(service.getActiveNotifications().length).toBe(1);
    });

    it('should generate unique notification IDs', () => {
      const notif1 = service.addNotification({
        type: 'info',
        message: 'First',
        dismissible: true,
        autoClose: false
      });

      const notif2 = service.addNotification({
        type: 'info',
        message: 'Second',
        dismissible: true,
        autoClose: false
      });

      expect(notif1.id).not.toEqual(notif2.id);
    });

    it('should dismiss notification', () => {
      const notif = service.addNotification({
        type: 'info',
        message: 'Test',
        dismissible: true,
        autoClose: false
      });

      service.dismissNotification(notif.id);

      expect(service.getActiveNotifications().length).toBe(0);
    });

    it('should auto-close notification', fakeAsync(() => {
      service.addNotification({
        type: 'info',
        message: 'Auto-close test',
        dismissible: true,
        autoClose: true,
        autoCloseDuration: 100
      });

      expect(service.getActiveNotifications().length).toBe(1);

      tick(150);

      expect(service.getActiveNotifications().length).toBe(0);
    }));

    it('should emit notification added event', (done) => {
      service.notificationAdded.subscribe(notif => {
        expect(notif.message).toBe('Test');
        done();
      });

      service.addNotification({
        type: 'info',
        message: 'Test',
        dismissible: true,
        autoClose: false
      });
    });

    it('should emit notification dismissed event', (done) => {
      const notif = service.addNotification({
        type: 'info',
        message: 'Test',
        dismissible: true,
        autoClose: false
      });

      service.notificationDismissed.subscribe(id => {
        expect(id).toBe(notif.id);
        done();
      });

      service.dismissNotification(notif.id);
    });

    it('should clear all notifications', () => {
      service.addNotification({
        type: 'info',
        message: 'First',
        dismissible: true,
        autoClose: false
      });

      service.addNotification({
        type: 'info',
        message: 'Second',
        dismissible: true,
        autoClose: false
      });

      expect(service.getActiveNotifications().length).toBe(2);

      service.clearNotifications();

      expect(service.getActiveNotifications().length).toBe(0);
    });

    it('should get notification by ID', () => {
      const added = service.addNotification({
        type: 'info',
        message: 'Test',
        dismissible: true,
        autoClose: false
      });

      const retrieved = service.getNotification(added.id);

      expect(retrieved?.id).toEqual(added.id);
    });

    it('should set timestamp on notification', () => {
      const notif = service.addNotification({
        type: 'info',
        message: 'Test',
        dismissible: true,
        autoClose: false
      });

      expect(notif.timestamp).toBeDefined();
      expect(notif.timestamp instanceof Date).toBe(true);
    });
  });

  describe('Banner Control', () => {
    it('should show banner', () => {
      service.showConnectionBanner();

      expect(service.isBannerShown()).toBe(true);
    });

    it('should hide banner', () => {
      service.showConnectionBanner();
      expect(service.isBannerShown()).toBe(true);

      service.hideConnectionBanner();
      expect(service.isBannerShown()).toBe(false);
    });

    it('should emit banner visibility changes', (done) => {
      service.showBanner.subscribe(shown => {
        if (shown) {
          expect(shown).toBe(true);
          done();
        }
      });

      service.showConnectionBanner();
    });
  });

  describe('State Change Events', () => {
    it('should handle disconnected event', (done) => {
      service.notificationAdded.subscribe(notif => {
        if (notif.message === 'Connection Lost') {
          expect(notif.type).toBe('warning');
          done();
        }
      });

      connectionStateSubject.next(ConnectionState.DISCONNECTED);
    });

    it('should handle connected event', (done) => {
      // First disconnect
      connectionStateSubject.next(ConnectionState.DISCONNECTED);

      setTimeout(() => {
        service.notificationAdded.subscribe(notif => {
          if (notif.message === 'Reconnected') {
            expect(notif.type).toBe('success');
            done();
          }
        });

        connectionStateSubject.next(ConnectionState.CONNECTED);
      }, 100);
    });

    it('should handle reconnecting event', (done) => {
      service.notificationAdded.subscribe(notif => {
        if (notif.message === 'Reconnecting...') {
          expect(notif.type).toBe('info');
          done();
        }
      });

      connectionStateSubject.next(ConnectionState.RECONNECTING);
    });

    it('should show banner on disconnect', (done) => {
      service.showBanner.subscribe(shown => {
        if (shown) {
          expect(service.isBannerShown()).toBe(true);
          done();
        }
      });

      connectionStateSubject.next(ConnectionState.DISCONNECTED);
    });

    it('should hide banner on reconnect after delay', fakeAsync(() => {
      connectionStateSubject.next(ConnectionState.DISCONNECTED);
      expect(service.isBannerShown()).toBe(true);

      connectionStateSubject.next(ConnectionState.CONNECTED);

      tick(1000);

      expect(service.isBannerShown()).toBe(true);

      tick(1500);

      expect(service.isBannerShown()).toBe(false);
    }));
  });

  describe('Notification Actions', () => {
    it('should execute action callback', () => {
      const callback = jasmine.createSpy('callback');

      const notif = service.addNotification({
        type: 'error',
        message: 'Error',
        dismissible: true,
        autoClose: false,
        actionCallback: callback
      });

      const stored = service.getNotification(notif.id);
      if (stored?.actionCallback) {
        stored.actionCallback();
      }

      expect(callback).toHaveBeenCalled();
    });

    it('should include action label', () => {
      const notif = service.addNotification({
        type: 'warning',
        message: 'Warning',
        dismissible: true,
        autoClose: false,
        actionLabel: 'Retry'
      });

      expect(notif.actionLabel).toBe('Retry');
    });
  });

  describe('Accessibility', () => {
    it('should set aria-live for disconnected', (done) => {
      service.notificationAdded.subscribe(notif => {
        if (notif.message === 'Connection Lost') {
          expect(notif.ariaLive).toBe('assertive');
          done();
        }
      });

      connectionStateSubject.next(ConnectionState.DISCONNECTED);
    });

    it('should set aria-live for reconnected', (done) => {
      connectionStateSubject.next(ConnectionState.DISCONNECTED);

      setTimeout(() => {
        service.notificationAdded.subscribe(notif => {
          if (notif.message === 'Reconnected') {
            expect(notif.ariaLive).toBe('assertive');
            done();
          }
        });

        connectionStateSubject.next(ConnectionState.CONNECTED);
      }, 100);
    });

    it('should set aria-live polite for reconnecting', (done) => {
      service.notificationAdded.subscribe(notif => {
        if (notif.message === 'Reconnecting...') {
          expect(notif.ariaLive).toBe('polite');
          done();
        }
      });

      connectionStateSubject.next(ConnectionState.RECONNECTING);
    });
  });

  describe('Active Notifications Observable', () => {
    it('should emit active notifications', (done) => {
      service.activeNotifications.subscribe(notifications => {
        if (notifications.length === 1) {
          expect(notifications[0].message).toBe('Test');
          done();
        }
      });

      service.addNotification({
        type: 'info',
        message: 'Test',
        dismissible: true,
        autoClose: false
      });
    });

    it('should sort notifications by timestamp', (done) => {
      service.activeNotifications.subscribe(notifications => {
        if (notifications.length === 2) {
          // Should be sorted by timestamp descending
          expect(
            notifications[0].timestamp >= notifications[1].timestamp
          ).toBe(true);
          done();
        }
      });

      service.addNotification({
        type: 'info',
        message: 'First',
        dismissible: true,
        autoClose: false
      });

      setTimeout(() => {
        service.addNotification({
          type: 'info',
          message: 'Second',
          dismissible: true,
          autoClose: false
        });
      }, 10);
    });
  });

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      service.addNotification({
        type: 'info',
        message: 'Test',
        dismissible: true,
        autoClose: false
      });

      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });

    it('should complete observables on destroy', (done) => {
      service.statusDisplay.subscribe({
        complete: () => done()
      });

      service.ngOnDestroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid state changes', () => {
      connectionStateSubject.next(ConnectionState.DISCONNECTED);
      connectionStateSubject.next(ConnectionState.RECONNECTING);
      connectionStateSubject.next(ConnectionState.CONNECTED);

      expect(service.getStatusDisplay()).toBeDefined();
    });

    it('should handle dismiss on already dismissed notification', () => {
      const notif = service.addNotification({
        type: 'info',
        message: 'Test',
        dismissible: true,
        autoClose: false
      });

      service.dismissNotification(notif.id);

      expect(() => {
        service.dismissNotification(notif.id);
      }).not.toThrow();
    });
  });
});
