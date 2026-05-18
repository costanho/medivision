import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessagesComponent } from './messages.component';
import { MessagingService } from '../../messaging.service';
import { of } from 'rxjs';

describe('MessagesComponent', () => {
  let component: MessagesComponent;
  let fixture: ComponentFixture<MessagesComponent>;
  let messagingService: jasmine.SpyObj<MessagingService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('MessagingService', [
      'markMessageAsRead'
    ], {
      messages$: of([]),
      chatMessages$: of([])
    });

    await TestBed.configureTestingModule({
      imports: [MessagesComponent],
      providers: [
        { provide: MessagingService, useValue: spy }
      ]
    }).compileComponents();

    messagingService = TestBed.inject(MessagingService) as jasmine.SpyObj<MessagingService>;
    fixture = TestBed.createComponent(MessagesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load messages on init', () => {
    fixture.detectChanges();
    expect(component.messages).toBeDefined();
  });

  it('should filter messages by search query', () => {
    component.messages = [
      {
        id: 1,
        senderId: 1,
        senderName: 'John Doe',
        content: 'Hello World',
        timestamp: new Date(),
        isRead: false,
        recipientId: 2
      }
    ];
    component.searchQuery = 'Hello';
    component['applyFilters']();
    expect(component.filteredMessages.length).toBe(1);
  });

  it('should filter messages by read status', () => {
    component.messages = [
      {
        id: 1,
        senderId: 1,
        senderName: 'John',
        content: 'Message 1',
        timestamp: new Date(),
        isRead: false,
        recipientId: 2
      },
      {
        id: 2,
        senderId: 1,
        senderName: 'Jane',
        content: 'Message 2',
        timestamp: new Date(),
        isRead: true,
        recipientId: 2
      }
    ];
    component.selectedFilter = 'unread';
    component['applyFilters']();
    expect(component.filteredMessages.length).toBe(1);
    expect(component.filteredMessages[0].isRead).toBe(false);
  });

  it('should format dates correctly', () => {
    const today = new Date();
    const result = component.formatDate(today);
    expect(result).toBe('Today');
  });

  it('should call markMessageAsRead when message is viewed', () => {
    messagingService.markMessageAsRead.and.returnValue(of({} as any));
    component.onMessageViewed(1);
    expect(messagingService.markMessageAsRead).toHaveBeenCalledWith(1);
  });
});
