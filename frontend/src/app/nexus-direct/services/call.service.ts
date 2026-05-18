import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { WebSocketService } from '../../services/messaging/websocket.service';

export interface CallInitiateRequest {
  callType: 'ONE_TO_ONE' | 'ONE_TO_MANY';
  recipientIds: number[];
}

export interface CallResponse {
  success: boolean;
  data?: any;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CallService implements OnDestroy {
  // Observable streams for call events
  private incomingCallSubject = new BehaviorSubject<any>(null);
  private activeCallSubject = new BehaviorSubject<any>(null);
  private callStatusSubject = new BehaviorSubject<string>('idle');

  incomingCall$ = this.incomingCallSubject.asObservable();
  activeCall$ = this.activeCallSubject.asObservable();
  callStatus$ = this.callStatusSubject.asObservable();

  private destroy$ = new Subject<void>();

  constructor(private apiService: ApiService, private webSocketService: WebSocketService) {
    this.initializeCallListener();
  }

  /**
   * Initiate a one-to-one call to a recipient
   */
  initiateCall(recipientId: number): Observable<any> {
    const request: CallInitiateRequest = {
      callType: 'ONE_TO_ONE',
      recipientIds: [recipientId]
    };

    return this.apiService.post<any>('/calls/initiate', request);
  }

  /**
   * Accept an incoming call
   */
  acceptCall(sessionId: string): Observable<any> {
    return this.apiService.post<any>(`/calls/${sessionId}/accept`, {});
  }

  /**
   * Reject an incoming call
   */
  rejectCall(sessionId: string): Observable<any> {
    return this.apiService.post<any>(`/calls/${sessionId}/reject`, {});
  }

  /**
   * End an active call
   */
  endCall(sessionId: string): Observable<any> {
    return this.apiService.post<any>(`/calls/${sessionId}/end`, {});
  }

  /**
   * Get call session details
   */
  getCall(sessionId: string): Observable<any> {
    return this.apiService.get<any>(`/calls/${sessionId}`);
  }

  /**
   * Get user's call history
   */
  getCallHistory(page: number = 0, size: number = 10): Observable<any> {
    return this.apiService.get<any>('/calls/history', { page, size });
  }

  /**
   * Set incoming call (for WebSocket listener)
   */
  setIncomingCall(callData: any): void {
    this.incomingCallSubject.next(callData);
    this.callStatusSubject.next('ringing');
  }

  /**
   * Set active call
   */
  setActiveCall(callData: any): void {
    this.activeCallSubject.next(callData);
    this.callStatusSubject.next('active');
  }

  /**
   * Clear incoming call
   */
  clearIncomingCall(): void {
    this.incomingCallSubject.next(null);
  }

  /**
   * Clear active call
   */
  clearActiveCall(): void {
    this.activeCallSubject.next(null);
    this.callStatusSubject.next('idle');
  }

  /**
   * Initialize WebSocket listener for incoming calls
   * Listens to WebSocket service for real-time call notifications
   */
  private initializeCallListener(): void {
    // Listen for call events from WebSocket
    this.webSocketService.callEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe((callEvent: any) => {
        console.log('[CallService] Call event received:', callEvent);

        if (!callEvent) return;

        switch (callEvent.eventType) {
          case 'call_incoming':
            // New incoming call notification
            this.incomingCallSubject.next({
              sessionId: callEvent.sessionId,
              callerId: callEvent.callerId,
              callerName: callEvent.callerName,
              timestamp: new Date()
            });
            this.callStatusSubject.next('ringing');
            break;

          case 'call_accepted':
            // Call was accepted
            this.callStatusSubject.next('active');
            break;

          case 'call_rejected':
            // Call was rejected
            this.incomingCallSubject.next(null);
            this.callStatusSubject.next('idle');
            break;

          case 'call_ended':
            // Call ended
            this.activeCallSubject.next(null);
            this.incomingCallSubject.next(null);
            this.callStatusSubject.next('idle');
            break;

          default:
            console.log('[CallService] Unknown call event type:', callEvent.eventType);
        }
      });
  }

  /**
   * Get current call status
   */
  getCurrentStatus(): string {
    return this.callStatusSubject.getValue();
  }

  /**
   * Get active call details
   */
  getActiveCallDetails(): any {
    return this.activeCallSubject.getValue();
  }

  /**
   * Get incoming call details
   */
  getIncomingCallDetails(): any {
    return this.incomingCallSubject.getValue();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
