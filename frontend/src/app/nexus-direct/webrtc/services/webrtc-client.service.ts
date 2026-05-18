import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { WebRtcConfigService } from './webrtc-config.service';
import { MediaStreamService } from './media-stream.service';
import { WebRtcSignalingService } from './webrtc-signaling.service';
import { CallStateService } from './call-state.service';
import { SignalingMessage, SignalingMessageType } from '../models/signaling-message.model';
import { LocalCallState } from '../models/call-state.enum';

/**
 * WebRTC Client Service
 * Manages RTCPeerConnection lifecycle and WebRTC communication
 * Coordinates between media streams, signaling, and call state
 *
 * Responsibilities:
 * - Create/manage RTCPeerConnections
 * - Handle SDP offer/answer exchange
 * - Handle ICE candidates
 * - Monitor connection states
 * - Emit connection events
 */

export interface PeerConnectionState {
  id: string;
  userId: number;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  signalingState: RTCSignalingState;
}

@Injectable({
  providedIn: 'root'
})
export class WebRtcClientService {
  // ==================== OBSERVABLES ====================

  private peerConnectionsSubject$ = new BehaviorSubject<Map<string, RTCPeerConnection>>(new Map());
  public peerConnections$ = this.peerConnectionsSubject$.asObservable();

  private peerStatesSubject$ = new BehaviorSubject<Map<string, PeerConnectionState>>(new Map());
  public peerStates$ = this.peerStatesSubject$.asObservable();

  // ==================== EVENTS ====================

  public remoteStreamReceived$ = new Subject<{ userId: number; stream: MediaStream }>();
  public peerConnectionError$ = new Subject<{ userId: number; error: string }>();
  public peerConnectionEstablished$ = new Subject<{ userId: number }>();
  public peerConnectionClosed$ = new Subject<{ userId: number }>();
  public iceCandidatesGathered$ = new Subject<void>();

  // ==================== PRIVATE STATE ====================

  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private peerConnectionsById: Map<number, string[]> = new Map(); // userId -> [peerConnectionIds]
  private localStream: MediaStream | null = null;
  private isInitiator = false;

  constructor(
    private config: WebRtcConfigService,
    private mediaService: MediaStreamService,
    private signalingService: WebRtcSignalingService,
    private callState: CallStateService
  ) {
    this.setupSignalingListeners();
  }

  // ==================== PEER CONNECTION CREATION ====================

  /**
   * Create RTCPeerConnection for a participant
   * @param userId - Remote user ID
   * @param isInitiator - Whether this peer will send the offer
   * @param peerConnectionId - Optional custom peer connection ID
   */
  async createPeerConnection(
    userId: number,
    isInitiator: boolean = false,
    peerConnectionId?: string
  ): Promise<RTCPeerConnection> {
    try {
      const config = this.config.getPeerConnectionConfig();
      const pc = new RTCPeerConnection(config);

      const id = peerConnectionId || this.generatePeerConnectionId(userId);

      // Set up event listeners
      this.setupPeerConnectionListeners(pc, userId, id);

      // Add local stream if available
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream!);
        });
      }

      // Store peer connection
      this.peerConnections.set(id, pc);

      // Map userId to peerConnectionIds
      if (!this.peerConnectionsById.has(userId)) {
        this.peerConnectionsById.set(userId, []);
      }
      this.peerConnectionsById.get(userId)!.push(id);

      this.peerConnectionsSubject$.next(new Map(this.peerConnections));
      this.isInitiator = isInitiator;

      return pc;
    } catch (error) {
      const errorMessage = `Failed to create peer connection: ${error}`;
      this.peerConnectionError$.next({ userId, error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  /**
   * Close peer connection for a specific user
   */
  closePeerConnection(userId: number, peerConnectionId?: string): void {
    const connectionIds = this.peerConnectionsById.get(userId) || [];

    if (peerConnectionId) {
      // Close specific peer connection
      const pc = this.peerConnections.get(peerConnectionId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(peerConnectionId);

        // Remove from userId mapping
        const index = connectionIds.indexOf(peerConnectionId);
        if (index > -1) {
          connectionIds.splice(index, 1);
        }

        this.updatePeerConnectionState(peerConnectionId);
        this.peerConnectionClosed$.next({ userId });
      }
    } else {
      // Close all peer connections for user
      connectionIds.forEach(id => {
        const pc = this.peerConnections.get(id);
        if (pc) {
          pc.close();
          this.peerConnections.delete(id);
        }
      });

      this.peerConnectionsById.delete(userId);
      this.peerConnectionClosed$.next({ userId });
    }

    this.peerConnectionsSubject$.next(new Map(this.peerConnections));
  }

  /**
   * Close all peer connections
   */
  closeAllPeerConnections(): void {
    this.peerConnections.forEach(pc => {
      pc.close();
    });

    this.peerConnections.clear();
    this.peerConnectionsById.clear();
    this.peerConnectionsSubject$.next(new Map());
  }

  // ==================== OFFER/ANSWER HANDLING ====================

  /**
   * Create and send SDP offer
   */
  async createAndSendOffer(userId: number, peerConnectionId: string): Promise<void> {
    try {
      const pc = this.peerConnections.get(peerConnectionId);
      if (!pc) {
        throw new Error('Peer connection not found');
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await pc.setLocalDescription(offer);

      // Send offer via signaling
      const sdp = pc.localDescription?.sdp || '';
      await this.signalingService.sendOffer(userId, sdp, peerConnectionId);
    } catch (error) {
      const errorMessage = `Failed to create offer: ${error}`;
      this.peerConnectionError$.next({ userId, error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  /**
   * Handle received SDP offer
   */
  async handleOffer(
    message: SignalingMessage,
    userId: number,
    peerConnectionId: string
  ): Promise<void> {
    try {
      let pc = this.peerConnections.get(peerConnectionId);

      // Create peer connection if doesn't exist
      if (!pc) {
        pc = await this.createPeerConnection(userId, false, peerConnectionId);
      }

      const offer = new RTCSessionDescription({
        type: 'offer',
        sdp: message.payload?.sdp || ''
      });

      await pc.setRemoteDescription(offer);

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const sdp = pc.localDescription?.sdp || '';
      await this.signalingService.sendAnswer(userId, sdp, peerConnectionId);
    } catch (error) {
      const errorMessage = `Failed to handle offer: ${error}`;
      this.peerConnectionError$.next({ userId, error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  /**
   * Handle received SDP answer
   */
  async handleAnswer(
    message: SignalingMessage,
    userId: number,
    peerConnectionId: string
  ): Promise<void> {
    try {
      const pc = this.peerConnections.get(peerConnectionId);
      if (!pc) {
        throw new Error('Peer connection not found');
      }

      const answer = new RTCSessionDescription({
        type: 'answer',
        sdp: message.payload?.sdp || ''
      });

      await pc.setRemoteDescription(answer);
    } catch (error) {
      const errorMessage = `Failed to handle answer: ${error}`;
      this.peerConnectionError$.next({ userId, error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  // ==================== ICE CANDIDATE HANDLING ====================

  /**
   * Add ICE candidate to peer connection
   */
  async addIceCandidate(
    message: SignalingMessage,
    peerConnectionId: string
  ): Promise<void> {
    try {
      const pc = this.peerConnections.get(peerConnectionId);
      if (!pc) {
        console.warn('Peer connection not found for ICE candidate:', peerConnectionId);
        return;
      }

      const candidate = new RTCIceCandidate({
        candidate: message.payload?.candidate || '',
        sdpMLineIndex: message.payload?.sdpMLineIndex,
        sdpMid: message.payload?.sdpMid
      });

      await pc.addIceCandidate(candidate);
    } catch (error) {
      // Ignore errors for invalid/duplicate candidates
      if ((error as Error).name !== 'InvalidStateError') {
        console.warn('Failed to add ICE candidate:', error);
      }
    }
  }

  /**
   * Send ICE candidate
   */
  async sendIceCandidate(
    userId: number,
    candidate: RTCIceCandidate,
    peerConnectionId: string
  ): Promise<void> {
    try {
      await this.signalingService.sendIceCandidate(
        userId,
        candidate.candidate || '',
        candidate.sdpMLineIndex,
        candidate.sdpMid,
        peerConnectionId
      );
    } catch (error) {
      console.warn('Failed to send ICE candidate:', error);
    }
  }

  // ==================== LOCAL STREAM MANAGEMENT ====================

  /**
   * Set local stream for all peer connections
   */
  async setLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;

    // Add tracks to all existing peer connections
    this.peerConnections.forEach((pc, id) => {
      stream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, stream);
        } catch (error) {
          console.warn('Track already added to peer connection:', id);
        }
      });
    });
  }

  /**
   * Update local stream with new media
   * Used when switching cameras, enabling/disabling audio/video
   */
  async updateLocalStream(stream: MediaStream): Promise<void> {
    // Replace tracks in all peer connections
    const oldStream = this.localStream;

    this.peerConnections.forEach((pc, id) => {
      // Remove old tracks
      if (oldStream) {
        oldStream.getTracks().forEach(track => {
          const sender = pc.getSenders().find(s => s.track === track);
          if (sender) {
            pc.removeTrack(sender);
          }
        });
      }

      // Add new tracks
      stream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, stream);
        } catch (error) {
          console.warn('Failed to add track to peer connection:', id, error);
        }
      });
    });

    this.localStream = stream;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // ==================== CONNECTION STATE MONITORING ====================

  /**
   * Get peer connection by ID
   */
  getPeerConnection(peerConnectionId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(peerConnectionId);
  }

  /**
   * Get peer connection for user
   */
  getPeerConnectionForUser(userId: number): RTCPeerConnection | undefined {
    const ids = this.peerConnectionsById.get(userId);
    if (ids && ids.length > 0) {
      return this.peerConnections.get(ids[0]);
    }
    return undefined;
  }

  /**
   * Get all peer connections for user
   */
  getPeerConnectionsForUser(userId: number): RTCPeerConnection[] {
    const ids = this.peerConnectionsById.get(userId) || [];
    return ids
      .map(id => this.peerConnections.get(id))
      .filter((pc): pc is RTCPeerConnection => pc !== undefined);
  }

  /**
   * Get peer connection state
   */
  getPeerConnectionState(peerConnectionId: string): PeerConnectionState | undefined {
    return this.peerStatesSubject$.value.get(peerConnectionId);
  }

  /**
   * Get all peer connection states
   */
  getAllPeerConnectionStates(): PeerConnectionState[] {
    return Array.from(this.peerStatesSubject$.value.values());
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Setup event listeners for peer connection
   */
  private setupPeerConnectionListeners(
    pc: RTCPeerConnection,
    userId: number,
    peerConnectionId: string
  ): void {
    // Connection state changes
    pc.onconnectionstatechange = () => {
      this.updatePeerConnectionState(peerConnectionId);

      switch (pc.connectionState) {
        case 'connected':
          this.peerConnectionEstablished$.next({ userId });
          this.callState.setCallState(LocalCallState.CONNECTED);
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          this.closePeerConnection(userId, peerConnectionId);
          break;
      }
    };

    // ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      this.updatePeerConnectionState(peerConnectionId);

      if (pc.iceConnectionState === 'failed') {
        this.peerConnectionError$.next({
          userId,
          error: 'ICE connection failed'
        });
      }
    };

    // ICE gathering state
    pc.onicegatheringstatechange = () => {
      this.updatePeerConnectionState(peerConnectionId);

      if (pc.iceGatheringState === 'complete') {
        this.iceCandidatesGathered$.next();
      }
    };

    // ICE candidate
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        // Send via signaling (will be batched)
        this.sendIceCandidate(userId, event.candidate, peerConnectionId);
      }
    };

    // Remote track
    pc.ontrack = (event: RTCTrackEvent) => {
      const stream = event.streams[0];
      if (stream) {
        this.remoteStreamReceived$.next({ userId, stream });
        this.callState.addRemoteStream(userId, stream);
      }
    };

    // Signaling state
    pc.onsignalingstatechange = () => {
      this.updatePeerConnectionState(peerConnectionId);
    };
  }

  /**
   * Update peer connection state
   */
  private updatePeerConnectionState(peerConnectionId: string): void {
    const pc = this.peerConnections.get(peerConnectionId);
    if (!pc) return;

    const state: PeerConnectionState = {
      id: peerConnectionId,
      userId: this.getUserIdForPeerConnection(peerConnectionId) || -1,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      iceGatheringState: pc.iceGatheringState,
      signalingState: pc.signalingState
    };

    const states = this.peerStatesSubject$.value;
    states.set(peerConnectionId, state);
    this.peerStatesSubject$.next(new Map(states));
  }

  /**
   * Get user ID for peer connection
   */
  private getUserIdForPeerConnection(peerConnectionId: string): number | null {
    for (const [userId, ids] of this.peerConnectionsById) {
      if (ids.includes(peerConnectionId)) {
        return userId;
      }
    }
    return null;
  }

  /**
   * Generate unique peer connection ID
   */
  private generatePeerConnectionId(userId: number): string {
    return `pc_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup signaling listeners
   */
  private setupSignalingListeners(): void {
    // Handle incoming offers
    this.signalingService.offerReceived$.subscribe(message => {
      const userId = message.senderId;
      const peerConnectionId = message.peerConnectionId || `pc_${userId}`;
      this.handleOffer(message, userId, peerConnectionId);
    });

    // Handle incoming answers
    this.signalingService.answerReceived$.subscribe(message => {
      const userId = message.senderId;
      const peerConnectionId = message.peerConnectionId || `pc_${userId}`;
      this.handleAnswer(message, userId, peerConnectionId);
    });

    // Handle ICE candidates
    this.signalingService.iceCandidateReceived$.subscribe(message => {
      const peerConnectionId = message.peerConnectionId || `pc_${message.senderId}`;
      this.addIceCandidate(message, peerConnectionId);
    });
  }

  /**
   * Log peer connection states for debugging
   */
  logPeerConnectionStates(): void {
    console.group('WebRTC Peer Connection States');
    console.log('Total Peer Connections:', this.peerConnections.size);
    console.log('Peer Connections by User:', this.peerConnectionsById);
    console.log('Peer Connection States:', Array.from(this.peerStatesSubject$.value.values()));
    console.log('Local Stream:', this.localStream ? 'Active' : 'None');
    console.groupEnd();
  }
}
