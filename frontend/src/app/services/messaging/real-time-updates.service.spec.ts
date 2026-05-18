import { TestBed } from '@angular/core/testing';
import { RealTimeUpdatesService } from './real-time-updates.service';
import { ConversationService } from './conversation.service';
import { MessagingService } from './messaging.service';
import { AuthIntegrationService } from './auth-integration.service';
import { Subject } from 'rxjs';
import { Conversation, ChatMessageEvent, Message } from './models';

describe('RealTimeUpdatesService', () => {
  let service: RealTimeUpdatesService;
  let mockConversationService: any;
  let mockMessagingService: any;
  let mockAuthIntegrationService: any;

  // Mock data
  const mockConversation: Conversation = {
    id: 1,
    patientId: 1,
    patientName: 'John Doe',
    patientEmail: 'john@example.com',
    doctorId: 2,
    doctorName: 'Dr. Smith',
    doctorEmail: 'smith@example.com',
    lastMessage: {
      id: 100,
      senderId: 2,
      senderName: 'Dr. Smith',
      content: 'Previous message',
      timestamp: new Date('2026-01-06T10:00:00'),
      isRead: false,
      recipientId: 1,
      recipientName: 'John Doe',
      recipientEmail: 'john@example.com'
    },
    lastMessageTime: new Date('2026-01-06T10:00:00'),
    unreadCount: 1,
    unreadCountForCurrentUser: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [],
    isActive: true
  };

  const mockChatMessageEvent: ChatMessageEvent = {
    eventType: 'message',
    conversationId: 1,
    messageId: 101,
    senderId: 2,
    senderName: 'Dr. Smith',
    recipientId: 1,
    content: 'New message',
    timestamp: new Date('2026-01-06T11:00:00')
  };

  const mockCurrentUser = {
    id: 1,
    email: 'john@example.com',
    fullName: 'John Doe',
    role: 'patient'
  };

  beforeEach(() => {
    // Mock services
    mockMessagingService = {
      chatMessages$: new Subject(),
      typingIndicators$: new Subject(),
      presenceUpdates$: new Subject()
    };

    mockConversationService = {
      getConversationById: jasmine.createSpy('getConversationById')
        .and.returnValue(mockConversation),
      getConversations: jasmine.createSpy('getConversations')
        .and.returnValue([mockConversation]),
      handleNewMessage: jasmine.createSpy('handleNewMessage'),
      updateConversationLocally: jasmine.createSpy('updateConversationLocally'),
      handleConversationDeleted: jasmine.createSpy('handleConversationDeleted')
    };

    mockAuthIntegrationService = {
      getAuthenticatedUser: jasmine.createSpy('getAuthenticatedUser')
        .and.returnValue(mockCurrentUser)
    };

    TestBed.configureTestingModule({
      providers: [
        RealTimeUpdatesService,
        { provide: ConversationService, useValue: mockConversationService },
        { provide: MessagingService, useValue: mockMessagingService },
        { provide: AuthIntegrationService, useValue: mockAuthIntegrationService }
      ]
    });

    service = TestBed.inject(RealTimeUpdatesService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with correct current user ID', () => {
      expect(service['currentUserId']).toBe(1);
    });

    it('should not be listening initially', () => {
      expect(service.isCurrentlyListening()).toBe(false);
    });
  });

  describe('Listening Control', () => {
    it('should start listening', () => {
      service.startListening();
      expect(service.isCurrentlyListening()).toBe(true);
    });

    it('should not start listening twice', () => {
      service.startListening();
      service.startListening();
      expect(service.isCurrentlyListening()).toBe(true);
    });

    it('should stop listening', () => {
      service.startListening();
      service.stopListening();
      expect(service.isCurrentlyListening()).toBe(false);
    });

    it('should handle stop when not listening', () => {
      service.stopListening();
      expect(service.isCurrentlyListening()).toBe(false);
    });
  });

  describe('Chat Message Handling', () => {
    beforeEach(() => {
      service.startListening();
    });

    it('should handle incoming chat message', (done) => {
      let updateResult: any = null;

      service.updateResult$.subscribe(result => {
        updateResult = result;
      });

      mockMessagingService.chatMessages$.next(mockChatMessageEvent);

      setTimeout(() => {
        expect(updateResult).toBeTruthy();
        expect(updateResult.success).toBe(true);
        expect(mockConversationService.handleNewMessage).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should update last message', (done) => {
      service.updateResult$.subscribe(result => {
        if (result.success) {
          expect(result.conversation?.lastMessage?.content).toBe('New message');
          done();
        }
      });

      mockMessagingService.chatMessages$.next(mockChatMessageEvent);
    });

    it('should update timestamp to new message time', (done) => {
      service.updateResult$.subscribe(result => {
        if (result.success) {
          const newTime = new Date(result.conversation!.lastMessageTime);
          expect(newTime.getTime()).toBe(new Date('2026-01-06T11:00:00').getTime());
          done();
        }
      });

      mockMessagingService.chatMessages$.next(mockChatMessageEvent);
    });

    it('should increase unread count', (done) => {
      service.updateResult$.subscribe(result => {
        if (result.success) {
          expect(result.conversation?.unreadCountForCurrentUser).toBe(2);
          done();
        }
      });

      mockMessagingService.chatMessages$.next(mockChatMessageEvent);
    });

    it('should move conversation to top', (done) => {
      // Setup multiple conversations
      const conversation2: Conversation = {
        ...mockConversation,
        id: 2,
        lastMessageTime: new Date('2026-01-06T10:30:00')
      };

      mockConversationService.getConversations.and.returnValue([
        conversation2,
        mockConversation
      ]);

      service.updateResult$.subscribe(result => {
        if (result.success && result.changes.movedToTop) {
          expect(result.previousPosition).toBeGreaterThan(0);
          done();
        }
      });

      mockMessagingService.chatMessages$.next(mockChatMessageEvent);
    });

    it('should skip message from current user', (done) => {
      const currentUserMessage = {
        ...mockChatMessageEvent,
        senderId: 1 // Current user
      };

      let handleNewMessageCalled = false;

      mockConversationService.handleNewMessage.and.callFake(() => {
        handleNewMessageCalled = true;
      });

      mockMessagingService.chatMessages$.next(currentUserMessage);

      setTimeout(() => {
        expect(handleNewMessageCalled).toBe(false);
        done();
      }, 100);
    });

    it('should emit conversationMovedToTop event', (done) => {
      service.conversationMovedToTop$.subscribe(conversation => {
        expect(conversation.id).toBe(1);
        done();
      });

      mockMessagingService.chatMessages$.next(mockChatMessageEvent);
    });

    it('should emit conversationMessageUpdated event', (done) => {
      service.conversationMessageUpdated$.subscribe(conversation => {
        expect(conversation.lastMessage?.content).toBe('New message');
        done();
      });

      mockMessagingService.chatMessages$.next(mockChatMessageEvent);
    });

    it('should emit conversationUnreadCountUpdated event', (done) => {
      service.conversationUnreadCountUpdated$.subscribe(update => {
        expect(update.conversation.id).toBe(1);
        expect(update.previousCount).toBe(1);
        done();
      });

      mockMessagingService.chatMessages$.next(mockChatMessageEvent);
    });

    it('should emit realtimeUpdateOccurred event', (done) => {
      service.realtimeUpdateOccurred$.subscribe(event => {
        expect(event.type).toBe('message');
        expect(event.conversationId).toBe(1);
        done();
      });

      mockMessagingService.chatMessages$.next(mockChatMessageEvent);
    });
  });

  describe('Typing Indicator Handling', () => {
    beforeEach(() => {
      service.startListening();
    });

    it('should handle typing indicator', (done) => {
      const typingEvent = {
        conversationId: 1,
        senderId: 2,
        senderName: 'Dr. Smith',
        isTyping: true
      };

      service.realtimeUpdateOccurred$.subscribe(event => {
        if (event.type === 'typing') {
          expect(event.conversationId).toBe(1);
          done();
        }
      });

      mockMessagingService.typingIndicators$.next(typingEvent);
    });
  });

  describe('Presence Update Handling', () => {
    beforeEach(() => {
      service.startListening();
    });

    it('should handle presence update', (done) => {
      const presenceEvent = {
        conversationId: 1,
        userId: 2,
        status: 'online'
      };

      service.realtimeUpdateOccurred$.subscribe(event => {
        if (event.type === 'presence') {
          expect(event.conversationId).toBe(1);
          done();
        }
      });

      mockMessagingService.presenceUpdates$.next(presenceEvent);
    });
  });

  describe('Manual Update Methods', () => {
    it('should manually update conversation', () => {
      const newMessage: Message = {
        id: 102,
        senderId: 2,
        senderName: 'Dr. Smith',
        content: 'Manual message',
        timestamp: new Date('2026-01-06T12:00:00'),
        isRead: false,
        recipientId: 1,
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com'
      };

      const result = service.manuallyUpdateConversation(
        1,
        newMessage,
        new Date('2026-01-06T12:00:00')
      );

      expect(result.success).toBe(true);
      expect(result.conversation?.lastMessage?.content).toBe('Manual message');
      expect(mockConversationService.handleNewMessage).toHaveBeenCalled();
    });

    it('should return false for non-existent conversation', () => {
      mockConversationService.getConversationById.and.returnValue(null);

      const result = service.manuallyUpdateConversation(
        999,
        {} as Message,
        new Date()
      );

      expect(result.success).toBe(false);
    });

    it('should mark conversation as read', () => {
      service.markConversationAsRead(1);

      expect(mockConversationService.updateConversationLocally).toHaveBeenCalled();
    });

    it('should handle conversation deleted', () => {
      service.handleConversationDeleted(1);

      expect(mockConversationService.handleConversationDeleted).toHaveBeenCalledWith(1);
    });

    it('should emit deleted event', (done) => {
      service.realtimeUpdateOccurred$.subscribe(event => {
        if (event.type === 'deleted') {
          expect(event.conversationId).toBe(1);
          done();
        }
      });

      service.handleConversationDeleted(1);
    });
  });

  describe('Utility Methods', () => {
    it('should format relative time for just now', () => {
      const now = new Date();
      const time = service.getRelativeTime(now);
      expect(time).toBe('just now');
    });

    it('should format relative time for minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const time = service.getRelativeTime(fiveMinutesAgo);
      expect(time).toContain('m ago');
    });

    it('should format relative time for hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const time = service.getRelativeTime(twoHoursAgo);
      expect(time).toContain('h ago');
    });

    it('should format relative time for days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const time = service.getRelativeTime(threeDaysAgo);
      expect(time).toContain('d ago');
    });

    it('should get sorted conversations', () => {
      const conv1 = { ...mockConversation, id: 1, lastMessageTime: new Date('2026-01-06T10:00:00') };
      const conv2 = { ...mockConversation, id: 2, lastMessageTime: new Date('2026-01-06T11:00:00') };

      mockConversationService.getConversations.and.returnValue([conv1, conv2]);

      const sorted = service.getSortedConversations();

      expect(sorted[0].id).toBe(2); // More recent first
      expect(sorted[1].id).toBe(1);
    });
  });

  describe('Service Cleanup', () => {
    it('should destroy service', () => {
      service.startListening();
      service.destroy();

      expect(service.isCurrentlyListening()).toBe(false);
    });
  });
});
