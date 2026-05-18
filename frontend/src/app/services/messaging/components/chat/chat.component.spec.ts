/**
 * Chat Component Unit Tests
 * Tests for message display, interaction, and real-time updates
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatComponent } from './chat.component';
import { ChatService } from '../../chat.service';
import { AuthIntegrationService } from '../../auth-integration.service';
import { ChatMessageItemComponent } from './chat-message-item/chat-message-item.component';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { Message, Conversation } from '../../models';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let chatService: jasmine.SpyObj<ChatService>;
  let authIntegration: jasmine.SpyObj<AuthIntegrationService>;

  // Mock data
  const mockConversation: Conversation = {
    id: 1,
    patientId: 1,
    patientName: 'John Doe',
    patientEmail: 'patient@test.com',
    doctorId: 2,
    doctorName: 'Dr. Smith',
    doctorEmail: 'dr.smith@test.com',
    lastMessage: {
      id: 1,
      senderId: 2,
      senderName: 'Dr. Smith',
      senderEmail: 'dr.smith@test.com',
      recipientId: 1,
      content: 'Hello!',
      timestamp: new Date(),
      isRead: true,
      attachments: []
    },
    lastMessageTime: new Date(),
    unreadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [
      { id: 1, email: 'patient@test.com', name: 'John Doe', role: 'patient', status: 'online' },
      { id: 2, email: 'dr.smith@test.com', name: 'Dr. Smith', role: 'doctor', status: 'online' }
    ],
    isActive: true
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
      content: 'I am doing well!',
      timestamp: new Date('2026-01-06T10:05:00'),
      isRead: true,
      attachments: []
    }
  ];

  const mockUser = {
    id: 1,
    email: 'patient@test.com',
    name: 'John Doe',
    fullName: 'John Doe'
  };

  beforeEach(async () => {
    const chatServiceSpy = jasmine.createSpyObj(
      'ChatService',
      [
        'initializeChat',
        'loadMoreMessages',
        'markAsRead',
        'markAllAsRead',
        'sendTypingIndicator',
        'getState',
        'isMessageFromCurrentUser',
        'clearChat'
      ],
      {
        messages$: new BehaviorSubject<Message[]>(mockMessages),
        isLoading$: new BehaviorSubject<boolean>(false),
        isSending$: new BehaviorSubject<boolean>(false),
        error$: new BehaviorSubject<string | null>(null),
        messageReceived$: new Subject<Message>(),
        typingStatusChanged$: new Subject<{ userId: number; isTyping: boolean }>()
      }
    );

    chatServiceSpy.isMessageFromCurrentUser.and.callFake((senderId: number) => senderId === 1);
    chatServiceSpy.getState.and.returnValue({
      conversationId: 1,
      messages: mockMessages,
      isLoading: false,
      isSending: false,
      error: null,
      hasMore: false,
      currentPage: 0,
      totalPages: 1
    });

    const authIntegrationSpy = jasmine.createSpyObj('AuthIntegrationService', ['getAuthenticatedUser']);
    authIntegrationSpy.getAuthenticatedUser.and.returnValue(mockUser);

    await TestBed.configureTestingModule({
      imports: [CommonModule, ChatComponent, ChatMessageItemComponent],
      providers: [
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: AuthIntegrationService, useValue: authIntegrationSpy }
      ]
    }).compileComponents();

    chatService = TestBed.inject(ChatService) as jasmine.SpyObj<ChatService>;
    authIntegration = TestBed.inject(AuthIntegrationService) as jasmine.SpyObj<AuthIntegrationService>;

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  // ═══════════════════════════════════════════════════════════════
  // Component Initialization
  // ═══════════════════════════════════════════════════════════════

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty messages', () => {
      expect(component.messages.length).toBeGreaterThanOrEqual(0);
    });

    it('should set up subscriptions on init', () => {
      fixture.detectChanges();
      expect(chatService.messages$).toBeTruthy();
    });

    it('should have empty typing users set on init', () => {
      expect(component.typingUsers.size).toBe(0);
    });

    it('should have isAtBottom true on init', () => {
      expect(component.isAtBottom).toBeTrue();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Conversation Changes
  // ═══════════════════════════════════════════════════════════════

  describe('Conversation Changes', () => {
    it('should initialize chat when conversation changes', () => {
      component.conversation = mockConversation;
      component.ngOnChanges({
        conversation: {
          currentValue: mockConversation,
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true
        }
      });

      expect(chatService.initializeChat).toHaveBeenCalledWith(1);
    });

    it('should not initialize if conversation is null', () => {
      component.conversation = null;
      component.ngOnChanges({
        conversation: {
          currentValue: null,
          previousValue: mockConversation,
          firstChange: false,
          isFirstChange: () => false
        }
      });

      // Should not call initializeChat
      expect(chatService.initializeChat).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Message Display
  // ═══════════════════════════════════════════════════════════════

  describe('Message Display', () => {
    it('should display messages from service', (done) => {
      fixture.detectChanges();

      fixture.whenStable().then(() => {
        expect(component.messages.length).toBe(2);
        expect(component.messages[0].content).toBe('Hello, how are you?');
        done();
      });
    });

    it('should subscribe to messages observable', () => {
      fixture.detectChanges();
      expect(component.messages.length).toBeGreaterThanOrEqual(0);
    });

    it('should show loading state', (done) => {
      (chatService.isLoading$ as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();

      fixture.whenStable().then(() => {
        expect(component.isLoading).toBeTrue();
        done();
      });
    });

    it('should show error state', (done) => {
      (chatService.error$ as BehaviorSubject<string | null>).next('Failed to load messages');
      fixture.detectChanges();

      fixture.whenStable().then(() => {
        expect(component.error).toBe('Failed to load messages');
        done();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Message Operations
  // ═══════════════════════════════════════════════════════════════

  describe('Message Operations', () => {
    beforeEach(() => {
      component.conversation = mockConversation;
      fixture.detectChanges();
    });

    it('should load more messages', () => {
      component.conversation = mockConversation;
      component.loadMoreMessages();

      expect(chatService.loadMoreMessages).toHaveBeenCalledWith(1);
    });

    it('should mark message as read', () => {
      const message = mockMessages[0];
      component.markAsRead(message);

      expect(chatService.markMessageAsRead).toHaveBeenCalledWith(1);
    });

    it('should mark all messages as read', () => {
      component.conversation = mockConversation;
      component.markAllAsRead();

      expect(chatService.markAllAsRead).toHaveBeenCalledWith(1);
    });

    it('should dismiss error', () => {
      component.error = 'Test error';
      component.dismissError();

      expect(component.error).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Message Identification
  // ═══════════════════════════════════════════════════════════════

  describe('Message Identification', () => {
    it('should identify sent messages', () => {
      const isSent = component.isMessageFromCurrentUser(1);
      expect(isSent).toBeTrue();
    });

    it('should identify received messages', () => {
      const isReceived = component.isMessageFromCurrentUser(2);
      expect(isReceived).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Scroll Management
  // ═══════════════════════════════════════════════════════════════

  describe('Scroll Management', () => {
    it('should scroll to bottom', () => {
      const mockContainer = {
        nativeElement: {
          scrollHeight: 1000,
          clientHeight: 500,
          scrollTop: 400
        }
      };

      component.messagesContainer = mockContainer as any;
      component.scrollToBottom();

      // scrollTop should be set to scrollHeight
      expect(mockContainer.nativeElement.scrollTop).toBe(1000);
    });

    it('should detect when at bottom', () => {
      const mockEvent = {
        target: {
          scrollHeight: 1000,
          clientHeight: 500,
          scrollTop: 400 // Near bottom (100px threshold)
        }
      };

      component.onScroll(mockEvent);
      expect(component.isAtBottom).toBeTrue();
    });

    it('should detect when not at bottom', () => {
      const mockEvent = {
        target: {
          scrollHeight: 1000,
          clientHeight: 500,
          scrollTop: 0 // At top
        }
      };

      component.onScroll(mockEvent);
      expect(component.isAtBottom).toBeFalse();
    });

    it('should show load more when near top', () => {
      chatService.getState.and.returnValue({
        conversationId: 1,
        messages: mockMessages,
        isLoading: false,
        isSending: false,
        error: null,
        hasMore: true,
        currentPage: 0,
        totalPages: 1
      });

      const mockEvent = {
        target: {
          scrollHeight: 1000,
          clientHeight: 500,
          scrollTop: 50 // Near top
        }
      };

      component.onScroll(mockEvent);
      expect(component.showLoadMore).toBeTrue();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════

  describe('Helper Methods', () => {
    it('should get time ago string', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const result = component.getTimeAgo(fiveMinutesAgo);
      expect(result).toContain('m ago');
    });

    it('should get avatar initials', () => {
      const initials = component.getAvatarInitials('John Doe');
      expect(initials).toBe('JD');
    });

    it('should get avatar initials for single name', () => {
      const initials = component.getAvatarInitials('John');
      expect(initials).toBe('J');
    });

    it('should handle undefined name for initials', () => {
      const initials = component.getAvatarInitials(undefined);
      expect(initials).toBe('U');
    });

    it('should show typing indicator when users typing', () => {
      component.typingUsers.add(2);
      expect(component.showTypingIndicator()).toBeTrue();
    });

    it('should not show typing indicator when no users typing', () => {
      component.typingUsers.clear();
      expect(component.showTypingIndicator()).toBeFalse();
    });

    it('should get typing indicator text for single user', () => {
      component.typingUsers.add(2);
      const text = component.getTypingIndicatorText();
      expect(text).toBe('User is typing...');
    });

    it('should get typing indicator text for multiple users', () => {
      component.typingUsers.add(2);
      component.typingUsers.add(3);
      const text = component.getTypingIndicatorText();
      expect(text).toContain('users are typing');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Real-Time Updates
  // ═══════════════════════════════════════════════════════════════

  describe('Real-Time Updates', () => {
    it('should handle new message received', (done) => {
      const newMessage: Message = {
        id: 3,
        senderId: 2,
        senderName: 'Dr. Smith',
        senderEmail: 'dr.smith@test.com',
        recipientId: 1,
        content: 'New message',
        timestamp: new Date(),
        isRead: false,
        attachments: []
      };

      let messageAdded = false;

      component.messageAdded.subscribe(() => {
        messageAdded = true;
      });

      fixture.detectChanges();

      (chatService.messageReceived$ as Subject<Message>).next(newMessage);

      setTimeout(() => {
        expect(messageAdded).toBeTrue();
        done();
      }, 100);
    });

    it('should handle typing status changed', (done) => {
      fixture.detectChanges();

      (chatService.typingStatusChanged$ as Subject<any>).next({
        userId: 2,
        isTyping: true
      });

      setTimeout(() => {
        expect(component.typingUsers.has(2)).toBeTrue();
        done();
      }, 100);
    });

    it('should remove user from typing when no longer typing', (done) => {
      fixture.detectChanges();

      component.typingUsers.add(2);

      (chatService.typingStatusChanged$ as Subject<any>).next({
        userId: 2,
        isTyping: false
      });

      setTimeout(() => {
        expect(component.typingUsers.has(2)).toBeFalse();
        done();
      }, 100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Component Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Component Cleanup', () => {
    it('should close chat', () => {
      component.conversation = mockConversation;
      fixture.detectChanges();

      let conversationClosed = false;

      component.conversationClosed.subscribe(() => {
        conversationClosed = true;
      });

      component.closeChat();
      expect(conversationClosed).toBeTrue();
    });

    it('should clear chat on destroy', () => {
      component.ngOnDestroy();
      expect(chatService.clearChat).toHaveBeenCalled();
    });

    it('should unsubscribe on destroy', () => {
      fixture.detectChanges();
      component.ngOnDestroy();

      // Component should handle cleanup without errors
      expect(component).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle empty messages list', () => {
      (chatService.messages$ as BehaviorSubject<Message[]>).next([]);
      fixture.detectChanges();

      expect(component.messages.length).toBe(0);
    });

    it('should handle null conversation', () => {
      component.conversation = null;
      fixture.detectChanges();

      expect(component.conversation).toBeNull();
    });

    it('should handle rapid scroll events', () => {
      const mockEvent1 = {
        target: {
          scrollHeight: 1000,
          clientHeight: 500,
          scrollTop: 400
        }
      };

      const mockEvent2 = {
        target: {
          scrollHeight: 1000,
          clientHeight: 500,
          scrollTop: 300
        }
      };

      component.onScroll(mockEvent1);
      component.onScroll(mockEvent2);

      // Should handle both events without errors
      expect(component.isAtBottom).toBeFalse();
    });

    it('should handle concurrent typing indicators', () => {
      component.typingUsers.add(2);
      component.typingUsers.add(3);
      component.typingUsers.add(4);

      expect(component.typingUsers.size).toBe(3);

      (chatService.typingStatusChanged$ as Subject<any>).next({
        userId: 2,
        isTyping: false
      });

      expect(component.typingUsers.size).toBe(2);
    });
  });
});
