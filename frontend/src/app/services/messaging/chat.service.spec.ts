/**
 * Chat Service Unit Tests
 * Tests for message management, loading, sending, and real-time updates
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatService, ChatState } from './chat.service';
import { MessagingService } from './messaging.service';
import { AuthIntegrationService } from './auth-integration.service';
import { Message } from './models';
import { of, Subject } from 'rxjs';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;
  let messagingService: jasmine.SpyObj<MessagingService>;
  let authIntegration: jasmine.SpyObj<AuthIntegrationService>;

  // Mock data
  const mockUser = {
    id: 1,
    email: 'patient@test.com',
    name: 'John Doe',
    fullName: 'John Doe'
  };

  const mockMessages: Message[] = [
    {
      id: 1,
      senderId: 2,
      senderName: 'Dr. Smith',
      senderEmail: 'dr.smith@test.com',
      recipientId: 1,
      content: 'Hello, how are you?',
      timestamp: new Date('2026-01-06T10:00:00'),
      isRead: true,
      attachments: []
    },
    {
      id: 2,
      senderId: 1,
      senderName: 'John Doe',
      senderEmail: 'patient@test.com',
      recipientId: 2,
      content: 'I am doing well, thanks!',
      timestamp: new Date('2026-01-06T10:05:00'),
      isRead: true,
      attachments: []
    }
  ];

  const mockPaginatedResponse = {
    content: mockMessages,
    totalElements: 2,
    totalPages: 1,
    currentPage: 0,
    pageSize: 50,
    hasNext: false,
    hasPrevious: false
  };

  beforeEach(() => {
    const messagingServiceSpy = jasmine.createSpyObj('MessagingService', ['sendTypingIndicator'], {
      chatMessages$: new Subject(),
      typingIndicators$: new Subject(),
      readReceipts$: new Subject()
    });

    const authIntegrationSpy = jasmine.createSpyObj('AuthIntegrationService', ['getAuthenticatedUser']);
    authIntegrationSpy.getAuthenticatedUser.and.returnValue(mockUser);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChatService,
        { provide: MessagingService, useValue: messagingServiceSpy },
        { provide: AuthIntegrationService, useValue: authIntegrationSpy }
      ]
    });

    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
    messagingService = TestBed.inject(MessagingService) as jasmine.SpyObj<MessagingService>;
    authIntegration = TestBed.inject(AuthIntegrationService) as jasmine.SpyObj<AuthIntegrationService>;
  });

  afterEach(() => {
    httpMock.verify();
    service.destroy();
  });

  // ═══════════════════════════════════════════════════════════════
  // Service Initialization
  // ═══════════════════════════════════════════════════════════════

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default chat state', (done) => {
      service.chatState$.subscribe(state => {
        expect(state.conversationId).toBeNull();
        expect(state.messages).toEqual([]);
        expect(state.isLoading).toBeFalse();
        expect(state.isSending).toBeFalse();
        expect(state.error).toBeNull();
        done();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Initialize Chat
  // ═══════════════════════════════════════════════════════════════

  describe('Initialize Chat', () => {
    it('should initialize chat for conversation', (done) => {
      service.initializeChat(1);

      service.chatState$.subscribe(state => {
        expect(state.conversationId).toBe(1);
        done();
      });

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
    });

    it('should load messages on chat initialization', (done) => {
      service.initializeChat(1);

      service.messages$.subscribe(messages => {
        if (messages.length > 0) {
          expect(messages.length).toBe(2);
          expect(messages[0].content).toBe('Hello, how are you?');
          done();
        }
      });

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      req.flush(mockPaginatedResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Load Messages
  // ═══════════════════════════════════════════════════════════════

  describe('Load Messages', () => {
    it('should load messages for conversation', (done) => {
      service.loadMessages(1, 0).subscribe(() => {
        service.messages$.subscribe(messages => {
          expect(messages.length).toBe(2);
          done();
        });
      });

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
    });

    it('should sort messages chronologically', (done) => {
      const unsortedMessages = [
        { ...mockMessages[1] },
        { ...mockMessages[0] }
      ];

      service.loadMessages(1, 0).subscribe(() => {
        service.messages$.subscribe(messages => {
          expect(messages[0].timestamp).toEqual(mockMessages[0].timestamp);
          expect(messages[1].timestamp).toEqual(mockMessages[1].timestamp);
          done();
        });
      });

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      req.flush({ ...mockPaginatedResponse, content: unsortedMessages });
    });

    it('should set loading state', (done) => {
      let loadingStates: boolean[] = [];

      service.isLoading$.subscribe(isLoading => {
        loadingStates.push(isLoading);
      });

      service.loadMessages(1, 0).subscribe(() => {
        expect(loadingStates[0]).toBeTrue();
        expect(loadingStates[loadingStates.length - 1]).toBeFalse();
        done();
      });

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      req.flush(mockPaginatedResponse);
    });

    it('should handle load error', (done) => {
      service.loadMessages(1, 0).subscribe(() => {
        service.error$.subscribe(error => {
          if (error) {
            expect(error).toBe('Failed to load messages');
            done();
          }
        });
      });

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      req.flush({ message: 'Failed to load messages' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should append messages for pagination', (done) => {
      service.initializeChat(1);

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      req.flush(mockPaginatedResponse);

      const newMessages = [
        {
          id: 3,
          senderId: 2,
          senderName: 'Dr. Smith',
          senderEmail: 'dr.smith@test.com',
          recipientId: 1,
          content: 'How is your condition?',
          timestamp: new Date('2026-01-06T10:10:00'),
          isRead: false,
          attachments: []
        }
      ];

      service.loadMoreMessages(1).subscribe(() => {
        service.messages$.subscribe(messages => {
          expect(messages.length).toBe(3);
          expect(messages[2].content).toBe('How is your condition?');
          done();
        });
      });

      const nextReq = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=1&size=50&sort=timestamp%2Casc`);
      nextReq.flush({ ...mockPaginatedResponse, content: newMessages });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Send Message
  // ═══════════════════════════════════════════════════════════════

  describe('Send Message', () => {
    it('should send message', (done) => {
      const messageInput = {
        conversationId: 1,
        recipientId: 2,
        recipientEmail: 'dr.smith@test.com',
        recipientName: 'Dr. Smith',
        content: 'Hello doctor!'
      };

      service.sendMessage(messageInput).subscribe(message => {
        expect(message.content).toBe('Hello doctor!');
        done();
      });

      const req = httpMock.expectOne('/api/messages');
      expect(req.request.method).toBe('POST');
      req.flush({
        id: 3,
        senderId: 1,
        senderName: 'John Doe',
        senderEmail: 'patient@test.com',
        recipientId: 2,
        content: 'Hello doctor!',
        timestamp: new Date(),
        isRead: false
      });
    });

    it('should set sending state', (done) => {
      let sendingStates: boolean[] = [];

      service.isSending$.subscribe(isSending => {
        sendingStates.push(isSending);
      });

      const messageInput = {
        conversationId: 1,
        recipientId: 2,
        recipientEmail: 'dr.smith@test.com',
        recipientName: 'Dr. Smith',
        content: 'Hello doctor!'
      };

      service.sendMessage(messageInput).subscribe(() => {
        expect(sendingStates[0]).toBeTrue();
        expect(sendingStates[sendingStates.length - 1]).toBeFalse();
        done();
      });

      const req = httpMock.expectOne('/api/messages');
      req.flush({ id: 3, content: 'Hello doctor!' });
    });

    it('should add sent message to messages array', (done) => {
      service.initializeChat(1);

      const initReq = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      initReq.flush(mockPaginatedResponse);

      const messageInput = {
        conversationId: 1,
        recipientId: 2,
        recipientEmail: 'dr.smith@test.com',
        recipientName: 'Dr. Smith',
        content: 'Hello doctor!'
      };

      service.sendMessage(messageInput).subscribe(() => {
        service.messages$.subscribe(messages => {
          expect(messages.length).toBe(3);
          expect(messages[2].content).toBe('Hello doctor!');
          done();
        });
      });

      const req = httpMock.expectOne('/api/messages');
      req.flush({
        id: 3,
        senderId: 1,
        senderName: 'John Doe',
        senderEmail: 'patient@test.com',
        recipientId: 2,
        content: 'Hello doctor!',
        timestamp: new Date(),
        isRead: false
      });
    });

    it('should handle send error', (done) => {
      const messageInput = {
        conversationId: 1,
        recipientId: 2,
        recipientEmail: 'dr.smith@test.com',
        recipientName: 'Dr. Smith',
        content: 'Hello doctor!'
      };

      service.sendMessage(messageInput).subscribe(() => {
        service.error$.subscribe(error => {
          if (error) {
            expect(error).toBe('Failed to send message');
            done();
          }
        });
      });

      const req = httpMock.expectOne('/api/messages');
      req.flush({ message: 'Failed to send message' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should not send if user not authenticated', (done) => {
      authIntegration.getAuthenticatedUser.and.returnValue(null);

      const messageInput = {
        conversationId: 1,
        recipientId: 2,
        recipientEmail: 'dr.smith@test.com',
        recipientName: 'Dr. Smith',
        content: 'Hello doctor!'
      };

      service.sendMessage(messageInput).subscribe(() => {
        service.error$.subscribe(error => {
          expect(error).toBe('User not authenticated');
          done();
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Mark as Read
  // ═══════════════════════════════════════════════════════════════

  describe('Mark as Read', () => {
    it('should mark single message as read', (done) => {
      service.initializeChat(1);

      const initReq = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      initReq.flush(mockPaginatedResponse);

      service.markMessageAsRead(1).subscribe(() => {
        service.messages$.subscribe(messages => {
          expect(messages[0].isRead).toBeTrue();
          done();
        });
      });

      const req = httpMock.expectOne('/api/messages/1/status');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    it('should mark all messages as read', (done) => {
      service.initializeChat(1);

      const initReq = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      initReq.flush(mockPaginatedResponse);

      service.markAllAsRead(1).subscribe(() => {
        service.messages$.subscribe(messages => {
          expect(messages.every(m => m.isRead)).toBeTrue();
          done();
        });
      });

      const req = httpMock.expectOne('/api/conversations/1/mark-read');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    it('should handle mark as read error', (done) => {
      service.markMessageAsRead(1).subscribe(() => {
        service.error$.subscribe(error => {
          // Error should be caught, no error emitted
          expect(service.getError()).toBeNull();
          done();
        });
      });

      const req = httpMock.expectOne('/api/messages/1/status');
      req.flush({ message: 'Error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Real-Time Updates
  // ═══════════════════════════════════════════════════════════════

  describe('Real-Time Updates', () => {
    it('should handle new message from websocket', (done) => {
      service.initializeChat(1);

      const initReq = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      initReq.flush(mockPaginatedResponse);

      const newMessage = {
        messageId: 3,
        conversationId: 1,
        senderId: 2,
        senderName: 'Dr. Smith',
        senderEmail: 'dr.smith@test.com',
        content: 'How are you?',
        timestamp: new Date(),
        attachments: []
      };

      service.messageReceived$.subscribe(message => {
        expect(message.content).toBe('How are you?');
        done();
      });

      // Simulate new message event
      (messagingService.chatMessages$ as Subject<any>).next(newMessage);
    });

    it('should update local state on new message', (done) => {
      service.initializeChat(1);

      const initReq = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      initReq.flush(mockPaginatedResponse);

      const newMessage = {
        messageId: 3,
        conversationId: 1,
        senderId: 2,
        senderName: 'Dr. Smith',
        senderEmail: 'dr.smith@test.com',
        content: 'How are you?',
        timestamp: new Date(),
        attachments: []
      };

      // Simulate new message event
      (messagingService.chatMessages$ as Subject<any>).next(newMessage);

      setTimeout(() => {
        service.messages$.subscribe(messages => {
          expect(messages.length).toBe(3);
          done();
        });
      }, 100);
    });

    it('should handle typing indicator', (done) => {
      const typingEvent = {
        userId: 2,
        isTyping: true
      };

      service.typingStatusChanged$.subscribe(event => {
        expect(event.userId).toBe(2);
        expect(event.isTyping).toBeTrue();
        done();
      });

      // Simulate typing event
      (messagingService.typingIndicators$ as Subject<any>).next({ senderId: 2, isTyping: true });
    });

    it('should ignore messages from different conversation', (done) => {
      service.initializeChat(1);

      const initReq = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      initReq.flush(mockPaginatedResponse);

      const newMessage = {
        messageId: 3,
        conversationId: 2, // Different conversation
        senderId: 2,
        senderName: 'Dr. Smith',
        senderEmail: 'dr.smith@test.com',
        content: 'How are you?',
        timestamp: new Date(),
        attachments: []
      };

      let messageReceived = false;

      service.messageReceived$.subscribe(() => {
        messageReceived = true;
      });

      // Simulate new message event
      (messagingService.chatMessages$ as Subject<any>).next(newMessage);

      setTimeout(() => {
        expect(messageReceived).toBeFalse();
        done();
      }, 100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // State Management
  // ═══════════════════════════════════════════════════════════════

  describe('State Management', () => {
    it('should get current state', (done) => {
      service.initializeChat(1);

      const state = service.getState();
      expect(state.conversationId).toBe(1);

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      req.flush(mockPaginatedResponse);

      done();
    });

    it('should get messages', (done) => {
      service.initializeChat(1);

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      req.flush(mockPaginatedResponse);

      setTimeout(() => {
        const messages = service.getMessages();
        expect(messages.length).toBe(2);
        done();
      }, 100);
    });

    it('should check if message is from current user', () => {
      expect(service.isMessageFromCurrentUser(1)).toBeTrue();
      expect(service.isMessageFromCurrentUser(2)).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should clear chat state', (done) => {
      service.initializeChat(1);

      const req = httpMock.expectOne(`/api/conversations/1/messages/paginated?page=0&size=50&sort=timestamp%2Casc`);
      req.flush(mockPaginatedResponse);

      service.clearChat();

      service.chatState$.subscribe(state => {
        expect(state.conversationId).toBeNull();
        expect(state.messages).toEqual([]);
        done();
      });
    });

    it('should destroy service properly', () => {
      service.destroy();
      // Service should handle destruction without errors
      expect(service).toBeTruthy();
    });
  });
});
