import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { WebRtcConfigService } from './webrtc-config.service';
import { SignalingMessage, SignalingMessageType } from '../models/signaling-message.model';

/**
 * WebRTC Signaling Service
 * Manages WebSocket/STOMP communication for WebRTC signaling
 * Handles message sending, receiving, and routing
 *
 * Responsibilities:
 * - Establish WebSocket connection
 * - Send/receive signaling messages via STOMP
 * - ICE candidate batching and flushing
 * - Connection state management
 * - Message routing and delivery
 */

export interface StompMessage {
  body: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebRtcSignalingService {
  // ==================== OBSERVABLES ====================

  private connectionStateSubject$ = new BehaviorSubject<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  public connectionState$ = this.connectionStateSubject$.asObservable();

  private lastMessageSubject$ = new BehaviorSubject<SignalingMessage | null>(null);
  public lastMessage$ = this.lastMessageSubject$.asObservable();

  // ==================== EVENTS ====================

  public messageReceived$ = new Subject<SignalingMessage>();
  public connectionError$ = new Subject<string>();
  public connectionEstablished$ = new Subject<void>();
  public connectionLost$ = new Subject<void>();

  // ==================== MESSAGE TYPE EVENTS ====================

  public inviteReceived$ = new Subject<SignalingMessage>();
  public acceptReceived$ = new Subject<SignalingMessage>();
  public rejectReceived$ = new Subject<SignalingMessage>();
  public offerReceived$ = new Subject<SignalingMessage>();
  public answerReceived$ = new Subject<SignalingMessage>();
  public iceCandidateReceived$ = new Subject<SignalingMessage>();
  public endReceived$ = new Subject<SignalingMessage>();
  public participantJoinedReceived$ = new Subject<SignalingMessage>();
  public participantLeftReceived$ = new Subject<SignalingMessage>();

  // ==================== PRIVATE STATE ====================

  private stompClient: any = null;
  private currentSessionId: string | null = null;
  private currentUserId: number | null = null;
  private connectionPromise: Promise<void> | null = null;
  private messageQueue: SignalingMessage[] = [];
  private isConnected = false;

  // ICE candidate batching
  private iceCandidateBatch: Map<string, SignalingMessage[]> = new Map();
  private batchFlushTimeout: any = null;

  constructor(private config: WebRtcConfigService) {}

  // ==================== CONNECTION MANAGEMENT ====================

  /**
   * Connect to WebSocket server for signaling
   * @param userId - Current user's ID
   * @param sessionId - Call session ID
   * @param userEmail - User's email for identity
   */
  async connect(userId: number, sessionId: string, userEmail: string): Promise<void> {
    if (this.isConnected) {
      console.warn('Already connected to signaling server');
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.currentUserId = userId;
        this.currentSessionId = sessionId;

        // Import STOMP client (must be available in environment)
        this.initializeStompClient(userEmail, resolve, reject);
      } catch (error) {
        const errorMessage = `Failed to initialize STOMP client: ${error}`;
        this.connectionStateSubject$.next('ERROR');
        this.connectionError$.next(errorMessage);
        reject(new Error(errorMessage));
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from signaling server
   */
  disconnect(): void {
    if (this.stompClient && this.isConnected) {
      this.stompClient.disconnect(() => {
        this.isConnected = false;
        this.connectionStateSubject$.next('DISCONNECTED');
        this.connectionLost$.next();
      });
    }

    if (this.batchFlushTimeout) {
      clearTimeout(this.batchFlushTimeout);
    }

    this.messageQueue = [];
    this.iceCandidateBatch.clear();
    this.currentSessionId = null;
    this.currentUserId = null;
  }

  /**
   * Check if connected to signaling server
   */
  isConnectedSync(): boolean {
    return this.isConnected;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' {
    return this.connectionStateSubject$.value;
  }

  // ==================== MESSAGE SENDING ====================

  /**
   * Send a signaling message
   * @param message - Message to send
   * @param delay - Optional delay in milliseconds before sending
   */
  async sendMessage(message: SignalingMessage, delay?: number): Promise<void> {
    if (!this.isConnected) {
      // Queue message if not connected
      this.messageQueue.push(message);
      throw new Error('Not connected to signaling server. Message queued.');
    }

    const sendMsg = () => {
      try {
        const destination = this.getMessageDestination(message);
        this.stompClient.send(
          destination,
          { 'Content-Type': 'application/json' },
          JSON.stringify(message)
        );
      } catch (error) {
        const errorMessage = `Failed to send signaling message: ${error}`;
        this.connectionError$.next(errorMessage);
        throw new Error(errorMessage);
      }
    };

    if (delay) {
      setTimeout(sendMsg, delay);
    } else {
      sendMsg();
    }
  }

  /**
   * Send INVITE message
   */
  async sendInvite(recipientId: number, recipientEmail: string): Promise<void> {
    const message: SignalingMessage = {
      type: SignalingMessageType.INVITE,
      sessionId: this.currentSessionId!,
      senderId: this.currentUserId!,
      recipientId,
      payload: { recipientEmail }
    };

    await this.sendMessage(message);
  }

  /**
   * Send ACCEPT message
   */
  async sendAccept(recipientId: number, sessionId: string): Promise<void> {
    const message: SignalingMessage = {
      type: SignalingMessageType.ACCEPT,
      sessionId,
      senderId: this.currentUserId!,
      recipientId
    };

    await this.sendMessage(message);
  }

  /**
   * Send REJECT message
   */
  async sendReject(recipientId: number, sessionId: string, reason?: string): Promise<void> {
    const message: SignalingMessage = {
      type: SignalingMessageType.REJECT,
      sessionId,
      senderId: this.currentUserId!,
      recipientId,
      payload: { reason }
    };

    await this.sendMessage(message);
  }

  /**
   * Send SDP OFFER
   */
  async sendOffer(recipientId: number, sdp: string, peerConnectionId?: string): Promise<void> {
    const message: SignalingMessage = {
      type: SignalingMessageType.OFFER,
      sessionId: this.currentSessionId!,
      senderId: this.currentUserId!,
      recipientId,
      peerConnectionId,
      payload: { type: 'offer', sdp }
    };

    await this.sendMessage(message);
  }

  /**
   * Send SDP ANSWER
   */
  async sendAnswer(recipientId: number, sdp: string, peerConnectionId?: string): Promise<void> {
    const message: SignalingMessage = {
      type: SignalingMessageType.ANSWER,
      sessionId: this.currentSessionId!,
      senderId: this.currentUserId!,
      recipientId,
      peerConnectionId,
      payload: { type: 'answer', sdp }
    };

    await this.sendMessage(message);
  }

  /**
   * Send ICE candidate (batched)
   * @param recipientId - Recipient user ID
   * @param candidate - ICE candidate string
   * @param sdpMLineIndex - Media line index
   * @param sdpMid - Media stream ID
   * @param peerConnectionId - Peer connection identifier
   */
  async sendIceCandidate(
    recipientId: number,
    candidate: string,
    sdpMLineIndex?: number | null,
    sdpMid?: string | null,
    peerConnectionId?: string
  ): Promise<void> {
    const message: SignalingMessage = {
      type: SignalingMessageType.ICE_CANDIDATE,
      sessionId: this.currentSessionId!,
      senderId: this.currentUserId!,
      recipientId,
      peerConnectionId,
      payload: { candidate, sdpMLineIndex, sdpMid }
    };

    // Batch ICE candidates
    this.addToIceBatch(recipientId, message);
  }

  /**
   * Send END message to terminate call
   */
  async sendEnd(recipientId: number, reason?: string): Promise<void> {
    const message: SignalingMessage = {
      type: SignalingMessageType.END,
      sessionId: this.currentSessionId!,
      senderId: this.currentUserId!,
      recipientId,
      payload: { reason }
    };

    await this.sendMessage(message);
  }

  /**
   * Send ACK (acknowledgment)
   */
  async sendAck(messageId: string): Promise<void> {
    const message: SignalingMessage = {
      type: SignalingMessageType.ACK,
      sessionId: this.currentSessionId!,
      senderId: this.currentUserId!,
      payload: { messageId }
    };

    await this.sendMessage(message);
  }

  // ==================== ICE CANDIDATE BATCHING ====================

  /**
   * Add ICE candidate to batch for efficient transmission
   */
  private addToIceBatch(recipientId: number, message: SignalingMessage): void {
    const key = `${recipientId}`;

    if (!this.iceCandidateBatch.has(key)) {
      this.iceCandidateBatch.set(key, []);
    }

    this.iceCandidateBatch.get(key)!.push(message);

    // Clear existing timeout
    if (this.batchFlushTimeout) {
      clearTimeout(this.batchFlushTimeout);
    }

    // Schedule flush after batch timeout
    this.batchFlushTimeout = setTimeout(
      () => this.flushIceBatch(),
      this.config.ICE_CANDIDATE_BATCH_TIMEOUT
    );
  }

  /**
   * Flush all batched ICE candidates
   */
  private async flushIceBatch(): Promise<void> {
    for (const [_, candidates] of this.iceCandidateBatch) {
      for (const candidate of candidates) {
        try {
          await this.sendMessage(candidate);
        } catch (error) {
          console.error('Failed to send batched ICE candidate:', error);
        }
      }
    }

    this.iceCandidateBatch.clear();
    this.batchFlushTimeout = null;
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Initialize STOMP client
   * Uses native WebSocket with manual STOMP frame handling if library not available
   */
  private initializeStompClient(
    userEmail: string,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    this.connectionStateSubject$.next('CONNECTING');

    const wsUrl = this.config.WEBSOCKET_URL;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      this.isConnected = true;
      this.connectionStateSubject$.next('CONNECTED');
      this.connectionEstablished$.next();

      // Send stored messages
      this.flushMessageQueue();

      resolve();
    };

    ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    ws.onerror = (error: Event) => {
      const errorMessage = 'WebSocket connection error';
      this.connectionStateSubject$.next('ERROR');
      this.connectionError$.next(errorMessage);
      reject(new Error(errorMessage));
    };

    ws.onclose = () => {
      this.isConnected = false;
      this.connectionStateSubject$.next('DISCONNECTED');
      this.connectionLost$.next();
    };

    this.stompClient = ws;
  }

  /**
   * Handle received message
   */
  private handleMessage(data: string): void {
    try {
      const message: SignalingMessage = JSON.parse(data);

      // Emit to general message stream
      this.messageReceived$.next(message);
      this.lastMessageSubject$.next(message);

      // Route to specific message type subject
      this.routeMessageByType(message);
    } catch (error) {
      console.error('Failed to parse signaling message:', error, data);
    }
  }

  /**
   * Route message to appropriate subject based on type
   */
  private routeMessageByType(message: SignalingMessage): void {
    switch (message.type) {
      case SignalingMessageType.INVITE:
        this.inviteReceived$.next(message);
        break;
      case SignalingMessageType.ACCEPT:
        this.acceptReceived$.next(message);
        break;
      case SignalingMessageType.REJECT:
        this.rejectReceived$.next(message);
        break;
      case SignalingMessageType.OFFER:
        this.offerReceived$.next(message);
        break;
      case SignalingMessageType.ANSWER:
        this.answerReceived$.next(message);
        break;
      case SignalingMessageType.ICE_CANDIDATE:
        this.iceCandidateReceived$.next(message);
        break;
      case SignalingMessageType.END:
        this.endReceived$.next(message);
        break;
      case SignalingMessageType.PARTICIPANT_JOINED:
        this.participantJoinedReceived$.next(message);
        break;
      case SignalingMessageType.PARTICIPANT_LEFT:
        this.participantLeftReceived$.next(message);
        break;
      // ACK and ERROR don't need specific routing
    }
  }

  /**
   * Get appropriate STOMP destination based on message type
   */
  private getMessageDestination(message: SignalingMessage): string {
    const prefix = this.config.STOMP_APP_PREFIX;
    const endpoint = this.config.SIGNALING_ENDPOINT;

    if (message.recipientId) {
      // Direct message to user
      return `${prefix}/user/${message.recipientId}${endpoint}`;
    } else {
      // Broadcast message
      return `${prefix}${endpoint}`;
    }
  }

  /**
   * Flush queued messages once connected
   */
  private async flushMessageQueue(): Promise<void> {
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of queue) {
      try {
        await this.sendMessage(message);
      } catch (error) {
        console.error('Failed to send queued message:', error);
      }
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): number | null {
    return this.currentUserId;
  }

  /**
   * Log signaling state for debugging
   */
  logSignalingState(): void {
    console.group('WebRTC Signaling State');
    console.log('Connection State:', this.getConnectionState());
    console.log('Current Session ID:', this.currentSessionId);
    console.log('Current User ID:', this.currentUserId);
    console.log('Message Queue:', this.messageQueue.length);
    console.log('ICE Batch:', this.iceCandidateBatch.size);
    console.groupEnd();
  }
}
