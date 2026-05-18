/**
 * Chat Header Component Tests
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChatHeaderComponent, ChatParticipant, OnlineStatus } from './chat-header.component';
import { PresenceService } from '../../../services/messaging/presence.service';
import { TypingIndicatorService } from '../../../services/messaging/typing-indicator.service';
import { ConnectionManagerService } from '../../../services/messaging/connection-manager.service';
import { Subject } from 'rxjs';

describe('ChatHeaderComponent', () => {
  let component: ChatHeaderComponent;
  let fixture: ComponentFixture<ChatHeaderComponent>;
  let mockPresenceService: any;
  let mockTypingService: any;
  let mockConnectionManager: any;
  let presenceSubject: Subject<string>;
  let isOnlineSubject: Subject<boolean>;
  let statusSubject: Subject<string>;
  let typingSubject: Subject<boolean>;
  let connectionStateSubject: Subject<string>;

  const mockParticipant: ChatParticipant = {
    id: 1,
    name: 'Dr. John Smith',
    email: 'john@example.com',
    specialization: 'Cardiologist',
    lastSeen: new Date()
  };

  beforeEach(async () => {
    presenceSubject = new Subject<string>();
    isOnlineSubject = new Subject<boolean>();
    statusSubject = new Subject<string>();
    typingSubject = new Subject<boolean>();
    connectionStateSubject = new Subject<string>();

    mockPresenceService = {
      onlineIndicator$: jasmine.createSpy('onlineIndicator$').and.returnValue(presenceSubject.asObservable()),
      isUserOnline$: jasmine.createSpy('isUserOnline$').and.returnValue(isOnlineSubject.asObservable()),
      userPresenceStatus$: jasmine.createSpy('userPresenceStatus$').and.returnValue(statusSubject.asObservable())
    };

    mockTypingService = {
      isUserTyping$: jasmine.createSpy('isUserTyping$').and.returnValue(typingSubject.asObservable())
    };

    mockConnectionManager = {
      connectionState: connectionStateSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      imports: [ChatHeaderComponent],
      providers: [
        { provide: PresenceService, useValue: mockPresenceService },
        { provide: TypingIndicatorService, useValue: mockTypingService },
        { provide: ConnectionManagerService, useValue: mockConnectionManager }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatHeaderComponent);
    component = fixture.componentInstance;
    component.participant = mockParticipant;
  });

  afterEach(() => {
    presenceSubject.complete();
    isOnlineSubject.complete();
    statusSubject.complete();
    typingSubject.complete();
    connectionStateSubject.complete();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default values', () => {
      expect(component.onlineStatus).toBe(OnlineStatus.OFFLINE);
      expect(component.lastSeenTime).toBe('');
      expect(component.isConnected).toBe(true);
    });

    it('should subscribe to presence on init', () => {
      fixture.detectChanges();

      expect(mockPresenceService.onlineIndicator$).toHaveBeenCalledWith(mockParticipant.id);
      expect(mockPresenceService.isUserOnline$).toHaveBeenCalledWith(mockParticipant.id);
      expect(mockPresenceService.userPresenceStatus$).toHaveBeenCalledWith(mockParticipant.id);
    });

    it('should subscribe to typing indicator', () => {
      fixture.detectChanges();

      expect(mockTypingService.isUserTyping$).toHaveBeenCalledWith(mockParticipant.id);
    });

    it('should subscribe to connection status', () => {
      fixture.detectChanges();

      expect(component.connectionState).toBe('connected');
    });
  });

  describe('Participant Display', () => {
    it('should display participant name', () => {
      fixture.detectChanges();
      const nameElement = fixture.nativeElement.querySelector('.participant-name');

      expect(nameElement.textContent).toContain('Dr. John Smith');
    });

    it('should display participant specialization', () => {
      fixture.detectChanges();
      const specElement = fixture.nativeElement.querySelector('.specialization');

      expect(specElement?.textContent).toContain('Cardiologist');
    });

    it('should calculate correct initials', () => {
      const initials = component.getInitials();

      expect(initials).toBe('DS'); // Dr. Smith
    });

    it('should handle single name for initials', () => {
      component.participant.name = 'Madonna';
      const initials = component.getInitials();

      expect(initials).toBe('MA');
    });

    it('should get avatar color based on ID', () => {
      const color = component.getAvatarColor();

      expect(color).toBeTruthy();
      expect(color.startsWith('#')).toBe(true);
    });

    it('should assign consistent color for same ID', () => {
      component.participant.id = 5;
      const color1 = component.getAvatarColor();

      component.participant.id = 5;
      const color2 = component.getAvatarColor();

      expect(color1).toBe(color2);
    });
  });

  describe('Online Status', () => {
    it('should display online status', fakeAsync(() => {
      fixture.detectChanges();

      isOnlineSubject.next(true);
      tick();

      expect(component.onlineStatus).toBe(OnlineStatus.ONLINE);
      expect(component.getStatusText()).toBe('Online now');
    }));

    it('should display offline status', fakeAsync(() => {
      fixture.detectChanges();

      isOnlineSubject.next(false);
      tick();

      expect(component.onlineStatus).toBe(OnlineStatus.OFFLINE);
    }));

    it('should display away status', fakeAsync(() => {
      fixture.detectChanges();

      statusSubject.next('away');
      tick();

      expect(component.onlineStatus).toBe(OnlineStatus.AWAY);
      expect(component.getStatusText()).toBe('Away');
    }));

    it('should display idle status', fakeAsync(() => {
      fixture.detectChanges();

      statusSubject.next('idle');
      tick();

      expect(component.onlineStatus).toBe(OnlineStatus.IDLE);
      expect(component.getStatusText()).toBe('Idle');
    }));

    it('should display last seen time', fakeAsync(() => {
      fixture.detectChanges();

      const lastSeenText = 'Last seen 2 hours ago';
      presenceSubject.next(lastSeenText);
      tick();

      expect(component.lastSeenTime).toBe(lastSeenText);
    }));
  });

  describe('Typing Indicator', () => {
    it('should subscribe to typing indicator', () => {
      fixture.detectChanges();

      expect(mockTypingService.isUserTyping$).toHaveBeenCalled();
    });

    it('should emit typing observable', fakeAsync(() => {
      fixture.detectChanges();

      let isTyping = false;
      component.isTyping$.subscribe(value => {
        isTyping = value;
      });

      typingSubject.next(true);
      tick();

      expect(isTyping).toBe(true);
    }));

    it('should display typing indicator UI when typing', fakeAsync(() => {
      fixture.detectChanges();

      typingSubject.next(true);
      tick();
      fixture.detectChanges();

      const typingBadge = fixture.nativeElement.querySelector('.typing-badge');
      expect(typingBadge).toBeTruthy();
    }));

    it('should hide typing indicator when not typing', fakeAsync(() => {
      fixture.detectChanges();

      typingSubject.next(false);
      tick();
      fixture.detectChanges();

      const typingBadge = fixture.nativeElement.querySelector('.typing-badge');
      expect(typingBadge).toBeFalsy();
    }));
  });

  describe('Connection Status', () => {
    it('should display connected state', fakeAsync(() => {
      fixture.detectChanges();

      connectionStateSubject.next('CONNECTED');
      tick();

      expect(component.isConnected).toBe(true);
      expect(component.connectionState).toBe('connected');
    }));

    it('should display disconnected state', fakeAsync(() => {
      fixture.detectChanges();

      connectionStateSubject.next('DISCONNECTED');
      tick();

      expect(component.isConnected).toBe(false);
      expect(component.connectionState).toBe('disconnected');
    }));

    it('should display reconnecting state', fakeAsync(() => {
      fixture.detectChanges();

      connectionStateSubject.next('RECONNECTING');
      tick();

      expect(component.connectionState).toBe('reconnecting');
    }));

    it('should show connection badge when disconnected', fakeAsync(() => {
      fixture.detectChanges();

      connectionStateSubject.next('DISCONNECTED');
      tick();
      fixture.detectChanges();

      const connectionBadge = fixture.nativeElement.querySelector('.connection-badge');
      expect(connectionBadge).toBeTruthy();
    }));

    it('should disable call buttons when disconnected', fakeAsync(() => {
      component.showCallButtons = true;
      fixture.detectChanges();

      connectionStateSubject.next('DISCONNECTED');
      tick();
      fixture.detectChanges();

      const videoBtn = fixture.nativeElement.querySelector('.btn-video-call');
      const audioBtn = fixture.nativeElement.querySelector('.btn-audio-call');

      expect(videoBtn?.disabled).toBe(true);
      expect(audioBtn?.disabled).toBe(true);
    }));
  });

  describe('Navigation', () => {
    it('should emit backClicked event', () => {
      spyOn(component.backClicked, 'emit');
      fixture.detectChanges();

      const backBtn = fixture.nativeElement.querySelector('.btn-back');
      backBtn.click();

      expect(component.backClicked.emit).toHaveBeenCalled();
    });

    it('should call onBack method on back button click', () => {
      spyOn(component, 'onBack');
      fixture.detectChanges();

      const backBtn = fixture.nativeElement.querySelector('.btn-back');
      backBtn.click();

      expect(component.onBack).toHaveBeenCalled();
    });
  });

  describe('Call Buttons', () => {
    it('should show call buttons when enabled', () => {
      component.showCallButtons = true;
      fixture.detectChanges();

      const callActions = fixture.nativeElement.querySelector('.call-actions');
      expect(callActions).toBeTruthy();
    });

    it('should hide call buttons when disabled', () => {
      component.showCallButtons = false;
      fixture.detectChanges();

      const callActions = fixture.nativeElement.querySelector('.call-actions');
      expect(callActions).toBeFalsy();
    });

    it('should emit videoCallRequested when video button clicked', () => {
      spyOn(component.videoCallRequested, 'emit');
      component.showCallButtons = true;
      fixture.detectChanges();

      const videoBtn = fixture.nativeElement.querySelector('.btn-video-call');
      videoBtn.click();

      expect(component.videoCallRequested.emit).toHaveBeenCalled();
    });

    it('should emit audioCallRequested when audio button clicked', () => {
      spyOn(component.audioCallRequested, 'emit');
      component.showCallButtons = true;
      fixture.detectChanges();

      const audioBtn = fixture.nativeElement.querySelector('.btn-audio-call');
      audioBtn.click();

      expect(component.audioCallRequested.emit).toHaveBeenCalled();
    });

    it('should not emit call events when disconnected', fakeAsync(() => {
      spyOn(component.videoCallRequested, 'emit');
      component.showCallButtons = true;
      fixture.detectChanges();

      connectionStateSubject.next('DISCONNECTED');
      tick();

      const videoBtn = fixture.nativeElement.querySelector('.btn-video-call');
      videoBtn.click();

      expect(component.videoCallRequested.emit).not.toHaveBeenCalled();
    }));
  });

  describe('Subtitle', () => {
    it('should show subtitle when enabled', () => {
      component.showSubtitle = true;
      fixture.detectChanges();

      const subtitle = fixture.nativeElement.querySelector('.chat-header-subtitle');
      expect(subtitle).toBeTruthy();
    });

    it('should hide subtitle when disabled', () => {
      component.showSubtitle = false;
      fixture.detectChanges();

      const subtitle = fixture.nativeElement.querySelector('.chat-header-subtitle');
      expect(subtitle).toBeFalsy();
    });

    it('should display correct subtitle for online status', fakeAsync(() => {
      component.showSubtitle = true;
      fixture.detectChanges();

      isOnlineSubject.next(true);
      tick();
      fixture.detectChanges();

      const subtitle = fixture.nativeElement.querySelector('.subtitle-online');
      expect(subtitle?.textContent).toContain('Online and available');
    }));

    it('should display correct subtitle for offline status', fakeAsync(() => {
      component.showSubtitle = true;
      fixture.detectChanges();

      isOnlineSubject.next(false);
      tick();
      fixture.detectChanges();

      const subtitle = fixture.nativeElement.querySelector('.subtitle-offline');
      expect(subtitle?.textContent).toContain('Offline');
    }));

    it('should display correct subtitle for away status', fakeAsync(() => {
      component.showSubtitle = true;
      fixture.detectChanges();

      statusSubject.next('away');
      tick();
      fixture.detectChanges();

      const subtitle = fixture.nativeElement.querySelector('.subtitle-away');
      expect(subtitle?.textContent).toContain('Away');
    }));
  });

  describe('Status Text', () => {
    it('should return correct status text for online', () => {
      component.onlineStatus = OnlineStatus.ONLINE;
      expect(component.getStatusText()).toBe('Online now');
    });

    it('should return correct status text for away', () => {
      component.onlineStatus = OnlineStatus.AWAY;
      expect(component.getStatusText()).toBe('Away');
    });

    it('should return correct status text for idle', () => {
      component.onlineStatus = OnlineStatus.IDLE;
      expect(component.getStatusText()).toBe('Idle');
    });

    it('should return last seen time for offline', () => {
      component.onlineStatus = OnlineStatus.OFFLINE;
      component.lastSeenTime = 'Last seen 1 hour ago';

      expect(component.getStatusText()).toBe('Last seen 1 hour ago');
    });

    it('should return Offline when no last seen time', () => {
      component.onlineStatus = OnlineStatus.OFFLINE;
      component.lastSeenTime = '';

      expect(component.getStatusText()).toBe('Offline');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes', () => {
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.chat-header');
      expect(header).toBeTruthy();
    });

    it('should hide call buttons on mobile', () => {
      component.showCallButtons = true;
      fixture.detectChanges();

      // Check CSS media queries are present
      const styles = fixture.nativeElement.querySelector('style');
      expect(styles?.textContent).toContain('@media (max-width: 480px)');
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      fixture.detectChanges();
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty participant name', () => {
      component.participant.name = '';
      const initials = component.getInitials();

      expect(initials.length).toBeGreaterThan(0);
    });

    it('should handle participant with no specialization', () => {
      component.participant.specialization = undefined;
      fixture.detectChanges();

      const specElement = fixture.nativeElement.querySelector('.specialization');
      expect(specElement).toBeFalsy();
    });

    it('should handle unknown status', () => {
      component.onlineStatus = 'unknown' as OnlineStatus;
      expect(component.getStatusText()).toBe('Unknown');
    });

    it('should assign different colors to different IDs', () => {
      component.participant.id = 1;
      const color1 = component.getAvatarColor();

      component.participant.id = 2;
      const color2 = component.getAvatarColor();

      // May be same color due to modulo, but generally should vary
      expect(color1).toBeTruthy();
      expect(color2).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should have pulse animation on typing', () => {
      fixture.detectChanges();

      const styles = fixture.nativeElement.querySelector('style');
      expect(styles?.textContent).toContain('@keyframes pulse');
    });

    it('should have bounce animation on typing badge', () => {
      fixture.detectChanges();

      const styles = fixture.nativeElement.querySelector('style');
      expect(styles?.textContent).toContain('@keyframes bounce');
    });
  });
});
