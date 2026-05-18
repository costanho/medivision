/**
 * Messages Component
 * Displays a list of messages from the messaging service
 *
 * Features:
 * - Load messages from MessagingService
 * - Display messages with pagination
 * - Filter messages by conversation
 * - Search through messages
 * - Real-time message updates
 * - Show loading and empty states
 */

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MessagingService } from '../../messaging.service';
import { Message } from '../../models';
import { ChatMessageItemComponent } from '../chat/chat-message-item/chat-message-item.component';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatMessageItemComponent],
  template: `
    <div class="messages-container">
      <!-- Header -->
      <div class="messages-header">
        <h2>Messages</h2>
        <p class="subtitle">{{ messages.length }} messages</p>
      </div>

      <!-- Search & Filter -->
      <div class="messages-controls">
        <div class="search-box">
          <input
            type="text"
            placeholder="Search messages..."
            [(ngModel)]="searchQuery"
            (input)="onSearchChange()"
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>

        <div class="filter-buttons">
          <button
            (click)="filterByType('all')"
            [class.active]="selectedFilter === 'all'"
            class="filter-btn"
          >
            All
          </button>
          <button
            (click)="filterByType('unread')"
            [class.active]="selectedFilter === 'unread'"
            class="filter-btn"
          >
            Unread
          </button>
          <button
            (click)="filterByType('read')"
            [class.active]="selectedFilter === 'read'"
            class="filter-btn"
          >
            Read
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading messages...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && filteredMessages.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>No messages</h3>
        <p *ngIf="searchQuery">No messages match your search</p>
        <p *ngIf="!searchQuery">Start a conversation to see messages</p>
      </div>

      <!-- Messages List -->
      <div *ngIf="!loading && filteredMessages.length > 0" class="messages-list">
        <!-- Message Group by Date -->
        <div *ngFor="let dateGroup of groupedMessages">
          <!-- Date Separator -->
          <div class="date-separator">
            <span class="date-text">{{ formatDate(dateGroup.date) }}</span>
          </div>

          <!-- Messages for this date -->
          <div *ngFor="let message of dateGroup.messages" class="message-item">
            <app-chat-message-item
              [message]="message"
              [isSent]="isSentMessage(message)"
              (messageViewed)="onMessageViewed($event)"
            ></app-chat-message-item>
          </div>
        </div>
      </div>

      <!-- Pagination Info -->
      <div *ngIf="!loading && filteredMessages.length > 0" class="pagination-info">
        <p>Showing {{ filteredMessages.length }} of {{ messages.length }} messages</p>
      </div>
    </div>
  `,
  styles: [`
    .messages-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f8f9fa;
      border-radius: 12px;
      overflow: hidden;
    }

    .messages-header {
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }

      .subtitle {
        margin: 5px 0 0 0;
        font-size: 14px;
        opacity: 0.9;
      }
    }

    .messages-controls {
      padding: 20px;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: center;

      .search-box {
        flex: 1;
        min-width: 250px;
        position: relative;
        display: flex;
        align-items: center;

        .search-input {
          width: 100%;
          padding: 10px 15px 10px 35px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s ease;

          &:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }
        }

        .search-icon {
          position: absolute;
          left: 10px;
          color: #999;
          font-size: 16px;
          pointer-events: none;
        }
      }

      .filter-buttons {
        display: flex;
        gap: 8px;

        .filter-btn {
          padding: 10px 16px;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.3s ease;
          white-space: nowrap;

          &:hover {
            border-color: #667eea;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
          }

          &.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: transparent;
          }
        }
      }
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 15px;

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 15px;

      .empty-icon {
        font-size: 64px;
        opacity: 0.5;
      }

      h3 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: #999;
      }
    }

    .messages-list {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;

      .date-separator {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 10px 0;

        .date-text {
          background: white;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 12px;
          color: #999;
          border: 1px solid #e0e0e0;
        }
      }

      .message-item {
        animation: fadeIn 0.3s ease;
      }
    }

    .pagination-info {
      padding: 15px 20px;
      background: white;
      border-top: 1px solid #e0e0e0;
      font-size: 13px;
      color: #666;
      text-align: center;

      p {
        margin: 0;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .messages-controls {
        flex-direction: column;

        .search-box {
          min-width: auto;
        }

        .filter-buttons {
          width: 100%;
          justify-content: space-between;
        }
      }

      .messages-list {
        padding: 15px;
        gap: 15px;
      }
    }

    @media (prefers-color-scheme: dark) {
      .messages-container {
        background: #1e1e1e;
      }

      .messages-controls {
        background: #2d2d2d;
        border-color: #444;

        .search-input {
          background: #3d3d3d;
          color: #fff;
          border-color: #444;

          &:focus {
            border-color: #667eea;
          }
        }

        .filter-btn {
          background: #3d3d3d;
          border-color: #444;
          color: #fff;

          &:hover {
            border-color: #667eea;
          }
        }
      }

      .empty-state h3 {
        color: #fff;
      }

      .messages-list {
        .date-text {
          background: #3d3d3d;
          color: #aaa;
          border-color: #444;
        }
      }

      .pagination-info {
        background: #2d2d2d;
        border-color: #444;
        color: #aaa;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagesComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  filteredMessages: Message[] = [];
  groupedMessages: Array<{ date: string; messages: Message[] }> = [];

  searchQuery = '';
  selectedFilter: 'all' | 'unread' | 'read' = 'all';
  loading = true;

  private destroy$ = new Subject<void>();
  private messagingService = inject(MessagingService);

  ngOnInit(): void {
    this.loadMessages();
    this.subscribeToMessageUpdates();
  }

  /**
   * Load messages from service
   */
  private loadMessages(): void {
    console.log('[MessagesComponent] Loading messages...');
    this.loading = true;

    this.messagingService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          console.log('[MessagesComponent] Messages loaded:', messages.length);
          this.messages = messages || [];
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          console.error('[MessagesComponent] Failed to load messages:', err);
          this.loading = false;
        }
      });
  }

  /**
   * Subscribe to real-time message updates
   */
  private subscribeToMessageUpdates(): void {
    this.messagingService.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          console.log('[MessagesComponent] New message received:', event);
          // Reload messages when new message arrives
          this.loadMessages();
        }
      });
  }

  /**
   * Apply search and filter to messages
   */
  private applyFilters(): void {
    let filtered = this.messages;

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.content.toLowerCase().includes(query) ||
        (msg.senderName && msg.senderName.toLowerCase().includes(query))
      );
    }

    // Filter by read status
    if (this.selectedFilter === 'unread') {
      filtered = filtered.filter(msg => !msg.isRead);
    } else if (this.selectedFilter === 'read') {
      filtered = filtered.filter(msg => msg.isRead);
    }

    this.filteredMessages = filtered;
    this.groupMessagesByDate();
  }

  /**
   * Group messages by date
   */
  private groupMessagesByDate(): void {
    const groups: Map<string, Message[]> = new Map();

    this.filteredMessages.forEach(msg => {
      const date = this.formatDate(msg.timestamp);
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(msg);
    });

    this.groupedMessages = Array.from(groups).map(([date, messages]) => ({
      date,
      messages: messages.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    }));
  }

  /**
   * Check if message was sent by current user
   */
  isSentMessage(message: Message): boolean {
    // In a real app, compare with current user ID
    // For now, we'll use a heuristic: if senderEmail matches, it's sent
    return message.senderEmail === 'currentUser@example.com' || false;
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  /**
   * Handle search input
   */
  onSearchChange(): void {
    this.applyFilters();
  }

  /**
   * Filter messages by type
   */
  filterByType(type: 'all' | 'unread' | 'read'): void {
    this.selectedFilter = type;
    this.applyFilters();
  }

  /**
   * Handle message viewed event
   */
  onMessageViewed(messageId: number): void {
    console.log('[MessagesComponent] Message viewed:', messageId);
    // Mark message as read
    this.messagingService.markMessageAsRead(messageId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => console.log('[MessagesComponent] Message marked as read'),
      error: (err) => console.error('[MessagesComponent] Failed to mark message as read:', err)
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
