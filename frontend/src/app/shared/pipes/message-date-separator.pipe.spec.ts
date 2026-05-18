/**
 * Message Date Separator Pipe Tests
 */

import { TestBed } from '@angular/core/testing';
import { MessageDateSeparatorPipe } from './message-date-separator.pipe';

// Helper functions
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

describe('MessageDateSeparatorPipe', () => {
  let pipe: MessageDateSeparatorPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MessageDateSeparatorPipe]
    });
    pipe = TestBed.inject(MessageDateSeparatorPipe);
  });

  describe('Today', () => {
    it('should display "Today" for current day', () => {
      const now = new Date();
      expect(pipe.transform(now)).toBe('Today');
    });

    it('should display "Today" for any time today', () => {
      const noon = new Date();
      noon.setHours(12, 0, 0);

      expect(pipe.transform(noon)).toBe('Today');
    });

    it('should display "Today" for string date of today', () => {
      const now = new Date();
      expect(pipe.transform(now.toISOString())).toBe('Today');
    });
  });

  describe('Yesterday', () => {
    it('should display "Yesterday" for previous day', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(pipe.transform(yesterday)).toBe('Yesterday');
    });

    it('should display "Yesterday" for any time yesterday', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      yesterday.setHours(14, 30, 0);

      expect(pipe.transform(yesterday)).toBe('Yesterday');
    });

    it('should handle date near midnight', () => {
      const now = new Date();
      const almostYesterday = new Date(now.getTime() - 23 * 60 * 60 * 1000);

      expect(pipe.transform(almostYesterday)).toBe('Yesterday');
    });
  });

  describe('Current Year', () => {
    it('should display "Month Day" format for dates in current year', () => {
      const now = new Date();
      const someDate = new Date(now.getFullYear(), 11, 15); // Dec 15

      if (!isSameDay(someDate, now) && !isYesterday(someDate, now)) {
        const result = pipe.transform(someDate);
        expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
        expect(result).toContain('Dec');
        expect(result).toContain('15');
      }
    });

    it('should display January dates correctly', () => {
      const now = new Date();
      const janDate = new Date(now.getFullYear(), 0, 20); // Jan 20

      if (!isSameDay(janDate, now) && !isYesterday(janDate, now)) {
        const result = pipe.transform(janDate);
        expect(result).toContain('Jan');
        expect(result).toContain('20');
      }
    });

    it('should not include year for current year dates', () => {
      const now = new Date();
      const someDate = new Date(now.getFullYear(), 5, 10); // June 10

      if (!isSameDay(someDate, now) && !isYesterday(someDate, now)) {
        const result = pipe.transform(someDate);
        expect(result).not.toContain(now.getFullYear().toString());
      }
    });
  });

  describe('Previous Year', () => {
    it('should display "Month Day, Year" format for previous year', () => {
      const now = new Date();
      const lastYear = new Date(now.getFullYear() - 1, 11, 25); // Dec 25 last year

      const result = pipe.transform(lastYear);
      expect(result).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
      expect(result).toContain('December');
      expect(result).toContain('25');
      expect(result).toContain((now.getFullYear() - 1).toString());
    });

    it('should display year for dates from multiple years ago', () => {
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, 3, 10); // April 10, 2 years ago

      const result = pipe.transform(twoYearsAgo);
      expect(result).toContain('April');
      expect(result).toContain('10');
      expect(result).toContain((now.getFullYear() - 2).toString());
    });
  });

  describe('With Time Format', () => {
    it('should include time when requested for today', () => {
      const now = new Date();
      now.setHours(14, 30, 0);

      const result = pipe.transform(now, true);
      expect(result).toContain('Today');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
      expect(result).toMatch(/[AP]M/);
    });

    it('should include time when requested for yesterday', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      yesterday.setHours(9, 45, 0);

      const result = pipe.transform(yesterday, true);
      expect(result).toContain('Yesterday');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should include time when requested for older dates', () => {
      const now = new Date();
      const oldDate = new Date(now.getFullYear(), 5, 10);
      oldDate.setHours(16, 20, 0);

      const result = pipe.transform(oldDate, true);
      expect(result).toContain('Jun');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should format AM/PM correctly', () => {
      const now = new Date();
      const morningDate = new Date(now.getFullYear(), 0, 15);
      morningDate.setHours(9, 0, 0);

      const result = pipe.transform(morningDate, true);
      expect(result).toContain('AM');
    });

    it('should format PM times correctly', () => {
      const now = new Date();
      const afternoonDate = new Date(now.getFullYear(), 0, 15);
      afternoonDate.setHours(14, 0, 0);

      const result = pipe.transform(afternoonDate, true);
      expect(result).toContain('PM');
    });

    it('should pad minutes with zero', () => {
      const now = new Date();
      const date = new Date(now.getFullYear(), 0, 15);
      date.setHours(10, 5, 0);

      const result = pipe.transform(date, true);
      expect(result).toContain('10:05');
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

    it('should handle Date objects', () => {
      const now = new Date();
      expect(pipe.transform(now)).toBe('Today');
    });

    it('should handle ISO date strings', () => {
      const now = new Date();
      expect(pipe.transform(now.toISOString())).toBe('Today');
    });

    it('should handle midnight correctly', () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

      expect(pipe.transform(midnight)).toBe('Today');
    });

    it('should handle 23:59:59 correctly', () => {
      const now = new Date();
      const lastSecond = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      expect(pipe.transform(lastSecond)).toBe('Today');
    });
  });

  describe('Month Names', () => {
    it('should display correct month abbreviations', () => {
      const now = new Date();
      const months = [
        { index: 0, name: 'Jan' },
        { index: 1, name: 'Feb' },
        { index: 2, name: 'Mar' },
        { index: 3, name: 'Apr' },
        { index: 4, name: 'May' },
        { index: 5, name: 'Jun' },
        { index: 6, name: 'Jul' },
        { index: 7, name: 'Aug' },
        { index: 8, name: 'Sep' },
        { index: 9, name: 'Oct' },
        { index: 10, name: 'Nov' },
        { index: 11, name: 'Dec' }
      ];

      for (const month of months) {
        const date = new Date(now.getFullYear(), month.index, 15);
        if (!isSameDay(date, now) && !isYesterday(date, now)) {
          const result = pipe.transform(date);
          expect(result).toContain(month.name);
        }
      }
    });

    it('should display full month names for previous year', () => {
      const now = new Date();
      const lastYear = new Date(now.getFullYear() - 1, 0, 15);

      const result = pipe.transform(lastYear);
      expect(result).toContain('January');
    });
  });
});
