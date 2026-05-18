import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StartConversationService, SearchResult, ConversationCreationResult } from './start-conversation.service';
import { MessagingService } from './messaging.service';
import { AuthIntegrationService } from './auth-integration.service';
import { User, Conversation } from './models';

describe('StartConversationService', () => {
  let service: StartConversationService;
  let httpMock: HttpTestingController;
  let mockMessagingService: any;
  let mockAuthIntegrationService: any;

  // Mock data
  const mockDoctor: User = {
    id: 2,
    email: 'dr.smith@example.com',
    name: 'Dr. Smith',
    role: 'doctor',
    status: 'online',
    avatar: '/assets/avatar-dr-smith.jpg',
    isOnline: true
  };

  const mockPatient: User = {
    id: 1,
    email: 'patient@example.com',
    name: 'John Doe',
    role: 'patient',
    status: 'online',
    avatar: '/assets/avatar-patient.jpg',
    isOnline: true
  };

  const mockConversation: Conversation = {
    id: 1,
    patientId: 1,
    patientName: 'John Doe',
    patientEmail: 'patient@example.com',
    doctorId: 2,
    doctorName: 'Dr. Smith',
    doctorEmail: 'dr.smith@example.com',
    lastMessage: null,
    lastMessageTime: new Date(),
    unreadCount: 0,
    unreadCountForCurrentUser: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [mockPatient, mockDoctor],
    isActive: true
  };

  const mockSearchResults = {
    content: [mockDoctor],
    totalElements: 1,
    totalPages: 1,
    currentPage: 0,
    pageSize: 20,
    hasNext: false,
    hasPrevious: false
  };

  beforeEach(() => {
    mockMessagingService = {
      getConversations: jasmine.createSpy('getConversations').and.returnValue(Promise.resolve([])),
      sendMessage: jasmine.createSpy('sendMessage').and.returnValue(Promise.resolve({}))
    };

    mockAuthIntegrationService = {
      getAuthenticatedUser: jasmine.createSpy('getAuthenticatedUser')
        .and.returnValue(mockPatient)
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StartConversationService,
        { provide: MessagingService, useValue: mockMessagingService },
        { provide: AuthIntegrationService, useValue: mockAuthIntegrationService }
      ]
    });

    service = TestBed.inject(StartConversationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.destroy();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have empty initial search results', (done) => {
      service.searchResults$.subscribe(results => {
        expect(results.users).toEqual([]);
        expect(results.totalCount).toBe(0);
        expect(results.hasMore).toBe(false);
        done();
      });
    });

    it('should not be searching initially', (done) => {
      service.isSearching$.subscribe(isSearching => {
        expect(isSearching).toBe(false);
        done();
      });
    });
  });

  describe('User Search', () => {
    it('should search users by query', (done) => {
      const query = 'Smith';

      service.searchUsers(query).subscribe(results => {
        expect(results.users.length).toBe(1);
        expect(results.users[0].name).toBe('Dr. Smith');
        expect(results.totalCount).toBe(1);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/users/search'));
      expect(req.request.params.get('query')).toBe(query);
      req.flush(mockSearchResults);
    });

    it('should clear search for empty query', (done) => {
      service.searchUsers('').subscribe(results => {
        expect(results.users).toEqual([]);
        expect(results.totalCount).toBe(0);
        done();
      });
    });

    it('should update search results observable', (done) => {
      const query = 'Smith';
      let callCount = 0;

      service.searchResults$.subscribe(results => {
        callCount++;
        if (callCount === 2) { // Initial empty, then results
          expect(results.users.length).toBe(1);
          expect(results.query).toBe(query);
          done();
        }
      });

      service.searchUsers(query).subscribe();

      const req = httpMock.expectOne(req => req.url.includes('/api/users/search'));
      req.flush(mockSearchResults);
    });

    it('should handle search error', (done) => {
      const query = 'Smith';

      service.searchUsers(query).subscribe(results => {
        expect(results.users).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/users/search'));
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });

    it('should update searching state', (done) => {
      const query = 'Smith';
      const states: boolean[] = [];

      service.isSearching$.subscribe(state => {
        states.push(state);
      });

      service.searchUsers(query).subscribe(() => {
        setTimeout(() => {
          expect(states.length).toBeGreaterThan(0);
          expect(states[states.length - 1]).toBe(false); // Final state should be false
          done();
        }, 100);
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/users/search'));
      req.flush(mockSearchResults);
    });
  });

  describe('Get Available Doctors', () => {
    it('should fetch available doctors', (done) => {
      service.getAvailableDoctors(0, 20).subscribe(response => {
        expect(response.content.length).toBe(1);
        expect(response.content[0].name).toBe('Dr. Smith');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/doctors/directory/paginated'));
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      req.flush(mockSearchResults);
    });

    it('should handle doctors fetch error', (done) => {
      service.getAvailableDoctors(0, 20).subscribe(response => {
        expect(response.content).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/doctors/directory/paginated'));
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });
  });

  describe('Clear Search', () => {
    it('should clear search results', (done) => {
      service.searchUsers('Smith').subscribe();

      const req = httpMock.expectOne(req => req.url.includes('/api/users/search'));
      req.flush(mockSearchResults);

      service.clearSearch();

      service.searchResults$.subscribe(results => {
        expect(results.users).toEqual([]);
        expect(results.query).toBe('');
        done();
      });
    });

    it('should clear search error', () => {
      service.clearSearch();
      expect(service.getSearchError()).toBeNull();
    });
  });

  describe('Check Conversation Exists', () => {
    it('should check if conversation exists', (done) => {
      service.checkConversationExists(2).subscribe(conversation => {
        expect(conversation).toBeTruthy();
        expect(conversation?.id).toBe(1);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/check/2'));
      req.flush(mockConversation);
    });

    it('should return null if conversation does not exist', (done) => {
      service.checkConversationExists(3).subscribe(conversation => {
        expect(conversation).toBeNull();
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/conversations/check/3'));
      req.error(new ErrorEvent('Not found'), { status: 404 });
    });
  });

  describe('Create Conversation', () => {
    it('should create new conversation with doctor', (done) => {
      service.createConversation(mockDoctor).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.conversation).toBeTruthy();
        expect(result.isExisting).toBe(false);
        done();
      });

      // First request: check if conversation exists
      const checkReq = httpMock.expectOne(req => req.url.includes('/api/conversations/check'));
      checkReq.flush(null);

      // Second request: create conversation
      const createReq = httpMock.expectOne(req => req.url.includes('/api/conversations'));
      expect(createReq.request.method).toBe('POST');
      expect(createReq.request.body.doctorId).toBe(2);
      expect(createReq.request.body.patientId).toBe(1);
      createReq.flush(mockConversation);
    });

    it('should return existing conversation if already exists', (done) => {
      service.createConversation(mockDoctor).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.conversation).toBeTruthy();
        expect(result.isExisting).toBe(true);
        done();
      });

      // First request: check if conversation exists (returns existing)
      const checkReq = httpMock.expectOne(req => req.url.includes('/api/conversations/check'));
      checkReq.flush(mockConversation);
    });

    it('should emit conversationCreated event', (done) => {
      let eventEmitted = false;

      service.conversationCreated$.subscribe(conversation => {
        expect(conversation.id).toBe(1);
        eventEmitted = true;
      });

      service.createConversation(mockDoctor).subscribe(() => {
        expect(eventEmitted).toBe(true);
        done();
      });

      const checkReq = httpMock.expectOne(req => req.url.includes('/api/conversations/check'));
      checkReq.flush(null);

      const createReq = httpMock.expectOne(req => req.url.includes('/api/conversations'));
      createReq.flush(mockConversation);
    });

    it('should handle conversation creation error', (done) => {
      service.createConversation(mockDoctor).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.conversation).toBeNull();
        expect(result.error).toBeTruthy();
        done();
      });

      const checkReq = httpMock.expectOne(req => req.url.includes('/api/conversations/check'));
      checkReq.flush(null);

      const createReq = httpMock.expectOne(req => req.url.includes('/api/conversations'));
      createReq.error(new ErrorEvent('Server error'), { status: 500 });
    });

    it('should handle unauthenticated user', (done) => {
      mockAuthIntegrationService.getAuthenticatedUser.and.returnValue(null);

      service.createConversation(mockDoctor).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('authenticated');
        done();
      });
    });
  });

  describe('Build Conversation Request', () => {
    it('should build request with patient-doctor', (done) => {
      service.createConversation(mockDoctor).subscribe();

      const checkReq = httpMock.expectOne(req => req.url.includes('/api/conversations/check'));
      checkReq.flush(null);

      const createReq = httpMock.expectOne(req => req.url.includes('/api/conversations'));
      const body = createReq.request.body;

      expect(body.patientId).toBe(1);
      expect(body.patientEmail).toBe('patient@example.com');
      expect(body.doctorId).toBe(2);
      expect(body.doctorEmail).toBe('dr.smith@example.com');

      createReq.flush(mockConversation);
      done();
    });

    it('should reverse roles for doctor initiating conversation', (done) => {
      const patientUser = mockDoctor;
      mockAuthIntegrationService.getAuthenticatedUser.and.returnValue({
        id: 2,
        email: 'dr.smith@example.com',
        name: 'Dr. Smith',
        role: 'doctor'
      });

      service.createConversation(patientUser).subscribe();

      const checkReq = httpMock.expectOne(req => req.url.includes('/api/conversations/check'));
      checkReq.flush(null);

      const createReq = httpMock.expectOne(req => req.url.includes('/api/conversations'));
      const body = createReq.request.body;

      expect(body.patientId).toBe(1);
      expect(body.doctorId).toBe(2);

      createReq.flush(mockConversation);
      done();
    });
  });

  describe('State Getters', () => {
    it('should get search results', () => {
      const results = service.getSearchResults();
      expect(results.users).toEqual([]);
    });

    it('should get searching state', () => {
      expect(service.getIsSearching()).toBe(false);
    });

    it('should get search error', () => {
      expect(service.getSearchError()).toBeNull();
    });

    it('should get creating conversation state', () => {
      expect(service.getIsCreatingConversation()).toBe(false);
    });
  });

  describe('Service Cleanup', () => {
    it('should destroy service', () => {
      service.destroy();
      expect(service).toBeTruthy();
    });
  });
});
