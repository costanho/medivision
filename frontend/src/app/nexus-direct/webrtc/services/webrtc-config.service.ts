import { Injectable } from '@angular/core';

/**
 * WebRTC Configuration Service
 * Centralized configuration for all WebRTC and signaling settings
 * Allows easy switching between development and production configs
 */

@Injectable({
  providedIn: 'root'
})
export class WebRtcConfigService {
  // ==================== WEBSOCKET & STOMP CONFIGURATION ====================

  /**
   * WebSocket endpoint URL
   * In production, this should be the same domain as the frontend
   */
  readonly WEBSOCKET_URL = this.getWebSocketUrl();

  /**
   * STOMP application destination prefix
   * Messages sent by client: /app/video-conference/signaling
   */
  readonly STOMP_APP_PREFIX = '/app';

  /**
   * STOMP user destination prefix
   * Messages received by client: /user/queue/signaling
   */
  readonly STOMP_QUEUE_PREFIX = '/user';

  /**
   * Full signaling endpoint path
   */
  readonly SIGNALING_ENDPOINT = '/video-conference/signaling';

  /**
   * WebSocket connection timeout in milliseconds
   */
  readonly WEBSOCKET_TIMEOUT = 5000;

  // ==================== WEBRTC PEER CONNECTION CONFIGURATION ====================

  /**
   * STUN servers for NAT traversal
   * These are public servers that help determine peer IP addresses
   */
  readonly ICE_SERVERS = [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302'] },
    { urls: ['stun:stun3.l.google.com:19302'] },
    { urls: ['stun:stun4.l.google.com:19302'] }
  ];

  /**
   * RTCPeerConnection configuration
   * Defines ICE servers and connection policies
   */
  readonly RTC_PEER_CONNECTION_CONFIG: RTCConfiguration = {
    iceServers: this.ICE_SERVERS,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  // ==================== MEDIA CONSTRAINTS ====================

  /**
   * Audio constraints
   * Enables echo cancellation, noise suppression, automatic gain control
   */
  readonly AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: 16000 }
  };

  /**
   * Video constraints
   * Target 720p resolution with fallback to lower resolutions
   */
  readonly VIDEO_CONSTRAINTS: MediaTrackConstraints = {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
    facingMode: 'user'
  };

  /**
   * Screen share constraints
   * Higher resolution for productivity
   */
  readonly SCREEN_CONSTRAINTS: DisplayMediaStreamOptions = {
    video: {
      cursor: 'always'
    },
    audio: false
  };

  /**
   * Combined media constraints for getUserMedia
   */
  readonly MEDIA_CONSTRAINTS: MediaStreamConstraints = {
    audio: this.AUDIO_CONSTRAINTS,
    video: this.VIDEO_CONSTRAINTS
  };

  // ==================== ICE CANDIDATE CONFIGURATION ====================

  /**
   * Time in milliseconds to batch ICE candidates before sending
   * Reduces network traffic by combining multiple candidates into one message
   */
  readonly ICE_CANDIDATE_BATCH_TIMEOUT = 250;

  /**
   * Maximum number of ICE candidates to batch together
   */
  readonly MAX_ICE_BATCH_SIZE = 10;

  // ==================== CALL TIMEOUT CONFIGURATION ====================

  /**
   * Time to wait for recipient to accept/reject call in milliseconds
   * If exceeded, call is automatically ended
   */
  readonly CALL_TIMEOUT = 30000;  // 30 seconds

  /**
   * Time to wait for peer connection to establish in milliseconds
   */
  readonly CONNECTION_TIMEOUT = 15000;  // 15 seconds

  /**
   * Interval to check connection health in milliseconds
   */
  readonly HEALTH_CHECK_INTERVAL = 5000;  // 5 seconds

  // ==================== LOGGING & DEBUG ====================

  /**
   * Enable debug logging
   * Set to true during development
   */
  readonly DEBUG_MODE = !this.isProduction();

  /**
   * Enable WebRTC statistics logging
   * Logs bandwidth, quality metrics, etc.
   */
  readonly LOG_STATS = this.DEBUG_MODE;

  /**
   * Enable console logging for signaling messages
   */
  readonly LOG_SIGNALING = this.DEBUG_MODE;

  // ==================== AUDIO/VIDEO QUALITY SETTINGS ====================

  /**
   * Preferred audio codec
   * Will attempt to negotiate this codec with peer
   */
  readonly PREFERRED_AUDIO_CODEC = 'opus';

  /**
   * Preferred video codec
   * H264 has better browser compatibility, VP8/VP9 are more efficient
   */
  readonly PREFERRED_VIDEO_CODEC = 'VP9';

  /**
   * Target bitrate for audio in kbps
   */
  readonly TARGET_AUDIO_BITRATE = 32;

  /**
   * Target bitrate for video in kbps
   * Adjusts based on available bandwidth
   */
  readonly TARGET_VIDEO_BITRATE = {
    min: 500,      // Minimum for basic quality
    ideal: 2500,   // Target
    max: 5000      // Maximum
  };

  // ==================== PRIVATE METHODS ====================

  /**
   * Get WebSocket URL based on environment
   * Uses same domain as frontend in production
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;

    if (this.isProduction()) {
      // Production: use same domain
      return `${protocol}://${host}/ws`;
    } else {
      // Development: connect to backend at localhost:8081
      return `${protocol}://localhost:8081/ws`;
    }
  }

  /**
   * Check if running in production
   */
  private isProduction(): boolean {
    return !window.location.hostname.includes('localhost') &&
           !window.location.hostname.includes('127.0.0.1');
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Get RTCPeerConnection configuration
   */
  getPeerConnectionConfig(): RTCConfiguration {
    return this.RTC_PEER_CONNECTION_CONFIG;
  }

  /**
   * Get media constraints for video call
   */
  getVideoCallConstraints(): MediaStreamConstraints {
    return this.MEDIA_CONSTRAINTS;
  }

  /**
   * Get media constraints for audio only call
   */
  getAudioOnlyConstraints(): MediaStreamConstraints {
    return {
      audio: this.AUDIO_CONSTRAINTS,
      video: false
    };
  }

  /**
   * Get screen sharing constraints
   */
  getScreenShareConstraints(): DisplayMediaStreamOptions {
    return this.SCREEN_CONSTRAINTS;
  }

  /**
   * Log configuration for debugging
   */
  logConfiguration(): void {
    if (!this.DEBUG_MODE) return;

    console.group('WebRTC Configuration');
    console.log('WebSocket URL:', this.WEBSOCKET_URL);
    console.log('ICE Servers:', this.ICE_SERVERS.length);
    console.log('Debug Mode:', this.DEBUG_MODE);
    console.log('Production:', this.isProduction());
    console.groupEnd();
  }
}
