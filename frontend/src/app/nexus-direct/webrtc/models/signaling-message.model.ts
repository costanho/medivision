/**
 * Signaling Message Model - WebRTC signaling protocol
 * Used for WebSocket STOMP communication between client and backend
 */

export interface SignalingMessage {
  type: SignalingMessageType;
  sessionId: string;
  senderId: number;
  recipientId?: number;                 // For 1:1 calls
  peerConnectionId?: string;            // For 1:many calls
  payload?: Record<string, any>;        // SDP offer/answer or ICE candidate
  timestamp?: number;
}

export enum SignalingMessageType {
  INVITE = 'INVITE',
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  OFFER = 'OFFER',
  ANSWER = 'ANSWER',
  ICE_CANDIDATE = 'ICE_CANDIDATE',
  END = 'END',
  ERROR = 'ERROR',
  PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
  ACK = 'ACK'
}

/**
 * SDP Offer/Answer payload structure
 */
export interface SDPPayload {
  type: 'offer' | 'answer';
  sdp: string;
}

/**
 * ICE Candidate payload structure
 */
export interface ICECandidatePayload {
  candidate: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}
