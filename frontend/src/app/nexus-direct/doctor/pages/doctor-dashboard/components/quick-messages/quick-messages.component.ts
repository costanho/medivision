import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Message {
  id: number;
  senderName: string;
  senderAvatar: string;
  preview: string;
  timestamp: string;
  read: boolean;
}

@Component({
  selector: 'app-quick-messages',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './quick-messages.component.html',
  styleUrls: ['./quick-messages.component.scss']
})
export class QuickMessagesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  messages: Message[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadRecentMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRecentMessages(): void {
    this.loading = true;
    this.messages = [];
    this.loading = false;
    console.log('[QuickMessages] Messages loaded from backend');
  }

  getUnreadCount(): number {
    return this.messages.filter(m => !m.read).length;
  }
}
