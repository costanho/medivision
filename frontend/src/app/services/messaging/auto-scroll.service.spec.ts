/**
 * Auto-Scroll Service Tests
 * Tests for intelligent auto-scrolling in chat message lists
 */

import { TestBed } from '@angular/core/testing';
import { AutoScrollService, ScrollPosition } from './auto-scroll.service';

describe('AutoScrollService', () => {
  let service: AutoScrollService;

  // Helper function to create mock element with specific properties
  function createMockElement(scrollTop: number = 0, scrollHeight: number = 1000, clientHeight: number = 400) {
    const mockProps = {
      scrollTop,
      scrollHeight,
      clientHeight,
      scrollTo: jasmine.createSpy('scrollTo'),
      scrollBy: jasmine.createSpy('scrollBy')
    };

    const element: any = {};

    Object.defineProperty(element, 'scrollTop', {
      get: function() { return mockProps.scrollTop; },
      set: function(value) { mockProps.scrollTop = value; },
      configurable: true
    });

    Object.defineProperty(element, 'scrollHeight', {
      get: function() { return mockProps.scrollHeight; },
      set: function(value) { mockProps.scrollHeight = value; },
      configurable: true
    });

    Object.defineProperty(element, 'clientHeight', {
      get: function() { return mockProps.clientHeight; },
      set: function(value) { mockProps.clientHeight = value; },
      configurable: true
    });

    Object.defineProperty(element, 'scrollTo', {
      get: function() { return mockProps.scrollTo; },
      configurable: true
    });

    Object.defineProperty(element, 'scrollBy', {
      get: function() { return mockProps.scrollBy; },
      configurable: true
    });

    return element;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutoScrollService);
  });

  afterEach(() => {
    service.destroy();
  });

  // ═══════════════════════════════════════════════════════════════
  // Service Initialization
  // ═══════════════════════════════════════════════════════════════

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default scroll position', (done) => {
    service.scrollPosition$.subscribe(position => {
      expect(position.isAtBottom).toBe(true);
      expect(position.scrollTop).toBe(0);
      done();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Scroll Position Detection
  // ═══════════════════════════════════════════════════════════════

  describe('isAtBottom', () => {
    it('should return true when at bottom', () => {
      const element = createMockElement(600, 1000, 400);
      expect(service.isAtBottom(element)).toBe(true);
    });

    it('should return false when not at bottom', () => {
      const element = createMockElement(400, 1000, 400);
      expect(service.isAtBottom(element)).toBe(false);
    });

    it('should return true with small container', () => {
      const element = createMockElement(0, 50, 400);
      expect(service.isAtBottom(element)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // isNearBottom Detection
  // ═══════════════════════════════════════════════════════════════

  describe('isNearBottom', () => {
    it('should return true when near bottom', () => {
      const element = createMockElement(550, 1000, 400);
      expect(service.isNearBottom(element)).toBe(true);
    });

    it('should return false when far from bottom', () => {
      const element = createMockElement(450, 1000, 400);
      expect(service.isNearBottom(element)).toBe(false);
    });

    it('should use custom threshold', () => {
      const element = createMockElement(500, 1000, 400);
      expect(service.isNearBottom(element, 50)).toBe(false);
      expect(service.isNearBottom(element, 150)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // User Scroll Detection
  // ═══════════════════════════════════════════════════════════════

  describe('User Scroll Detection', () => {
    it('should return false initially', () => {
      expect(service.isUserScroll()).toBe(false);
    });

    it('should return true after scroll event', (done) => {
      const element = createMockElement();
      service.handleScroll(element);
      expect(service.isUserScroll()).toBe(true);

      setTimeout(() => {
        expect(service.isUserScroll()).toBe(false);
        done();
      }, 1100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Scroll Event Handling
  // ═══════════════════════════════════════════════════════════════

  describe('handleScroll', () => {
    it('should update scroll position on event', (done) => {
      const element = createMockElement(300, 1000, 400);
      let eventCount = 0;

      service.scrollPosition$.subscribe(() => {
        eventCount++;
      });

      service.handleScroll(element);

      setTimeout(() => {
        expect(eventCount).toBeGreaterThan(1);
        done();
      }, 150);
    });

    it('should track user scroll flag', (done) => {
      const element = createMockElement();
      service.handleScroll(element);

      expect(service.isUserScroll()).toBe(true);

      setTimeout(() => {
        expect(service.isUserScroll()).toBe(false);
        done();
      }, 1100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Auto-Scroll Methods
  // ═══════════════════════════════════════════════════════════════

  describe('autoScrollIfAtBottom', () => {
    it('should scroll when at bottom', () => {
      const element = createMockElement(600, 1000, 400);
      service.autoScrollIfAtBottom(element);
      expect(element.scrollTo).toHaveBeenCalled();
    });

    it('should not scroll when not at bottom', () => {
      const element = createMockElement(300, 1000, 400);
      service.autoScrollIfAtBottom(element);
      expect(element.scrollTo).not.toHaveBeenCalled();
    });

    it('should not scroll during user scroll', (done) => {
      const element = createMockElement(600, 1000, 400);
      service.handleScroll(element);
      service.autoScrollIfAtBottom(element);

      // User scroll flag prevents scroll
      expect(element.scrollTo).not.toHaveBeenCalled();

      // After timeout, should allow scroll
      setTimeout(() => {
        service.autoScrollIfAtBottom(element);
        expect(element.scrollTo).toHaveBeenCalled();
        done();
      }, 1100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Scroll Animation Methods
  // ═══════════════════════════════════════════════════════════════

  describe('scrollToBottom', () => {
    it('should call scrollTo with correct parameters', () => {
      const element = createMockElement(0, 1000, 400);
      service.scrollToBottom(element);

      expect(element.scrollTo).toHaveBeenCalledWith({
        top: 1000,
        behavior: 'smooth'
      });
    });

    it('should emit auto-scroll triggered event', (done) => {
      const element = createMockElement();
      let triggered = false;

      service.autoScrollTriggered$.subscribe(() => {
        triggered = true;
      });

      service.scrollToBottom(element);

      setTimeout(() => {
        expect(triggered).toBe(true);
        done();
      }, 50);
    });

    it('should handle null element gracefully', () => {
      expect(() => {
        service.scrollToBottom(null as any);
      }).not.toThrow();
    });
  });

  describe('scrollToPosition', () => {
    it('should scroll to specific position', () => {
      const element = createMockElement();
      service.scrollToPosition(element, 500);

      expect(element.scrollTo).toHaveBeenCalledWith({
        top: 500,
        behavior: 'smooth'
      });
    });
  });

  describe('scrollToTop', () => {
    it('should scroll to top', () => {
      const element = createMockElement(600, 1000, 400);
      service.scrollToTop(element);

      expect(element.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth'
      });
    });
  });

  describe('scrollBy', () => {
    it('should scroll by specified amount', () => {
      const element = createMockElement();
      service.scrollBy(element, 200);

      expect(element.scrollBy).toHaveBeenCalledWith({
        top: 200,
        behavior: 'smooth'
      });
    });

    it('should handle negative scroll amount', () => {
      const element = createMockElement();
      service.scrollBy(element, -100);

      expect(element.scrollBy).toHaveBeenCalledWith({
        top: -100,
        behavior: 'smooth'
      });
    });
  });

  describe('jumpToMessage', () => {
    it('should jump to message element', () => {
      const messageElement = document.createElement('div');
      messageElement.scrollIntoView = jasmine.createSpy('scrollIntoView');

      const containerElement = createMockElement();
      service.jumpToMessage(containerElement, messageElement);

      expect(messageElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest'
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Configuration Methods
  // ═══════════════════════════════════════════════════════════════

  describe('Configuration', () => {
    it('should return scroll threshold', () => {
      expect(service.getScrollThreshold()).toBe(100);
    });

    it('should return scroll duration', () => {
      expect(service.getScrollDuration()).toBe(300);
    });

    it('should return current scroll position', (done) => {
      service.scrollPosition$.subscribe(() => {
        const position = service.getScrollPosition();
        expect(position).toBeTruthy();
        expect(position.hasOwnProperty('isAtBottom')).toBe(true);
        done();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('destroy', () => {
    it('should handle destroy gracefully', () => {
      expect(() => {
        service.destroy();
        service.destroy();
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Observable Streams
  // ═══════════════════════════════════════════════════════════════

  describe('Observable Streams', () => {
    it('scrollPosition$ should emit position changes', (done) => {
      const element = createMockElement(300, 1000, 400);
      let emissions = 0;

      service.scrollPosition$.subscribe(() => {
        emissions++;
      });

      service.handleScroll(element);

      setTimeout(() => {
        expect(emissions).toBeGreaterThan(1);
        done();
      }, 200);
    });

    it('autoScrollTriggered$ should emit on auto-scroll', (done) => {
      const element = createMockElement();
      let triggered = false;

      service.autoScrollTriggered$.subscribe(() => {
        triggered = true;
      });

      service.scrollToBottom(element);

      setTimeout(() => {
        expect(triggered).toBe(true);
        done();
      }, 100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Integration Tests
  // ═══════════════════════════════════════════════════════════════

  describe('Integration', () => {
    it('should handle complete scroll flow', (done) => {
      const element = createMockElement(0, 1000, 400);

      // Start at top
      expect(service.isAtBottom(element)).toBe(false);

      // Scroll to bottom
      element.scrollTop = 600;
      service.handleScroll(element);

      setTimeout(() => {
        expect(service.isAtBottom(element)).toBe(true);
        service.autoScrollIfAtBottom(element);
        expect(element.scrollTo).toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should respect user scroll during auto-scroll', (done) => {
      const element = createMockElement(600, 1000, 400);

      service.handleScroll(element);
      expect(service.isUserScroll()).toBe(true);

      service.autoScrollIfAtBottom(element);
      expect(element.scrollTo).not.toHaveBeenCalled();

      setTimeout(() => {
        service.autoScrollIfAtBottom(element);
        expect(element.scrollTo).toHaveBeenCalled();
        done();
      }, 1100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle very large scroll values', () => {
      const element = createMockElement(999999, 1000000, 400);
      expect(service.isAtBottom(element)).toBe(true);
    });

    it('should handle empty container', () => {
      const element = createMockElement(0, 0, 0);
      expect(service.isAtBottom(element)).toBe(true);
    });

    it('should handle single message scenario', () => {
      const element = createMockElement(0, 50, 400);
      expect(service.isAtBottom(element)).toBe(true);
    });

    it('should handle rapid scroll events', (done) => {
      const element = createMockElement();
      let positionUpdates = 0;

      service.scrollPosition$.subscribe(() => {
        positionUpdates++;
      });

      // Simulate rapid scrolling
      for (let i = 0; i < 10; i++) {
        element.scrollTop = i * 50;
        service.handleScroll(element);
      }

      setTimeout(() => {
        // Should have fewer updates than 10 due to debouncing
        expect(positionUpdates).toBeLessThan(10);
        done();
      }, 300);
    });
  });
});
