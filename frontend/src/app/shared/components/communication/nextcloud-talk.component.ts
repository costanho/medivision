import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NextcloudTalkService } from '../../../core/services/nextcloud-talk.service';

interface Conversation {
  id: string;
  displayName: string;
  type: 'oneToOne' | 'group' | 'public';
  unreadMessages?: number;
}

interface Message {
  id: string;
  actorDisplayName: string;
  message: string;
  creationTimestamp: number;
  isOwn: boolean;
}

@Component({
  selector: 'app-nextcloud-talk',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nextcloud-talk.component.html',
  styleUrls: ['./nextcloud-talk.component.scss']
})
export class NextcloudTalkComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;
  messages: Message[] = [];
  messageText = '';
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();
  private currentUserId = '';

  constructor(private talkService: NextcloudTalkService) {}

  ngOnInit() {
    this.loadConversations();
    this.subscribeToActiveConversation();
  }

  loadConversations() {
    this.isLoading = true;
    this.talkService.getConversations$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations) => {
          this.conversations = conversations;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load conversations';
          this.isLoading = false;
          console.error('Error loading conversations:', err);
        }
      });
  }

  subscribeToActiveConversation() {
    this.talkService.getActiveConversation$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((conversation) => {
        if (conversation) {
          this.activeConversation = conversation;
          this.loadMessages();
        }
      });
  }

  selectConversation(conversation: Conversation) {
    this.activeConversation = conversation;
    this.loadMessages();
  }

  loadMessages() {
    if (!this.activeConversation) return;

    this.isLoading = true;
    this.talkService.getMessages(this.activeConversation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = messages.map((msg) => ({
            id: msg.id,
            actorDisplayName: msg.actorDisplayName,
            message: msg.message,
            creationTimestamp: msg.creationTimestamp * 1000,
            isOwn: msg.actorId === this.currentUserId
          }));
          this.isLoading = false;
          this.error = null;
          // Scroll to bottom
          setTimeout(() => {
            const messagesList = document.querySelector('.messages-list');
            if (messagesList) {
              messagesList.scrollTop = messagesList.scrollHeight;
            }
          }, 0);
        },
        error: (err) => {
          this.error = 'Failed to load messages';
          this.isLoading = false;
          console.error('Error loading messages:', err);
        }
      });
  }

  sendMessage() {
    if (!this.messageText.trim() || !this.activeConversation) return;

    const messageToSend = this.messageText;
    this.messageText = '';

    this.talkService.sendMessage(this.activeConversation.id, messageToSend)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          this.messages.push({
            id: message.id,
            actorDisplayName: message.actorDisplayName,
            message: message.message,
            creationTimestamp: message.creationTimestamp * 1000,
            isOwn: true
          });
          this.error = null;
          // Scroll to bottom
          setTimeout(() => {
            const messagesList = document.querySelector('.messages-list');
            if (messagesList) {
              messagesList.scrollTop = messagesList.scrollHeight;
            }
          }, 0);
        },
        error: (err) => {
          this.messageText = messageToSend; // Restore message on error
          this.error = 'Failed to send message';
          console.error('Error sending message:', err);
        }
      });
  }

  startVideoCall() {
    if (!this.activeConversation) return;

    this.talkService.startCall(this.activeConversation.id, 'video')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Video call started');
          // TODO: Launch video call modal/component
        },
        error: (err) => {
          this.error = 'Failed to start call';
          console.error('Failed to start call:', err);
        }
      });
  }

  startAudioCall() {
    if (!this.activeConversation) return;

    this.talkService.startCall(this.activeConversation.id, 'audio')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Audio call started');
        },
        error: (err) => {
          this.error = 'Failed to start call';
          console.error('Failed to start call:', err);
        }
      });
  }

  clearError() {
    this.error = null;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
