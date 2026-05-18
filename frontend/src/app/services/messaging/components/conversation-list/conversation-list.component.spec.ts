import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConversationListComponent } from './conversation-list.component';
import { MessagingService } from '../../messaging.service';
import { AuthIntegrationService } from '../../auth-integration.service';
import { of, throwError, Subject } from 'rxjs';
import { Conversation } from '../../models';

describe('ConversationListComponent', () => {
  let component: ConversationListComponent;
  let fixture: ComponentFixture<ConversationListComponent>;
  let mockMessagingService: any;
  let mockAuthIntegrationService: any;
  let mockRouter: any;

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

  const mockAuthenticatedUser = {
    id: 2,
    email: 'smith@example.com',
    fullName: 'Dr. Smith',
    role: 'doctor'
  };

  beforeEach(async () => {
    // Setup mock services
    mockMessagingService = {
      getConversations: jasmine.createSpy('getConversations')
        .and.returnValue(of({
          content: mockConversations,
          totalPages: 1,
          hasNext: false,
          totalElements: 2,
          currentPage: 0,
          pageSize: 50,
          hasPrevious: false
        })),
      markMessageAsRead: jasmine.createSpy('markMessageAsRead')
        .and.returnValue(of({})),
      chatMessages$: new Subject()
    };

    mockAuthIntegrationService = {
      isMessagingReady: jasmine.createSpy('isMessagingReady')
        .and.returnValue(true),
      getAuthenticatedUser: jasmine.createSpy('getAuthenticatedUser')
        .and.returnValue(mockAuthenticatedUser)
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [ConversationListComponent, CommonModule, FormsModule],
      providers: [
        { provide: MessagingService, useValue: mockMessagingService },
        { provide: AuthIntegrationService, useValue: mockAuthIntegrationService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConversationListComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.conversations).toEqual([]);
      expect(component.filteredConversations).toEqual([]);
      expect(component.searchQuery).toBe('');
      expect(component.currentPage).toBe(0);
      expect(component.pageSize).toBe(50);
    });

    it('should load conversations on init', () => {
      fixture.detectChanges();

      expect(mockMessagingService.getConversations).toHaveBeenCalledWith(0, 50);
      expect(component.conversations.length).toBe(2);
    });
  });

  describe('Loading Conversations', () => {
    it('should set loading state while fetching', () => {
      component.loading = false;

      component.loadConversations();

      expect(component.loading).toBe(true);
      expect(mockMessagingService.getConversations).toHaveBeenCalled();
    });

    it('should handle successful conversation load', (done) => {
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.conversations.length).toBe(2);
        expect(component.noConversations).toBe(false);
        expect(component.error).toBe('');
        done();
      }, 100);
    });

    it('should handle error loading conversations', (done) => {
      mockMessagingService.getConversations.and.returnValue(
        throwError({ error: { message: 'Network error' } })
      );

      component.loadConversations();

      setTimeout(() => {
        expect(component.error).toBe('Network error');
        expect(component.loading).toBe(false);
        done();
      }, 100);
    });

    it('should show no conversations message when empty', (done) => {
      mockMessagingService.getConversations.and.returnValue(of({
        content: [],
        totalPages: 0,
        hasNext: false,
        totalElements: 0,
        currentPage: 0,
        pageSize: 50,
        hasPrevious: false
      }));

      component.loadConversations();

      setTimeout(() => {
        expect(component.noConversations).toBe(true);
        expect(component.conversations.length).toBe(0);
        done();
      }, 100);
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should sort conversations by most recent first', () => {
      component.sortConversations();

      // First conversation should be the most recent (2026-01-06)
      expect(component.conversations[0].id).toBe(1);
      // Second conversation should be older (2026-01-05)
      expect(component.conversations[1].id).toBe(2);
    });

    it('should re-sort after loading', (done) => {
      setTimeout(() => {
        // Conversations should be sorted by most recent
        const times = component.conversations.map(c => new Date(c.lastMessageTime).getTime());
        for (let i = 0; i < times.length - 1; i++) {
          expect(times[i]).toBeGreaterThanOrEqual(times[i + 1]);
        }
        done();
      }, 100);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should filter conversations by participant name', () => {
      component.searchQuery = 'John';
      component.filterConversations();

      expect(component.filteredConversations.length).toBe(1);
      expect(component.filteredConversations[0].patientName).toContain('John');
    });

    it('should filter conversations by message content', () => {
      component.searchQuery = 'tomorrow';
      component.filterConversations();

      expect(component.filteredConversations.length).toBe(1);
      expect(component.filteredConversations[0].lastMessage?.content).toContain('tomorrow');
    });

    it('should be case-insensitive', () => {
      component.searchQuery = 'JANE';
      component.filterConversations();

      expect(component.filteredConversations.length).toBe(1);
      expect(component.filteredConversations[0].patientName).toContain('Jane');
    });

    it('should show all conversations when search is empty', () => {
      component.searchQuery = '';
      component.filterConversations();

      expect(component.filteredConversations.length).toBe(2);
    });

    it('should clear search', () => {
      component.searchQuery = 'test';
      component.clearSearch();

      expect(component.searchQuery).toBe('');
      expect(component.filteredConversations.length).toBe(2);
    });
  });

  describe('Conversation Selection', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit conversationSelected event', (done) => {
      const conversation = mockConversations[0];
      component.conversationSelected.subscribe((selected) => {
        expect(selected).toEqual(conversation);
        done();
      });

      component.selectConversation(conversation);
    });

    it('should set selectedConversationId', () => {
      const conversation = mockConversations[0];
      component.selectConversation(conversation);

      expect(component.selectedConversationId).toBe(conversation.id);
    });

    it('should mark conversation as read', () => {
      const conversation = mockConversations[0];
      component.selectConversation(conversation);

      expect(mockMessagingService.markMessageAsRead).toHaveBeenCalled();
    });

    it('should check if conversation is selected', () => {
      component.selectedConversationId = 1;

      expect(component.isSelected(1)).toBe(true);
      expect(component.isSelected(2)).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should get participant name correctly', () => {
      const conversation = mockConversations[0];
      const name = component.getParticipantName(conversation);

      expect(name).toBe('John Doe');
    });

    it('should get avatar initials', () => {
      expect(component.getAvatarInitials('John Doe')).toBe('JD');
      expect(component.getAvatarInitials('Dr. Smith')).toBe('DS');
      expect(component.getAvatarInitials('A')).toBe('A');
    });

    it('should get time ago string', () => {
      const now = new Date();

      // Just now
      expect(component.getTimeAgo(now)).toContain('ago');

      // 1 hour ago
      const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
      expect(component.getTimeAgo(oneHourAgo)).toContain('h ago');
    });

    it('should get participant role', () => {
      const conversation = mockConversations[0];
      const role = component.getParticipantRole(conversation);

      // Current user is doctor, so participant role should be patient
      expect(role).toBe('patient');
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should load more conversations', () => {
      component.hasMore = true;
      component.currentPage = 0;

      component.loadMore();

      expect(component.currentPage).toBe(1);
      expect(mockMessagingService.getConversations).toHaveBeenCalledWith(1, 50);
    });

    it('should not load more if no more pages', () => {
      component.hasMore = false;
      const callCount = mockMessagingService.getConversations.calls.count();

      component.loadMore();

      // Should not call getConversations again
      expect(mockMessagingService.getConversations.calls.count()).toBe(callCount);
    });

    it('should refresh conversations', () => {
      component.currentPage = 3;
      component.refresh();

      expect(component.currentPage).toBe(0);
      expect(mockMessagingService.getConversations).toHaveBeenCalled();
    });
  });

  describe('Alerts', () => {
    it('should dismiss error message', () => {
      component.error = 'Test error';
      component.dismissError();

      expect(component.error).toBe('');
    });

    it('should dismiss success message', () => {
      component.successMessage = 'Test success';
      component.dismissSuccess();

      expect(component.successMessage).toBe('');
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      fixture.detectChanges();
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
