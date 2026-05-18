import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { CallSession, CallParticipant } from '../models/call.model';
import { LocalCallState, ParticipantWithState, CallQualityMetrics } from '../models/call-state.enum';

/**
 * Call State Service
 * Centralized RxJS state management for the entire call lifecycle
 * Uses BehaviorSubjects for current state and Subjects for events
 *
 * Responsibilities:
 * - Track call state (IDLE, CALLING, CONNECTED, etc.)
 * - Manage participants and their streams
 * - Store local and remote media streams
 * - Track call duration and quality metrics
 * - Handle errors and notifications
 */

@Injectable({
  providedIn: 'root'
})
export class CallStateService {
  // ==================== OBSERVABLES - CURRENT STATE ====================

  private callStateSubject$ = new BehaviorSubject<LocalCallState>(LocalCallState.IDLE);
  public callState$ = this.callStateSubject$.asObservable();

  private currentCallSubject$ = new BehaviorSubject<CallSession | null>(null);
  public currentCall$ = this.currentCallSubject$.asObservable();

  private participantsSubject$ = new BehaviorSubject<Map<number, ParticipantWithState>>(new Map());
  public participants$ = this.participantsSubject$.asObservable();

  private localStreamSubject$ = new BehaviorSubject<MediaStream | null>(null);
  public localStream$ = this.localStreamSubject$.asObservable();

  private remoteStreamsSubject$ = new BehaviorSubject<Map<number, MediaStream>>(new Map());
  public remoteStreams$ = this.remoteStreamsSubject$.asObservable();

  private callDurationSubject$ = new BehaviorSubject<number>(0);
  public callDuration$ = this.callDurationSubject$.asObservable();

  private qualityMetricsSubject$ = new BehaviorSubject<Map<number, CallQualityMetrics>>(new Map());
  public qualityMetrics$ = this.qualityMetricsSubject$.asObservable();

  private isAudioEnabledSubject$ = new BehaviorSubject<boolean>(true);
  public isAudioEnabled$ = this.isAudioEnabledSubject$.asObservable();

  private isVideoEnabledSubject$ = new BehaviorSubject<boolean>(true);
  public isVideoEnabled$ = this.isVideoEnabledSubject$.asObservable();

  private isScreenSharingSubject$ = new BehaviorSubject<boolean>(false);
  public isScreenSharing$ = this.isScreenSharingSubject$.asObservable();

  private errorSubject$ = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject$.asObservable();

  // ==================== EVENTS ====================

  public incomingCallEvent$ = new Subject<CallSession>();
  public callRejectedEvent$ = new Subject<string>();
  public participantJoinedEvent$ = new Subject<ParticipantWithState>();
  public participantLeftEvent$ = new Subject<number>();
  public connectionErrorEvent$ = new Subject<string>();
  public callEndedEvent$ = new Subject<number>();  // Call duration

  // ==================== CONSULTATION DATA ====================

  private consultationNotesSubject$ = new BehaviorSubject<string>('');
  public consultationNotes$ = this.consultationNotesSubject$.asObservable();

  private callDocumentsSubject$ = new BehaviorSubject<any[]>([]);
  public callDocuments$ = this.callDocumentsSubject$.asObservable();

  // ==================== STATE SETTERS ====================

  /**
   * Set the current call state
   */
  setCallState(state: LocalCallState): void {
    this.callStateSubject$.next(state);
  }

  /**
   * Get current call state without subscribing
   */
  getCallState(): LocalCallState {
    return this.callStateSubject$.value;
  }

  /**
   * Set the current call session
   */
  setCurrentCall(call: CallSession | null): void {
    this.currentCallSubject$.next(call);
  }

  /**
   * Get current call session without subscribing
   */
  getCurrentCall(): CallSession | null {
    return this.currentCallSubject$.value;
  }

  /**
   * Set local media stream
   */
  setLocalStream(stream: MediaStream | null): void {
    this.localStreamSubject$.next(stream);
  }

  /**
   * Get local stream without subscribing
   */
  getLocalStream(): MediaStream | null {
    return this.localStreamSubject$.value;
  }

  /**
   * Add or update remote stream for a participant
   */
  addRemoteStream(userId: number, stream: MediaStream): void {
    const streams = this.remoteStreamsSubject$.value;
    streams.set(userId, stream);
    this.remoteStreamsSubject$.next(new Map(streams));
  }

  /**
   * Remove remote stream for a participant
   */
  removeRemoteStream(userId: number): void {
    const streams = this.remoteStreamsSubject$.value;
    streams.delete(userId);
    this.remoteStreamsSubject$.next(new Map(streams));
  }

  /**
   * Get remote stream for a specific user
   */
  getRemoteStream(userId: number): MediaStream | undefined {
    return this.remoteStreamsSubject$.value.get(userId);
  }

  /**
   * Add participant to the call
   */
  addParticipant(participant: ParticipantWithState): void {
    const participants = this.participantsSubject$.value;
    participants.set(participant.userId, participant);
    this.participantsSubject$.next(new Map(participants));
  }

  /**
   * Update participant status
   */
  updateParticipant(userId: number, updates: Partial<ParticipantWithState>): void {
    const participants = this.participantsSubject$.value;
    const participant = participants.get(userId);
    if (participant) {
      participants.set(userId, { ...participant, ...updates });
      this.participantsSubject$.next(new Map(participants));
    }
  }

  /**
   * Remove participant from the call
   */
  removeParticipant(userId: number): void {
    const participants = this.participantsSubject$.value;
    participants.delete(userId);
    this.participantsSubject$.next(new Map(participants));
  }

  /**
   * Get participant without subscribing
   */
  getParticipant(userId: number): ParticipantWithState | undefined {
    return this.participantsSubject$.value.get(userId);
  }

  /**
   * Get all participants as array
   */
  getParticipantsArray(): ParticipantWithState[] {
    return Array.from(this.participantsSubject$.value.values());
  }

  /**
   * Set call duration in seconds
   */
  setCallDuration(seconds: number): void {
    this.callDurationSubject$.next(seconds);
  }

  /**
   * Get call duration without subscribing
   */
  getCallDuration(): number {
    return this.callDurationSubject$.value;
  }

  /**
   * Update quality metrics for a participant
   */
  updateQualityMetrics(userId: number, metrics: CallQualityMetrics): void {
    const allMetrics = this.qualityMetricsSubject$.value;
    allMetrics.set(userId, metrics);
    this.qualityMetricsSubject$.next(new Map(allMetrics));
  }

  /**
   * Set audio enabled state
   */
  setAudioEnabled(enabled: boolean): void {
    this.isAudioEnabledSubject$.next(enabled);
  }

  /**
   * Set video enabled state
   */
  setVideoEnabled(enabled: boolean): void {
    this.isVideoEnabledSubject$.next(enabled);
  }

  /**
   * Set screen sharing state
   */
  setScreenSharing(enabled: boolean): void {
    this.isScreenSharingSubject$.next(enabled);
  }

  /**
   * Set error message
   */
  setError(error: string | null): void {
    this.errorSubject$.next(error);
  }

  /**
   * Get current error without subscribing
   */
  getError(): string | null {
    return this.errorSubject$.value;
  }

  // ==================== CONSULTATION METHODS ====================

  /**
   * Add consultation note
   */
  addConsultationNote(note: string): void {
    const current = this.consultationNotesSubject$.value;
    this.consultationNotesSubject$.next(current + '\n' + note);
  }

  /**
   * Set consultation notes
   */
  setConsultationNotes(notes: string): void {
    this.consultationNotesSubject$.next(notes);
  }

  /**
   * Get consultation notes
   */
  getConsultationNotes(): string {
    return this.consultationNotesSubject$.value;
  }

  /**
   * Add document to call
   */
  addCallDocument(document: any): void {
    const documents = this.callDocumentsSubject$.value;
    documents.push(document);
    this.callDocumentsSubject$.next([...documents]);
  }

  /**
   * Remove document from call
   */
  removeCallDocument(documentId: string): void {
    const documents = this.callDocumentsSubject$.value.filter(d => d.id !== documentId);
    this.callDocumentsSubject$.next(documents);
  }

  /**
   * Get all documents
   */
  getCallDocuments(): any[] {
    return this.callDocumentsSubject$.value;
  }

  // ==================== RESET & CLEANUP ====================

  /**
   * Clear all call state - called when call ends
   * This is important to avoid memory leaks
   */
  clearCallState(): void {
    this.callStateSubject$.next(LocalCallState.IDLE);
    this.currentCallSubject$.next(null);
    this.participantsSubject$.next(new Map());
    this.remoteStreamsSubject$.next(new Map());
    this.callDurationSubject$.next(0);
    this.qualityMetricsSubject$.next(new Map());
    this.isAudioEnabledSubject$.next(true);
    this.isVideoEnabledSubject$.next(true);
    this.isScreenSharingSubject$.next(false);
    this.errorSubject$.next(null);
    this.consultationNotesSubject$.next('');
    this.callDocumentsSubject$.next([]);

    // Stop all local streams
    const localStream = this.localStreamSubject$.value;
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      this.localStreamSubject$.next(null);
    }
  }

  /**
   * Log current state for debugging
   */
  logState(): void {
    console.group('Call State');
    console.log('Call State:', this.getCallState());
    console.log('Current Call:', this.getCurrentCall());
    console.log('Participants:', this.getParticipantsArray());
    console.log('Local Stream:', this.getLocalStream() ? 'Active' : 'None');
    console.log('Remote Streams:', this.remoteStreamsSubject$.value.size);
    console.log('Call Duration:', this.getCallDuration());
    console.log('Audio Enabled:', this.isAudioEnabledSubject$.value);
    console.log('Video Enabled:', this.isVideoEnabledSubject$.value);
    console.log('Screen Sharing:', this.isScreenSharingSubject$.value);
    console.groupEnd();
  }
}
