/**
 * Empty State Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { EmptyStateService, EmptyStateContext } from './empty-state.service';
import { take } from 'rxjs/operators';

describe('EmptyStateService', () => {
  let service: EmptyStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmptyStateService]
    });
    service = TestBed.inject(EmptyStateService);
  });

  afterEach(() => {
    service.clearAll();
  });

  describe('Context Management', () => {
    it('should create', () => {
      expect(service).toBeTruthy();
    });

    it('should set context', (done) => {
      const context: EmptyStateContext = {
        variant: 'conversations',
        isVisible: true
      };

      service.setContext('test', context);
      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('conversations');
        expect(ctx.isVisible).toBe(true);
        done();
      });
    });

    it('should update existing context', (done) => {
      const context1: EmptyStateContext = {
        variant: 'conversations',
        isVisible: true
      };
      const context2: EmptyStateContext = {
        variant: 'messages',
        isVisible: false
      };

      service.setContext('test', context1);
      service.setContext('test', context2);

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('messages');
        expect(ctx.isVisible).toBe(false);
        done();
      });
    });

    it('should return observable for context', (done) => {
      const context: EmptyStateContext = {
        variant: 'search',
        isVisible: true
      };

      service.setContext('test', context);
      const obs = service.getContext$('test');

      expect(obs).toBeTruthy();
      obs.pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('search');
        done();
      });
    });

    it('should return default context for non-existent context', (done) => {
      service.getContext$('nonexistent').pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('custom');
        expect(ctx.isVisible).toBe(false);
        done();
      });
    });
  });

  describe('Show/Hide Operations', () => {
    it('should show empty state', (done) => {
      service.show('test', 'conversations');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.isVisible).toBe(true);
        expect(ctx.variant).toBe('conversations');
        done();
      });
    });

    it('should show with custom title and description', (done) => {
      service.show('test', 'custom', 'Custom Title', 'Custom Description');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.title).toBe('Custom Title');
        expect(ctx.description).toBe('Custom Description');
        done();
      });
    });

    it('should hide empty state', (done) => {
      service.show('test', 'conversations');
      service.hide('test');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.isVisible).toBe(false);
        done();
      });
    });

    it('should toggle visibility', (done) => {
      service.setContext('test', { variant: 'custom', isVisible: false });
      service.toggle('test');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.isVisible).toBe(true);

        service.toggle('test');
        service.getContext$('test').pipe(take(1)).subscribe(ctx2 => {
          expect(ctx2.isVisible).toBe(false);
          done();
        });
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state', (done) => {
      service.showLoading('test');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.isVisible).toBe(true);
        expect(ctx.isLoading).toBe(true);
        done();
      });
    });

    it('should hide loading state when hiding context', (done) => {
      service.showLoading('test');
      service.hide('test');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.isLoading).toBe(false);
        done();
      });
    });
  });

  describe('Data-based Updates', () => {
    it('should show empty state when data is empty', (done) => {
      service.updateFromData('test', [], 'conversations');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.isVisible).toBe(true);
        expect(ctx.variant).toBe('conversations');
        done();
      });
    });

    it('should hide empty state when data exists', (done) => {
      const data = [{ id: 1 }, { id: 2 }];
      service.updateFromData('test', data, 'conversations');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.isVisible).toBe(false);
        done();
      });
    });

    it('should handle null data as empty', (done) => {
      service.updateFromData('test', null as any, 'messages');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.isVisible).toBe(true);
        done();
      });
    });
  });

  describe('Global Empty State', () => {
    it('should report global empty when any context is visible', (done) => {
      service.show('context1', 'conversations');
      service.hide('context2');

      service.isGlobalEmpty$().pipe(take(1)).subscribe(isEmpty => {
        expect(isEmpty).toBe(true);
        done();
      });
    });

    it('should report not empty when no contexts visible', (done) => {
      service.show('context1', 'conversations');
      service.hide('context1');

      service.isGlobalEmpty$().pipe(take(1)).subscribe(isEmpty => {
        expect(isEmpty).toBe(false);
        done();
      });
    });

    it('should report not empty initially', (done) => {
      service.isGlobalEmpty$().pipe(take(1)).subscribe(isEmpty => {
        expect(isEmpty).toBe(false);
        done();
      });
    });
  });

  describe('Context Queries', () => {
    it('should check if context is empty', (done) => {
      service.show('test', 'conversations');

      service.isContextEmpty$('test').pipe(take(1)).subscribe(isEmpty => {
        expect(isEmpty).toBe(true);
        done();
      });
    });

    it('should return false for non-empty context', (done) => {
      service.hide('test');

      service.isContextEmpty$('test').pipe(take(1)).subscribe(isEmpty => {
        expect(isEmpty).toBe(false);
        done();
      });
    });

    it('should get context value synchronously', () => {
      service.show('test', 'conversations');
      const context = service.getContextValue('test');

      expect(context).toBeTruthy();
      expect(context?.variant).toBe('conversations');
    });

    it('should return undefined for non-existent context', () => {
      const context = service.getContextValue('nonexistent');
      expect(context).toBeUndefined();
    });

    it('should check if any visible context exists', () => {
      service.show('test', 'conversations');
      expect(service.hasVisibleContext()).toBe(true);

      service.hide('test');
      expect(service.hasVisibleContext()).toBe(false);
    });
  });

  describe('Clear Operations', () => {
    it('should clear specific context', () => {
      service.show('context1', 'conversations');
      service.show('context2', 'messages');

      service.clear('context1');

      expect(service.getContextValue('context1')).toBeUndefined();
      expect(service.getContextValue('context2')).toBeTruthy();
    });

    it('should clear all contexts', () => {
      service.show('context1', 'conversations');
      service.show('context2', 'messages');

      service.clearAll();

      expect(service.getAllContexts().size).toBe(0);
    });

    it('should update global empty after clear', (done) => {
      service.show('test', 'conversations');
      service.clearAll();

      service.isGlobalEmpty$().pipe(take(1)).subscribe(isEmpty => {
        expect(isEmpty).toBe(false);
        done();
      });
    });
  });

  describe('Multiple Contexts', () => {
    it('should manage multiple independent contexts', (done) => {
      service.show('conversations', 'conversations');
      service.show('messages', 'messages');
      service.hide('search');

      const contexts = service.getAllContexts();
      expect(contexts.size).toBeGreaterThanOrEqual(2);

      service.getContext$('conversations').pipe(take(1)).subscribe(ctx1 => {
        service.getContext$('messages').pipe(take(1)).subscribe(ctx2 => {
          expect(ctx1.variant).toBe('conversations');
          expect(ctx2.variant).toBe('messages');
          done();
        });
      });
    });

    it('should track context changes independently', (done) => {
      service.show('context1', 'conversations');
      service.show('context2', 'messages');

      let count = 0;
      service.getContext$('context1').subscribe(() => {
        count++;
      });

      service.setContext('context2', {
        variant: 'search',
        isVisible: true
      });

      setTimeout(() => {
        // Only context1 subscription should have fired once initially
        expect(count).toBe(1);
        done();
      }, 50);
    });
  });

  describe('Observable Streams', () => {
    it('should emit on context changes', (done) => {
      let emissions = 0;
      service.getContext$('test').subscribe(() => {
        emissions++;
      });

      service.show('test', 'conversations');

      setTimeout(() => {
        expect(emissions).toBeGreaterThan(1);
        done();
      }, 50);
    });

    it('should maintain subscription across updates', (done) => {
      const emissions: boolean[] = [];

      service.isContextEmpty$('test').subscribe(isEmpty => {
        emissions.push(isEmpty);
      });

      service.show('test', 'conversations');

      setTimeout(() => {
        service.hide('test');

        setTimeout(() => {
          expect(emissions.length).toBeGreaterThanOrEqual(2);
          done();
        }, 50);
      }, 50);
    });
  });

  describe('Variant Handling', () => {
    it('should support conversations variant', (done) => {
      service.show('test', 'conversations');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('conversations');
        done();
      });
    });

    it('should support messages variant', (done) => {
      service.show('test', 'messages');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('messages');
        done();
      });
    });

    it('should support search variant', (done) => {
      service.show('test', 'search');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('search');
        done();
      });
    });

    it('should support error variant', (done) => {
      service.show('test', 'error');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('error');
        done();
      });
    });

    it('should support network variant', (done) => {
      service.show('test', 'network');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('network');
        done();
      });
    });

    it('should support custom variant', (done) => {
      service.show('test', 'custom');

      service.getContext$('test').pipe(take(1)).subscribe(ctx => {
        expect(ctx.variant).toBe('custom');
        done();
      });
    });
  });
});
