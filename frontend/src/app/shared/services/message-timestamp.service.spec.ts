/**
 * Message Timestamp Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { MessageTimestampService, MessageWithTimestamp } from './message-timestamp.service';

describe('MessageTimestampService', () => {
  let service: MessageTimestampService;

  // Helper methods
  function isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  function isYesterday(date: Date, now: Date): boolean {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return isSameDay(date, yesterday);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MessageTimestampService]
    });
    service = TestBed.inject(MessageTimestampService);
  });

  describe('groupMessagesByDate', () => {
    it('should add separator metadata to first message of each day', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        {
          id: 1,
          content: 'Message 1',
          senderId: 1,
          timestamp: now
        },
        {
          id: 2,
          content: 'Message 2',
          senderId: 1,
          timestamp: tomorrow
        }
      ];

      const result = service.groupMessagesByDate(messages);

      expect(result[0].showSeparator).toBe(true);
      expect(result[1].showSeparator).toBe(true);
      expect(result[0].separatorText).toBeDefined();
      expect(result[1].separatorText).toBeDefined();
    });

    it('should not add separator for messages on same day', () => {
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        {
          id: 1,
          content: 'Message 1',
          senderId: 1,
          timestamp: now
        },
        {
          id: 2,
          content: 'Message 2',
          senderId: 1,
          timestamp: fiveMinutesLater
        }
      ];

      const result = service.groupMessagesByDate(messages);

      expect(result[0].showSeparator).toBe(true); // First message always has separator
      expect(result[1].showSeparator).toBe(false);
    });

    it('should handle empty array', () => {
      const result = service.groupMessagesByDate([]);
      expect(result).toEqual([]);
    });

    it('should handle single message', () => {
      const now = new Date();
      const messages: MessageWithTimestamp[] = [
        {
          id: 1,
          content: 'Only message',
          senderId: 1,
          timestamp: now
        }
      ];

      const result = service.groupMessagesByDate(messages);

      expect(result.length).toBe(1);
      expect(result[0].showSeparator).toBe(true);
      expect(result[0].showTimestamp).toBe(true); // First message always shows timestamp
    });

    it('should add timestamp metadata based on time differences', () => {
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
      const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        {
          id: 1,
          content: 'Message 1',
          senderId: 1,
          timestamp: now
        },
        {
          id: 2,
          content: 'Message 2',
          senderId: 1,
          timestamp: fiveMinutesLater
        },
        {
          id: 3,
          content: 'Message 3',
          senderId: 1,
          timestamp: tenMinutesLater
        }
      ];

      const result = service.groupMessagesByDate(messages);

      expect(result[0].showTimestamp).toBe(true); // First message
      expect(result[1].showTimestamp).toBe(false); // Only 5 minutes later
      expect(result[2].showTimestamp).toBe(true); // Last message
    });

    it('should show timestamp when sender changes', () => {
      const now = new Date();
      const oneMinuteLater = new Date(now.getTime() + 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        {
          id: 1,
          content: 'Message 1',
          senderId: 1,
          timestamp: now
        },
        {
          id: 2,
          content: 'Message 2',
          senderId: 2,
          timestamp: oneMinuteLater
        }
      ];

      const result = service.groupMessagesByDate(messages);

      expect(result[0].showTimestamp).toBe(true);
      expect(result[1].showTimestamp).toBe(true); // Different sender
    });

    it('should show timestamp for more than 5 minute gaps', () => {
      const now = new Date();
      const sixMinutesLater = new Date(now.getTime() + 6 * 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        {
          id: 1,
          content: 'Message 1',
          senderId: 1,
          timestamp: now
        },
        {
          id: 2,
          content: 'Message 2',
          senderId: 1,
          timestamp: sixMinutesLater
        }
      ];

      const result = service.groupMessagesByDate(messages);

      expect(result[0].showTimestamp).toBe(true);
      expect(result[1].showTimestamp).toBe(true); // More than 5 minutes gap
    });

    it('should handle previous messages parameter', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const previousMessages: MessageWithTimestamp[] = [
        {
          id: 0,
          content: 'Previous message',
          senderId: 1,
          timestamp: yesterday
        }
      ];

      const newMessages: MessageWithTimestamp[] = [
        {
          id: 1,
          content: 'New message',
          senderId: 1,
          timestamp: now
        }
      ];

      const result = service.groupMessagesByDate(newMessages, previousMessages);

      expect(result[0].showSeparator).toBe(true); // Different day from previous messages
    });
  });

  describe('createMessageGroups', () => {
    it('should group messages by date', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextDay = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        { id: 1, content: 'Msg 1', senderId: 1, timestamp: now },
        { id: 2, content: 'Msg 2', senderId: 1, timestamp: now },
        { id: 3, content: 'Msg 3', senderId: 1, timestamp: tomorrow },
        { id: 4, content: 'Msg 4', senderId: 1, timestamp: nextDay }
      ];

      const groups = service.createMessageGroups(messages);

      expect(groups.length).toBe(3);
      expect(groups[0].messages.length).toBe(2);
      expect(groups[1].messages.length).toBe(1);
      expect(groups[2].messages.length).toBe(1);
    });

    it('should include separator text in groups', () => {
      const now = new Date();
      const messages: MessageWithTimestamp[] = [
        { id: 1, content: 'Message', senderId: 1, timestamp: now }
      ];

      const groups = service.createMessageGroups(messages);

      expect(groups[0].separatorText).toBe('Today');
    });

    it('should sort groups by date (oldest first)', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        { id: 1, content: 'Tomorrow', senderId: 1, timestamp: tomorrow },
        { id: 2, content: 'Today', senderId: 1, timestamp: now },
        { id: 3, content: 'Yesterday', senderId: 1, timestamp: yesterday }
      ];

      const groups = service.createMessageGroups(messages);

      expect(groups[0].separatorText).toBe('Yesterday');
      expect(groups[1].separatorText).toBe('Today');
      expect(groups[2].separatorText).toBe('Tomorrow');
    });

    it('should handle empty array', () => {
      const groups = service.createMessageGroups([]);
      expect(groups).toEqual([]);
    });
  });

  describe('formatDateSeparator', () => {
    it('should return "Today" for current date', () => {
      const now = new Date();
      expect(service.formatDateSeparator(now)).toBe('Today');
    });

    it('should return "Yesterday" for previous day', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(service.formatDateSeparator(yesterday)).toBe('Yesterday');
    });

    it('should return "Month Day" for dates in current year', () => {
      const now = new Date();
      const pastDate = new Date(now.getFullYear(), 5, 15); // June 15

      if (!isSameDay(pastDate, now) && !isYesterday(pastDate, now)) {
        const result = service.formatDateSeparator(pastDate);
        expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
      }
    });

    it('should return "Month Day, Year" for dates in different year', () => {
      const now = new Date();
      const lastYear = new Date(now.getFullYear() - 1, 11, 25);
      const result = service.formatDateSeparator(lastYear);
      expect(result).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });
  });

  describe('formatTimestamp', () => {
    it('should format recent timestamps as relative time', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const result = service.formatTimestamp(fiveMinutesAgo, 'short');
      expect(result).toBe('5m ago');
    });

    it('should format old timestamps as full date', () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const result = service.formatTimestamp(tenDaysAgo, 'short');
      expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M/);
    });

    it('should handle short format', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const result = service.formatTimestamp(threeHoursAgo, 'short');
      expect(result).toBe('3h ago');
    });

    it('should handle long format', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const result = service.formatTimestamp(twoHoursAgo, 'long');
      expect(result).toBe('2 hours ago');
    });

    it('should handle string timestamps', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const result = service.formatTimestamp(fiveMinutesAgo.toISOString(), 'short');
      expect(result).toBe('5m ago');
    });
  });

  describe('getMessageDate', () => {
    it('should return date with time set to 00:00:00', () => {
      const date = new Date('2024-12-15T14:30:00');
      const result = service.getMessageDate(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should handle string timestamps', () => {
      const timestamp = '2024-12-15T14:30:00';
      const result = service.getMessageDate(timestamp);

      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
    });
  });

  describe('getMessageTime', () => {
    it('should return full Date object', () => {
      const date = new Date('2024-12-15T14:30:00');
      const result = service.getMessageTime(date);

      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    it('should handle string timestamps', () => {
      const timestamp = '2024-12-15T14:30:00';
      const result = service.getMessageTime(timestamp);

      expect(result instanceof Date).toBe(true);
      expect(result.getHours()).toBe(14);
    });
  });

  describe('shouldShowTimestamp Logic', () => {
    it('should show timestamp for first message', () => {
      const messages: MessageWithTimestamp[] = [
        {
          id: 1,
          content: 'First',
          senderId: 1,
          timestamp: new Date()
        }
      ];

      const result = service.groupMessagesByDate(messages);
      expect(result[0].showTimestamp).toBe(true);
    });

    it('should show timestamp for last message', () => {
      const now = new Date();
      const oneMinuteLater = new Date(now.getTime() + 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        { id: 1, content: 'First', senderId: 1, timestamp: now },
        { id: 2, content: 'Last', senderId: 1, timestamp: oneMinuteLater }
      ];

      const result = service.groupMessagesByDate(messages);
      expect(result[1].showTimestamp).toBe(true);
    });

    it('should show timestamp when sender changes', () => {
      const now = new Date();
      const oneMinuteLater = new Date(now.getTime() + 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        { id: 1, content: 'From A', senderId: 1, timestamp: now },
        { id: 2, content: 'From B', senderId: 2, timestamp: oneMinuteLater }
      ];

      const result = service.groupMessagesByDate(messages);
      expect(result[1].showTimestamp).toBe(true);
    });

    it('should not show timestamp for consecutive messages within 5 minutes', () => {
      const now = new Date();
      const twoMinutesLater = new Date(now.getTime() + 2 * 60 * 1000);

      const messages: MessageWithTimestamp[] = [
        { id: 1, content: 'Message 1', senderId: 1, timestamp: now },
        { id: 2, content: 'Message 2', senderId: 1, timestamp: twoMinutesLater }
      ];

      const result = service.groupMessagesByDate(messages);
      expect(result[1].showTimestamp).toBe(false);
    });
  });
});
