/**
 * Search Component
 * 
 * Provides conversation search with:
 * - Real-time search with debounce
 * - Search history
 * - Result highlighting
 * - Filtering by field
 * - Loading states
 * - Empty states
 */

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchResult, Conversation } from '@shared/services/search.service';
import { HighlightPipe } from '@shared/pipes/highlight.pipe';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HighlightPipe],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent implements OnInit {
  /**
   * Conversations to search
   */
  @Input() conversations: Conversation[] = [];

  /**
   * Placeholder text
   */
  @Input() placeholder: string = 'Search conversations...';

  /**
   * Show search history
   */
  @Input() showHistory: boolean = true;

  /**
   * Max history items to show
   */
  @Input() maxHistory: number = 5;

  /**
   * Search result selected
   */
  @Output() resultSelected = new EventEmitter<SearchResult<Conversation>>();

  /**
   * Search state
   */
  @Output() searchStateChange = new EventEmitter<{ query: string; results: SearchResult<Conversation>[] }>();

  /**
   * Observables
   */
  results$: Observable<SearchResult<Conversation>[]>;
  history$: Observable<string[]>;
  isSearching$: Observable<boolean>;

  /**
   * Component state
   */
  searchQuery = '';
  showHistoryPanel = false;

  @ViewChild('searchInput') searchInput!: ElementRef;

  constructor(private searchService: SearchService) {
    this.results$ = this.searchService.getResults$();
    this.history$ = this.searchService.getSearchHistory$();
    this.isSearching$ = new Observable(observer => {
      this.searchService.getSearchState$().subscribe(state => {
        observer.next(state.isSearching);
      });
    });
  }

  ngOnInit() {
    // Set conversations in service
    this.searchService.setConversations(this.conversations);
  }

  /**
   * Handle search input
   */
  onSearch(query: string) {
    this.searchQuery = query;
    this.searchService.searchConversations(query);

    // Emit search state
    this.searchService.getResults$().subscribe(results => {
      this.searchStateChange.emit({ query, results });
    });
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchQuery = '';
    this.showHistoryPanel = false;
    this.searchService.clearSearch();
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  /**
   * Select search result
   */
  selectResult(result: SearchResult<Conversation>) {
    this.resultSelected.emit(result);
    this.showHistoryPanel = false;
  }

  /**
   * Use history item
   */
  useHistory(query: string) {
    this.searchQuery = query;
    this.onSearch(query);
  }

  /**
   * Remove from history
   */
  removeFromHistory(query: string, event: Event) {
    event.stopPropagation();
    this.searchService.removeFromHistory(query);
  }

  /**
   * Clear all history
   */
  clearAllHistory() {
    this.searchService.clearSearchHistory();
  }

  /**
   * Show history panel
   */
  showHistory() {
    this.showHistoryPanel = this.showHistory && this.searchQuery.length === 0;
  }

  /**
   * Hide history panel
   */
  hideHistory() {
    this.showHistoryPanel = false;
  }

  /**
   * Get matched fields display
   */
  getMatchedFields(fields: string[]): string {
    return fields.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ');
  }

  /**
   * Get first highlight context
   */
  getHighlightContext(highlights: string[]): string {
    return highlights[0] || '';
  }
}
