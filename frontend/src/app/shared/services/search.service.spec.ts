/**
 * Search Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';
import { take } from 'rxjs/operators';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SearchService]
    });
    service = TestBed.inject(SearchService);
  });

  describe('Conversation Search', () => {
    it('should search conversations by name', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. John Smith', email: 'john@example.com' },
        { id: 2, name: 'Dr. Jane Doe', email: 'jane@example.com' }
      ];

      service.setConversations(conversations);
      service.searchConversations('John');

      service.getResults$().pipe(take(1)).subscribe(results => {
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.name).toContain('John');
        done();
      });
    });

    it('should handle empty search results', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. Smith', email: 'smith@example.com' }
      ];

      service.setConversations(conversations);
      service.searchConversations('NonExistent');

      setTimeout(() => {
        service.getResults$().pipe(take(1)).subscribe(results => {
          expect(results.length).toBe(0);
          done();
        });
      }, 400);
    });

    it('should be case-insensitive', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. John Smith', email: 'john@example.com' }
      ];

      service.setConversations(conversations);
      service.searchConversations('JOHN');

      service.getResults$().pipe(take(1)).subscribe(results => {
        expect(results.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should search by email', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. Smith', email: 'smith@hospital.com' }
      ];

      service.setConversations(conversations);
      service.searchConversations('hospital');

      service.getResults$().pipe(take(1)).subscribe(results => {
        expect(results.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should search by specialty', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. Smith', specialty: 'Cardiology' }
      ];

      service.setConversations(conversations);
      service.searchConversations('Cardiology');

      service.getResults$().pipe(take(1)).subscribe(results => {
        expect(results.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should rank name matches higher than email', (done) => {
      const conversations = [
        { id: 1, name: 'John Smith', email: 'other@example.com' },
        { id: 2, name: 'Other Person', email: 'john@example.com' }
      ];

      service.setConversations(conversations);
      service.searchConversations('John');

      service.getResults$().pipe(take(1)).subscribe(results => {
        expect(results[0].item.id).toBe(1); // Name match ranks higher
        done();
      });
    });
  });

  describe('Search History', () => {
    it('should track search history', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. Smith' }
      ];

      service.setConversations(conversations);
      service.searchConversations('Smith');

      setTimeout(() => {
        service.getSearchHistory$().pipe(take(1)).subscribe(history => {
          expect(history.length).toBeGreaterThan(0);
          expect(history[0]).toBe('Smith');
          done();
        });
      }, 400);
    });

    it('should not add unsuccessful searches to history', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. Smith' }
      ];

      service.setConversations(conversations);
      service.searchConversations('NonExistent');

      setTimeout(() => {
        service.getSearchHistory$().pipe(take(1)).subscribe(history => {
          expect(history.length).toBe(0);
          done();
        });
      }, 400);
    });

    it('should remove duplicates from history', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. Smith' }
      ];

      service.setConversations(conversations);
      service.searchConversations('Smith');

      setTimeout(() => {
        service.searchConversations('Smith');

        setTimeout(() => {
          service.getSearchHistory$().pipe(take(1)).subscribe(history => {
            expect(history.filter(h => h === 'Smith').length).toBe(1);
            done();
          });
        }, 400);
      }, 400);
    });

    it('should clear history', (done) => {
      service.clearSearchHistory();

      service.getSearchHistory$().pipe(take(1)).subscribe(history => {
        expect(history.length).toBe(0);
        done();
      });
    });
  });

  describe('Message Search', () => {
    it('should search messages in conversation', () => {
      const messages = [
        { id: 1, conversationId: 1, content: 'Hello there', sender: 'User', timestamp: new Date() },
        { id: 2, conversationId: 1, content: 'Hi, how are you?', sender: 'Doctor', timestamp: new Date() }
      ];

      service.setMessages(messages);
      const results = service.searchMessages(1, 'Hello');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.content).toContain('Hello');
    });

    it('should handle empty message results', () => {
      const messages = [
        { id: 1, conversationId: 1, content: 'Hello', sender: 'User', timestamp: new Date() }
      ];

      service.setMessages(messages);
      const results = service.searchMessages(1, 'NonExistent');

      expect(results.length).toBe(0);
    });

    it('should sort messages by relevance', () => {
      const messages = [
        { id: 1, conversationId: 1, content: 'Hello world', sender: 'User', timestamp: new Date() },
        { id: 2, conversationId: 1, content: 'Hello', sender: 'Doctor', timestamp: new Date() }
      ];

      service.setMessages(messages);
      const results = service.searchMessages(1, 'Hello');

      expect(results[0].score).toBeGreaterThan(results[1].score);
    });
  });

  describe('Search Debounce', () => {
    it('should debounce search queries', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. Smith' }
      ];

      service.setConversations(conversations);

      service.searchConversations('S');
      service.searchConversations('Sm');
      service.searchConversations('Smi');
      service.searchConversations('Smith');

      setTimeout(() => {
        service.getResults$().pipe(take(1)).subscribe(results => {
          // Should only search for final query after debounce
          expect(results.length).toBeGreaterThan(0);
          done();
        });
      }, 400);
    });
  });

  describe('Clear Search', () => {
    it('should clear search results', (done) => {
      const conversations = [
        { id: 1, name: 'Dr. Smith' }
      ];

      service.setConversations(conversations);
      service.searchConversations('Smith');

      setTimeout(() => {
        service.clearSearch();

        setTimeout(() => {
          service.getResults$().pipe(take(1)).subscribe(results => {
            expect(results.length).toBe(0);
            done();
          });
        }, 100);
      }, 400);
    });
  });

  describe('Search Scoring', () => {
    it('should boost exact word matches', (done) => {
      const conversations = [
        { id: 1, name: 'John Anderson' },
        { id: 2, name: 'Johnny Smith' }
      ];

      service.setConversations(conversations);
      service.searchConversations('John');

      service.getResults$().pipe(take(1)).subscribe(results => {
        expect(results[0].item.id).toBe(1); // Exact word match
        done();
      });
    });

    it('should calculate fuzzy match scores', (done) => {
      const conversations = [
        { id: 1, name: 'Cardiology' },
        { id: 2, name: 'Cardiologist' }
      ];

      service.setConversations(conversations);
      service.searchConversations('card');

      service.getResults$().pipe(take(1)).subscribe(results => {
        expect(results.length).toBeGreaterThan(0);
        done();
      });
    });
  });
});
