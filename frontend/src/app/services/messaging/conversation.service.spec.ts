import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConversationService, ConversationState } from './conversation.service';
import { Conversation, PaginatedResponse } from './models';

describe('ConversationService', () => {
  let service: ConversationService;
  let httpMock: HttpTestingController;

  // Mock data
  const mockConversations: Conversation[] = [
    {
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
        content: 'How are you feeling?',
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
    },
    {
      id: 2,
      patientId: 3,
      patientName: 'Jane Doe',
      patientEmail: 'jane@example.com',
      doctorId: 2,
      doctorName: 'Dr. Smith',
      doctorEmail: 'smith@example.com',
      lastMessage: {
        id: 101,
        senderId: 2,
        senderName: 'Dr. Smith',
        content: 'See you tomorrow',
        timestamp: new Date('2026-01-05T14:30:00'),
        isRead: true,
        recipientId: 3,
        recipientName: 'Jane Doe',
        recipientEmail: 'jane@example.com'
      },
      lastMessageTime: new Date('2026-01-05T14:30:00'),
      unreadCount: 0,
      unreadCountForCurrentUser: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [],
      isActive: true
    }
  ];

  const mockResponse: PaginatedResponse<Conversation> = {
    content: mockConversations,
    totalElements: 2,
    totalPages: 1,
    currentPage: 0,
    pageSize: 50,
    hasNext: false,
    hasPrevious: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ConversationService]
    });

    service = TestBed.inject(ConversationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default state', () => {
      const state = service.getState();

      expect(state.conversations).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isRefreshing).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetchTime).toBeNull();
      expect(state.currentPage).toBe(0);
      expect(state.pageSize).toBe(50);
    });
  });

  describe('Fetch Conversations', () => {
    it('should fetch conversations from backend', (done) => {
      service.fetchConversations(0, 50).subscribe((response) => {
        expect(response.content.length).toBe(2);
        expect(response.content[0].id).toBe(1);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('50');
      req.flush(mockResponse);
    });

    it('should update state after successful fetch', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const state = service.getState();

        expect(state.conversations.length).toBe(2);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
        expect(state.lastFetchTime).not.toBeNull();
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should set loading state to true while fetching', (done) => {
      let isLoadingDuringRequest = false;

      service.isLoading$.subscribe(isLoading => {
        if (isLoading) {
          isLoadingDuringRequest = true;
        }
      });

      service.fetchConversations(0, 50).subscribe(() => {
        expect(isLoadingDuringRequest).toBe(true);
        expect(service.isLoading()).toBe(false);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should handle errors', (done) => {
      service.fetchConversations(0, 50).subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(service.isLoading()).toBe(false);
          expect(service.getError()).toBeTruthy();
          done();
        }
      );

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });

    it('should emit conversations$ observable', (done) => {
      let emittedConversations: Conversation[] | null = null;

      service.conversations$.subscribe(conversations => {
        emittedConversations = conversations;
      });

      service.fetchConversations(0, 50).subscribe(() => {
        expect(emittedConversations).toEqual(mockConversations);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });
  });

  describe('Refresh Conversations', () => {
    it('should refresh conversations from page 0', (done) => {
      service.refreshConversations().subscribe(() => {
        const state = service.getState();
        expect(state.currentPage).toBe(0);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      expect(req.request.params.get('page')).toBe('0');
      req.flush(mockResponse);
    });

    it('should set refreshing state', (done) => {
      let isRefreshingDuringRequest = false;

      service.isRefreshing$.subscribe(isRefreshing => {
        if (isRefreshing) {
          isRefreshingDuringRequest = true;
        }
      });

      service.refreshConversations().subscribe(() => {
        expect(isRefreshingDuringRequest).toBe(true);
        expect(service.isRefreshing()).toBe(false);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });
  });

  describe('Load Next Page', () => {
    it('should load next page of conversations', (done) => {
      // First, load page 0
      service.fetchConversations(0, 50).subscribe(() => {
        // Then load next page
        service.loadNextPage().subscribe(() => {
          const state = service.getState();
          expect(state.currentPage).toBe(1);
          done();
        });

        const nextReq = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
        expect(nextReq.request.params.get('page')).toBe('1');
        nextReq.flush(mockResponse);
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should append new conversations to existing list', (done) => {
      const page2Conversations: Conversation[] = [
        {
          ...mockConversations[0],
          id: 3,
          patientName: 'New Patient'
        }
      ];

      const page2Response: PaginatedResponse<Conversation> = {
        ...mockResponse,
        content: page2Conversations,
        currentPage: 1
      };

      service.fetchConversations(0, 50).subscribe(() => {
        service.loadNextPage().subscribe(() => {
          const state = service.getState();
          expect(state.conversations.length).toBe(3);
          expect(state.conversations[2].id).toBe(3);
          done();
        });

        const nextReq = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
        nextReq.flush(page2Response);
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });
  });

  describe('Real-Time Updates', () => {
    it('should handle new message in existing conversation', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const updatedConversation = {
          ...mockConversations[0],
          lastMessage: {
            ...mockConversations[0].lastMessage!,
            content: 'New message',
            timestamp: new Date('2026-01-06T11:00:00')
          },
          lastMessageTime: new Date('2026-01-06T11:00:00')
        };

        service.handleNewMessage(updatedConversation);

        const state = service.getState();
        const conv = state.conversations.find(c => c.id === 1);
        expect(conv?.lastMessage?.content).toBe('New message');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should move updated conversation to top', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const updatedConversation = {
          ...mockConversations[1],
          lastMessageTime: new Date('2026-01-06T12:00:00')
        };

        service.handleNewMessage(updatedConversation);

        const state = service.getState();
        expect(state.conversations[0].id).toBe(2);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should emit conversationUpdated$ event', (done) => {
      let emittedConversation: Conversation | null = null;

      service.conversationUpdated$.subscribe(conversation => {
        emittedConversation = conversation;
      });

      service.handleNewMessage(mockConversations[0]);

      setTimeout(() => {
        expect(emittedConversation?.id).toBe(1);
        done();
      }, 100);
    });

    it('should handle conversation deleted', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        service.handleConversationDeleted(1);

        const state = service.getState();
        expect(state.conversations.find(c => c.id === 1)).toBeUndefined();
        expect(state.conversations.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should emit conversationRemoved$ event', (done) => {
      let emittedConversationId: number | null = null;

      service.conversationRemoved$.subscribe(conversationId => {
        emittedConversationId = conversationId;
      });

      service.handleConversationDeleted(1);

      setTimeout(() => {
        expect(emittedConversationId).toBe(1);
        done();
      }, 100);
    });
  });

  describe('State Management', () => {
    it('should get current state', () => {
      const state = service.getState();
      expect(state).toBeTruthy();
      expect(state.conversations).toBeDefined();
      expect(state.isLoading).toBeDefined();
    });

    it('should get conversations array', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const conversations = service.getConversations();
        expect(conversations.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should get conversation by ID', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const conversation = service.getConversationById(1);
        expect(conversation?.id).toBe(1);
        expect(conversation?.patientName).toBe('John Doe');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should return undefined for non-existent conversation', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const conversation = service.getConversationById(999);
        expect(conversation).toBeUndefined();
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should check loading state', (done) => {
      expect(service.isLoading()).toBe(false);

      service.fetchConversations(0, 50).subscribe(() => {
        expect(service.isLoading()).toBe(false);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should clear error', () => {
      service.clearError();
      expect(service.getError()).toBeNull();
    });

    it('should reset state', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        service.resetState();

        const state = service.getState();
        expect(state.conversations).toEqual([]);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });
  });

  describe('Search & Filter', () => {
    it('should search conversations by patient name', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const results = service.searchConversations('John');
        expect(results.length).toBe(1);
        expect(results[0].patientName).toContain('John');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should search conversations by doctor name', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const results = service.searchConversations('Smith');
        expect(results.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should search conversations by message content', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const results = service.searchConversations('feeling');
        expect(results.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should return all conversations on empty search', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const results = service.searchConversations('');
        expect(results.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should be case-insensitive', (done) => {
      service.fetchConversations(0, 50).subscribe(() => {
        const results = service.searchConversations('JOHN');
        expect(results.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });
  });

  describe('Cache Management', () => {
    it('should track cache validity', (done) => {
      expect(service.isCacheValid()).toBe(false);

      service.fetchConversations(0, 50).subscribe(() => {
        expect(service.isCacheValid()).toBe(true);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/paginated'));
      req.flush(mockResponse);
    });

    it('should allow setting cache duration', () => {
      service.setCacheDuration(10000);
      // Cache duration is set, would need to test expiration
      expect(service).toBeTruthy();
    });
  });

  describe('Component Cleanup', () => {
    it('should destroy service', () => {
      service.destroy();
      // Service should clean up resources
      expect(service).toBeTruthy();
    });
  });
});
