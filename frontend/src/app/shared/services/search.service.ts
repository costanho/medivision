/**
 * Search Service
 * 
 * Provides comprehensive search functionality for conversations and messages
 * Features:
 * - Conversation search by name, email, specialty
 * - Message search with context
 * - Debounced search with cancellation
 * - Search history tracking
 * - Result highlighting support
 * - Case-insensitive matching
 * - Fuzzy search support
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

export interface Conversation {
  id: number;
  name: string;
  email?: string;
  specialty?: string;
  lastMessage?: string;
  timestamp?: Date;
  avatar?: string;
}

export interface Message {
  id: number;
  conversationId: number;
  content: string;
  sender: string;
  timestamp: Date;
}

export interface SearchResult<T> {
  item: T;
  score: number;
  highlight?: string[];
  matchedFields?: string[];
}

export interface SearchState {
  query: string;
  isSearching: boolean;
  results: SearchResult<Conversation>[];
  messageResults: SearchResult<Message>[];
  totalResults: number;
  executionTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  /**
   * Current search state
   */
  private searchState$ = new BehaviorSubject<SearchState>({
    query: '',
    isSearching: false,
    results: [],
    messageResults: [],
    totalResults: 0,
    executionTime: 0
  });

  /**
   * Search history
   */
  private searchHistory$ = new BehaviorSubject<string[]>([]);

  /**
   * Search query stream
   */
  private searchQuery$ = new Subject<string>();

  /**
   * All conversations for searching
   */
  private conversations: Conversation[] = [];

  /**
   * All messages for searching
   */
  private messages: Message[] = [];

  /**
   * Destroy subscription
   */
  private destroy$ = new Subject<void>();

  /**
   * Max search history items
   */
  private readonly MAX_HISTORY = 10;

  /**
   * Min query length
   */
  private readonly MIN_QUERY_LENGTH = 2;

  constructor() {
    this.setupSearchDebounce();
    this.loadSearchHistory();
  }

  /**
   * Set conversations for searching
   */
  setConversations(conversations: Conversation[]): void {
    this.conversations = conversations;
  }

  /**
   * Set messages for searching
   */
  setMessages(messages: Message[]): void {
    this.messages = messages;
  }

  /**
   * Search conversations
   */
  searchConversations(query: string): void {
    if (query.length < this.MIN_QUERY_LENGTH && query.length > 0) {
      return;
    }

    this.searchQuery$.next(query);
  }

  /**
   * Get search state observable
   */
  getSearchState$(): Observable<SearchState> {
    return this.searchState$.asObservable();
  }

  /**
   * Get search results observable
   */
  getResults$(): Observable<SearchResult<Conversation>[]> {
    return new Observable(observer => {
      this.searchState$.subscribe(state => {
        observer.next(state.results);
      });
    });
  }

  /**
   * Get message search results
   */
  getMessageResults$(): Observable<SearchResult<Message>[]> {
    return new Observable(observer => {
      this.searchState$.subscribe(state => {
        observer.next(state.messageResults);
      });
    });
  }

  /**
   * Get search history
   */
  getSearchHistory$(): Observable<string[]> {
    return this.searchHistory$.asObservable();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery$.next('');
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory$.next([]);
    localStorage.removeItem('searchHistory');
  }

  /**
   * Remove item from search history
   */
  removeFromHistory(query: string): void {
    const history = this.searchHistory$.value.filter(h => h !== query);
    this.searchHistory$.next(history);
    this.saveSearchHistory(history);
  }

  /**
   * Search messages in conversation
   */
  searchMessages(conversationId: number, query: string): SearchResult<Message>[] {
    if (!query || query.length < this.MIN_QUERY_LENGTH) {
      return [];
    }

    const results: SearchResult<Message>[] = [];

    const conversationMessages = this.messages.filter(m => m.conversationId === conversationId);

    for (const message of conversationMessages) {
      const score = this.calculateMessageScore(message, query);
      if (score > 0) {
        results.push({
          item: message,
          score,
          highlight: this.getHighlightedMatches(message.content, query),
          matchedFields: ['content']
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Setup search debounce
   */
  private setupSearchDebounce(): void {
    this.searchQuery$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.performSearch(query);
      });
  }

  /**
   * Perform actual search
   */
  private performSearch(query: string): void {
    const startTime = performance.now();

    // Update searching state
    const currentState = this.searchState$.value;
    this.searchState$.next({
      ...currentState,
      isSearching: true,
      query
    });

    // Clear search if query is empty
    if (!query || query.length === 0) {
      this.searchState$.next({
        query: '',
        isSearching: false,
        results: [],
        messageResults: [],
        totalResults: 0,
        executionTime: 0
      });
      return;
    }

    // Perform search
    const results = this.searchConversationsInternal(query);

    const executionTime = performance.now() - startTime;

    // Update state
    this.searchState$.next({
      query,
      isSearching: false,
      results,
      messageResults: [],
      totalResults: results.length,
      executionTime
    });

    // Add to history
    if (results.length > 0) {
      this.addToHistory(query);
    }
  }

  /**
   * Search conversations internally
   */
  private searchConversationsInternal(query: string): SearchResult<Conversation>[] {
    const results: SearchResult<Conversation>[] = [];
    const normalizedQuery = query.toLowerCase();

    for (const conversation of this.conversations) {
      const score = this.calculateConversationScore(conversation, normalizedQuery);
      if (score > 0) {
        const matchedFields = this.getMatchedFields(conversation, normalizedQuery);
        results.push({
          item: conversation,
          score,
          highlight: this.getHighlightedMatches(conversation.name, query),
          matchedFields
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate conversation match score
   */
  private calculateConversationScore(conversation: Conversation, query: string): number {
    let score = 0;

    // Name match (highest priority)
    if (conversation.name.toLowerCase().includes(query)) {
      score += 100;
      // Boost for exact word match
      if (conversation.name.toLowerCase().split(' ').some(word => word.startsWith(query))) {
        score += 50;
      }
    }

    // Email match
    if (conversation.email?.toLowerCase().includes(query)) {
      score += 50;
    }

    // Specialty match
    if (conversation.specialty?.toLowerCase().includes(query)) {
      score += 30;
    }

    // Fuzzy match on name
    if (score === 0) {
      const fuzzyScore = this.calculateFuzzyScore(conversation.name.toLowerCase(), query);
      score = fuzzyScore * 20;
    }

    return score;
  }

  /**
   * Calculate message match score
   */
  private calculateMessageScore(message: Message, query: string): number {
    const normalizedQuery = query.toLowerCase();
    const normalizedContent = message.content.toLowerCase();

    let score = 0;

    // Exact word match
    if (normalizedContent.includes(normalizedQuery)) {
      score += 100;
      // Count occurrences
      const matches = normalizedContent.match(new RegExp(normalizedQuery, 'g'));
      if (matches) {
        score += matches.length * 10;
      }
    }

    // Fuzzy match
    if (score === 0) {
      score = this.calculateFuzzyScore(normalizedContent, normalizedQuery) * 20;
    }

    return score;
  }

  /**
   * Calculate fuzzy match score (0-1)
   */
  private calculateFuzzyScore(text: string, query: string): number {
    let score = 0;
    let textIndex = 0;

    for (let i = 0; i < query.length; i++) {
      const charIndex = text.indexOf(query[i], textIndex);
      if (charIndex === -1) {
        return 0;
      }
      // Boost for consecutive characters
      if (charIndex === textIndex) {
        score += 1;
      } else {
        score += 0.5;
      }
      textIndex = charIndex + 1;
    }

    return score / query.length;
  }

  /**
   * Get fields that matched
   */
  private getMatchedFields(conversation: Conversation, query: string): string[] {
    const fields: string[] = [];

    if (conversation.name.toLowerCase().includes(query)) {
      fields.push('name');
    }
    if (conversation.email?.toLowerCase().includes(query)) {
      fields.push('email');
    }
    if (conversation.specialty?.toLowerCase().includes(query)) {
      fields.push('specialty');
    }

    return fields;
  }

  /**
   * Get highlighted matches in text
   */
  private getHighlightedMatches(text: string, query: string): string[] {
    const matches: string[] = [];
    const regex = new RegExp(`(.{0,30}${query}.{0,30})`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }

    return matches;
  }

  /**
   * Add query to search history
   */
  private addToHistory(query: string): void {
    const history = this.searchHistory$.value;
    const filtered = history.filter(h => h !== query);
    const newHistory = [query, ...filtered].slice(0, this.MAX_HISTORY);

    this.searchHistory$.next(newHistory);
    this.saveSearchHistory(newHistory);
  }

  /**
   * Save search history to localStorage
   */
  private saveSearchHistory(history: string[]): void {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(history));
    } catch {
      // Handle localStorage quota exceeded
    }
  }

  /**
   * Load search history from localStorage
   */
  private loadSearchHistory(): void {
    try {
      const history = localStorage.getItem('searchHistory');
      if (history) {
        this.searchHistory$.next(JSON.parse(history));
      }
    } catch {
      // Handle parse error
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
