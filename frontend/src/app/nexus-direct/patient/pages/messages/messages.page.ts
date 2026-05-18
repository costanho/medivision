import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessagesComponent } from '../../../pages/messages/messages.component';

@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [CommonModule, MessagesComponent],
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss']
})
export class MessagesPage implements OnInit, OnDestroy {
  // Call state
  callInProgress = false;
  currentCallId: string | null = null;
  currentParticipant = '';
  callType: 'video' | 'audio' = 'video';

  // Page state
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit() {
    console.log('[MessagesPage] Initialized');
    this.loadPageData();
  }

  loadPageData() {
    // Load any initial data if needed
    this.isLoading = false;
  }

  // Handle incoming video call
  onVideoCallStart(event: any) {
    this.callInProgress = true;
    this.currentCallId = event.callId;
    this.currentParticipant = event.participantName;
    this.callType = 'video';
    console.log('[MessagesPage] Video call started:', event);
  }

  // Handle incoming audio call
  onAudioCallStart(event: any) {
    this.callInProgress = true;
    this.currentCallId = event.callId;
    this.currentParticipant = event.participantName;
    this.callType = 'audio';
    console.log('[MessagesPage] Audio call started:', event);
  }

  // Handle call end
  onCallEnd() {
    this.callInProgress = false;
    this.currentCallId = null;
    this.currentParticipant = '';
    console.log('[MessagesPage] Call ended');
  }

  // Handle errors
  onError(error: string) {
    this.error = error;
    console.error('[MessagesPage] Error:', error);
  }

  clearError() {
    this.error = null;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
