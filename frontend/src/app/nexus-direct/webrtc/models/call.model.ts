/**
 * Call Model - Interfaces for call-related data structures
 * Matches backend CallSession and CallParticipant entities
 */

export interface CallSession {
  id: number;
  sessionId: string;                    // Unique ID for WebSocket routing
  callType: CallType;
  initiatorId: number;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  durationSeconds?: number;
  recorded: boolean;
  participants: CallParticipant[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CallParticipant {
  id: number;
  userId: number;
  role: ParticipantRole;
  status: ParticipantStatus;
  peerConnectionId: string;              // For WebRTC peer routing
  joinTime?: Date;
  leaveTime?: Date;
}

export type CallType = 'ONE_TO_ONE' | 'ONE_TO_MANY';
export type CallStatus = 'INITIATED' | 'RINGING' | 'ACTIVE' | 'ENDED' | 'FAILED';
export type ParticipantRole = 'INITIATOR' | 'RECIPIENT' | 'ATTENDEE';
export type ParticipantStatus = 'INVITED' | 'RINGING' | 'CONNECTED' | 'DISCONNECTED' | 'REJECTED';
