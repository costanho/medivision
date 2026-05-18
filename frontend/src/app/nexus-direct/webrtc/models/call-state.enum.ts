/**
 * Local Call State Enum
 * Tracks the state of the call from frontend perspective
 * Different from backend CallStatus - this is UI-level state
 */

export enum LocalCallState {
  IDLE = 'IDLE',                          // No active call
  CALLING = 'CALLING',                    // Outgoing call - waiting for response
  RINGING = 'RINGING',                    // Incoming call - user deciding
  CONNECTING = 'CONNECTING',              // SDP/ICE exchange happening
  CONNECTED = 'CONNECTED',                // Call is active with peer
  ON_HOLD = 'ON_HOLD',                    // Call on hold
  SCREEN_SHARING = 'SCREEN_SHARING',      // Screen share active
  ENDED = 'ENDED',                        // Call terminated normally
  FAILED = 'FAILED',                      // Call failed
  ERROR = 'ERROR'                         // Error state
}

/**
 * Call quality metrics for monitoring
 */
export interface CallQualityMetrics {
  audioLevel: number;                     // 0-100
  videoFps: number;                       // Frames per second
  latency: number;                        // RTT in milliseconds
  packetLoss: number;                     // Percentage
  bandwidth: {
    inbound: number;                      // Kbps
    outbound: number;                     // Kbps
  };
  connectionState: RTCPeerConnectionState;
}

/**
 * Enhanced participant with local state
 */
export interface ParticipantWithState {
  id: number;
  userId: number;
  userName: string;
  avatar?: string;
  role: 'INITIATOR' | 'RECIPIENT' | 'ATTENDEE';
  status: 'INVITED' | 'RINGING' | 'CONNECTED' | 'DISCONNECTED' | 'REJECTED';
  stream?: MediaStream;
  peerConnectionId?: string;
  qualityMetrics?: CallQualityMetrics;
  isLocalUser?: boolean;
}
