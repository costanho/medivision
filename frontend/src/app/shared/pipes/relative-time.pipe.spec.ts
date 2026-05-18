/**
 * Relative Time Pipe Tests
 */

import { TestBed } from '@angular/core/testing';
import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RelativeTimePipe]
    });
    pipe = TestBed.inject(RelativeTimePipe);
  });

  afterEach(() => {
    pipe.ngOnDestroy();
  });

  describe('Very Recent Messages', () => {
    it('should display "now" for messages < 1 minute old (short format)', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      expect(pipe.transform(thirtySecondsAgo, 'short')).toBe('now');
    });

    it('should display "Just now" for messages < 1 minute old (long format)', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      expect(pipe.transform(thirtySecondsAgo, 'long')).toBe('Just now');
    });

    it('should handle Date objects', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      expect(pipe.transform(thirtySecondsAgo, 'short')).toBe('now');
    });

    it('should handle ISO date strings', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
      const isoString = thirtySecondsAgo.toISOString();

      expect(pipe.transform(isoString, 'short')).toBe('now');
    });
  });

  describe('Minutes Ago', () => {
    it('should display "1m ago" for 1 minute (short format)', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      expect(pipe.transform(oneMinuteAgo, 'short')).toBe('1m ago');
    });

    it('should display "1 minute ago" for 1 minute (long format)', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      expect(pipe.transform(oneMinuteAgo, 'long')).toBe('1 minute ago');
    });

    it('should display "5m ago" for 5 minutes (short format)', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      expect(pipe.transform(fiveMinutesAgo, 'short')).toBe('5m ago');
    });

    it('should display "5 minutes ago" for 5 minutes (long format)', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      expect(pipe.transform(fiveMinutesAgo, 'long')).toBe('5 minutes ago');
    });

    it('should display "59m ago" for 59 minutes (short format)', () => {
      const now = new Date();
      const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60 * 1000);

      expect(pipe.transform(fiftyNineMinutesAgo, 'short')).toBe('59m ago');
    });

    it('should pluralize minutes correctly', () => {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

      expect(pipe.transform(twoMinutesAgo, 'long')).toBe('2 minutes ago');
    });
  });

  describe('Hours Ago', () => {
    it('should display "1h ago" for 1 hour (short format)', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      expect(pipe.transform(oneHourAgo, 'short')).toBe('1h ago');
    });

    it('should display "1 hour ago" for 1 hour (long format)', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      expect(pipe.transform(oneHourAgo, 'long')).toBe('1 hour ago');
    });

    it('should display "3h ago" for 3 hours (short format)', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      expect(pipe.transform(threeHoursAgo, 'short')).toBe('3h ago');
    });

    it('should display "3 hours ago" for 3 hours (long format)', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      expect(pipe.transform(threeHoursAgo, 'long')).toBe('3 hours ago');
    });

    it('should display "23h ago" for 23 hours (short format)', () => {
      const now = new Date();
      const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);

      expect(pipe.transform(twentyThreeHoursAgo, 'short')).toBe('23h ago');
    });

    it('should pluralize hours correctly', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      expect(pipe.transform(twoHoursAgo, 'long')).toBe('2 hours ago');
    });
  });

  describe('Days Ago', () => {
    it('should display "1d ago" for 1 day (short format)', () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(pipe.transform(oneDayAgo, 'short')).toBe('1d ago');
    });

    it('should display "1 day ago" for 1 day (long format)', () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(pipe.transform(oneDayAgo, 'long')).toBe('1 day ago');
    });

    it('should display "3d ago" for 3 days (short format)', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      expect(pipe.transform(threeDaysAgo, 'short')).toBe('3d ago');
    });

    it('should display "3 days ago" for 3 days (long format)', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      expect(pipe.transform(threeDaysAgo, 'long')).toBe('3 days ago');
    });

    it('should display "6d ago" for 6 days (short format)', () => {
      const now = new Date();
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

      expect(pipe.transform(sixDaysAgo, 'short')).toBe('6d ago');
    });

    it('should pluralize days correctly', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      expect(pipe.transform(twoDaysAgo, 'long')).toBe('2 days ago');
    });
  });

  describe('Older Messages', () => {
    it('should display full date for messages 7+ days old (short format)', () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = pipe.transform(sevenDaysAgo, 'short');
      expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M/);
    });

    it('should display full date for messages 7+ days old (long format)', () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = pipe.transform(sevenDaysAgo, 'long');
      expect(result).toMatch(/[A-Z][a-z]+\s\d{1,2},\s\d{4},\s\d{1,2}:\d{2} [AP]M/);
    });

    it('should format date correctly for older messages', () => {
      const date = new Date('2024-12-15T14:30:00');
      const result = pipe.transform(date, 'short');

      expect(result).toContain('Dec');
      expect(result).toContain('15');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should handle invalid date string', () => {
      expect(pipe.transform('invalid-date')).toBe('');
    });

    it('should handle empty string', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('should handle future dates (not common but possible)', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 5 * 60 * 1000);

      const result = pipe.transform(futureDate, 'short');
      // Should handle gracefully
      expect(result).toBeTruthy();
    });
  });

  describe('Caching', () => {
    it('should cache result for same input', () => {
      const date = new Date();
      const result1 = pipe.transform(date, 'short');
      const result2 = pipe.transform(date, 'short');

      expect(result1).toBe(result2);
    });

    it('should invalidate cache when input changes', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      const result1 = pipe.transform(fiveMinutesAgo, 'short');
      const result2 = pipe.transform(tenMinutesAgo, 'short');

      expect(result1).not.toBe(result2);
    });
  });

  describe('Format Parameter', () => {
    it('should use short format as default', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const result = pipe.transform(fiveMinutesAgo);
      expect(result).toBe('5m ago');
    });

    it('should respect short format parameter', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const result = pipe.transform(fiveMinutesAgo, 'short');
      expect(result).toBe('5m ago');
    });

    it('should respect long format parameter', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const result = pipe.transform(fiveMinutesAgo, 'long');
      expect(result).toBe('5 minutes ago');
    });
  });
});
