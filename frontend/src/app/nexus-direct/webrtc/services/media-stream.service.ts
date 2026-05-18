import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { WebRtcConfigService } from './webrtc-config.service';

/**
 * Media Stream Service
 * Manages local and remote media streams (audio/video)
 * Handles getUserMedia, screen sharing, and media track control
 *
 * Responsibilities:
 * - Get local media streams (audio/video)
 * - Toggle audio/video tracks
 * - Manage screen sharing
 * - Handle device enumeration
 * - Clean up media tracks properly
 */

export interface MediaTrackState {
  enabled: boolean;
  muted?: boolean;
  device?: MediaDeviceInfo;
}

export interface ScreenShareOptions {
  audio?: boolean;
  video?: DisplayMediaStreamOptions;
}

@Injectable({
  providedIn: 'root'
})
export class MediaStreamService {
  // ==================== OBSERVABLES ====================

  private localStreamSubject$ = new BehaviorSubject<MediaStream | null>(null);
  public localStream$ = this.localStreamSubject$.asObservable();

  private audioTracksSubject$ = new BehaviorSubject<Map<string, MediaStreamTrack>>(new Map());
  public audioTracks$ = this.audioTracksSubject$.asObservable();

  private videoTracksSubject$ = new BehaviorSubject<Map<string, MediaStreamTrack>>(new Map());
  public videoTracks$ = this.videoTracksSubject$.asObservable();

  private availableDevicesSubject$ = new BehaviorSubject<{
    audioInput: MediaDeviceInfo[];
    videoInput: MediaDeviceInfo[];
  }>({ audioInput: [], videoInput: [] });
  public availableDevices$ = this.availableDevicesSubject$.asObservable();

  private isScreenSharingSubject$ = new BehaviorSubject<boolean>(false);
  public isScreenSharing$ = this.isScreenSharingSubject$.asObservable();

  private screenShareStreamSubject$ = new BehaviorSubject<MediaStream | null>(null);
  public screenShareStream$ = this.screenShareStreamSubject$.asObservable();

  // ==================== EVENTS ====================

  public mediaError$ = new Subject<string>();
  public deviceEnumerationError$ = new Subject<string>();
  public screenShareEnded$ = new Subject<void>();

  // ==================== PRIVATE STATE ====================

  private currentLocalStream: MediaStream | null = null;
  private currentScreenShareStream: MediaStream | null = null;
  private screenShareDisplayStream: MediaStream | null = null;

  constructor(private config: WebRtcConfigService) {
    this.enumerateDevices();
  }

  // ==================== GET MEDIA STREAMS ====================

  /**
   * Get local media stream with audio and/or video
   * @param audioEnabled - Whether to request audio track
   * @param videoEnabled - Whether to request video track
   * @param audioDeviceId - Optional audio input device ID
   * @param videoDeviceId - Optional video input device ID
   */
  async getLocalStream(
    audioEnabled: boolean = true,
    videoEnabled: boolean = true,
    audioDeviceId?: string,
    videoDeviceId?: string
  ): Promise<MediaStream> {
    try {
      const constraints = this.buildMediaConstraints(
        audioEnabled,
        videoEnabled,
        audioDeviceId,
        videoDeviceId
      );

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentLocalStream = stream;
      this.localStreamSubject$.next(stream);
      this.trackMediaTracks(stream);

      return stream;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.mediaError$.next(errorMessage);
      throw new Error(`Failed to get local media stream: ${errorMessage}`);
    }
  }

  /**
   * Get audio-only stream (for audio calls)
   */
  async getAudioOnlyStream(audioDeviceId?: string): Promise<MediaStream> {
    return this.getLocalStream(true, false, audioDeviceId);
  }

  /**
   * Get video stream with audio
   */
  async getVideoStream(
    audioDeviceId?: string,
    videoDeviceId?: string
  ): Promise<MediaStream> {
    return this.getLocalStream(true, true, audioDeviceId, videoDeviceId);
  }

  /**
   * Get screen share stream
   * @param options - Screen share options (audio, video quality)
   */
  async getScreenShareStream(options?: ScreenShareOptions): Promise<MediaStream> {
    try {
      const displayMediaOptions: DisplayMediaStreamOptions = {
        audio: options?.audio ?? false,
        video: options?.video ?? this.config.getScreenShareConstraints().video
      };

      const screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      this.screenShareDisplayStream = screenStream;

      // Listen for user stopping screen share (via browser UI)
      screenStream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          this.stopScreenShare();
        });
      });

      return screenStream;
    } catch (error) {
      if ((error as DOMException).name === 'NotAllowedError') {
        // User cancelled screen share
        return null as any;
      }
      const errorMessage = this.getErrorMessage(error);
      this.mediaError$.next(errorMessage);
      throw new Error(`Failed to get screen share stream: ${errorMessage}`);
    }
  }

  // ==================== TOGGLE TRACKS ====================

  /**
   * Toggle audio track on/off
   * @param enabled - Whether to enable or disable audio
   */
  toggleAudio(enabled: boolean): void {
    if (!this.currentLocalStream) {
      this.mediaError$.next('No local stream available');
      return;
    }

    this.currentLocalStream.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });

    this.screenShareDisplayStream?.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  /**
   * Toggle video track on/off
   * @param enabled - Whether to enable or disable video
   */
  toggleVideo(enabled: boolean): void {
    if (!this.currentLocalStream) {
      this.mediaError$.next('No local stream available');
      return;
    }

    this.currentLocalStream.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  /**
   * Mute audio (same as toggleAudio(false))
   */
  muteAudio(): void {
    this.toggleAudio(false);
  }

  /**
   * Unmute audio (same as toggleAudio(true))
   */
  unmuteAudio(): void {
    this.toggleAudio(true);
  }

  /**
   * Pause video (same as toggleVideo(false))
   */
  pauseVideo(): void {
    this.toggleVideo(false);
  }

  /**
   * Resume video (same as toggleVideo(true))
   */
  resumeVideo(): void {
    this.toggleVideo(true);
  }

  // ==================== SCREEN SHARING ====================

  /**
   * Start screen sharing, replacing video track
   * @param options - Screen share options
   */
  async startScreenShare(options?: ScreenShareOptions): Promise<MediaStream> {
    try {
      if (this.isScreenSharingSubject$.value) {
        throw new Error('Screen sharing already active');
      }

      const screenStream = await this.getScreenShareStream(options);
      if (!screenStream) {
        return null as any; // User cancelled
      }

      this.currentScreenShareStream = screenStream;
      this.screenShareStreamSubject$.next(screenStream);
      this.isScreenSharingSubject$.next(true);
      this.trackMediaTracks(screenStream);

      return screenStream;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.mediaError$.next(errorMessage);
      throw new Error(`Failed to start screen share: ${errorMessage}`);
    }
  }

  /**
   * Stop screen sharing and resume camera video
   */
  async stopScreenShare(): Promise<void> {
    // Stop all screen share tracks
    if (this.screenShareDisplayStream) {
      this.screenShareDisplayStream.getTracks().forEach(track => {
        track.stop();
      });
      this.screenShareDisplayStream = null;
    }

    if (this.currentScreenShareStream) {
      this.currentScreenShareStream.getTracks().forEach(track => {
        track.stop();
      });
      this.currentScreenShareStream = null;
    }

    this.screenShareStreamSubject$.next(null);
    this.isScreenSharingSubject$.next(false);
    this.screenShareEnded$.next();

    // Resume camera if local stream exists
    if (this.currentLocalStream) {
      this.currentLocalStream.getVideoTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }

  // ==================== DEVICE ENUMERATION ====================

  /**
   * Enumerate available media devices
   */
  async enumerateDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInput = devices.filter(d => d.kind === 'audioinput');
      const videoInput = devices.filter(d => d.kind === 'videoinput');

      this.availableDevicesSubject$.next({ audioInput, videoInput });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.deviceEnumerationError$.next(errorMessage);
    }
  }

  /**
   * Get available audio input devices
   */
  getAudioInputDevices(): MediaDeviceInfo[] {
    return this.availableDevicesSubject$.value.audioInput;
  }

  /**
   * Get available video input devices
   */
  getVideoInputDevices(): MediaDeviceInfo[] {
    return this.availableDevicesSubject$.value.videoInput;
  }

  /**
   * Switch to different audio device
   * @param deviceId - Audio input device ID
   */
  async switchAudioDevice(deviceId: string): Promise<MediaStream> {
    try {
      // Stop current audio tracks
      if (this.currentLocalStream) {
        this.currentLocalStream.getAudioTracks().forEach(track => track.stop());
      }

      // Get new stream with new device
      const newStream = await this.getLocalStream(
        true,
        !!this.currentLocalStream?.getVideoTracks().length,
        deviceId
      );

      return newStream;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.mediaError$.next(errorMessage);
      throw new Error(`Failed to switch audio device: ${errorMessage}`);
    }
  }

  /**
   * Switch to different video device
   * @param deviceId - Video input device ID
   */
  async switchVideoDevice(deviceId: string): Promise<MediaStream> {
    try {
      // Stop current video tracks
      if (this.currentLocalStream) {
        this.currentLocalStream.getVideoTracks().forEach(track => track.stop());
      }

      // Get new stream with new device
      const newStream = await this.getLocalStream(
        !!this.currentLocalStream?.getAudioTracks().length,
        true,
        undefined,
        deviceId
      );

      return newStream;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.mediaError$.next(errorMessage);
      throw new Error(`Failed to switch video device: ${errorMessage}`);
    }
  }

  // ==================== STREAM MANAGEMENT ====================

  /**
   * Get current local stream without subscribing
   */
  getLocalStreamSync(): MediaStream | null {
    return this.currentLocalStream;
  }

  /**
   * Get current screen share stream without subscribing
   */
  getScreenShareStreamSync(): MediaStream | null {
    return this.currentScreenShareStream;
  }

  /**
   * Check if audio is enabled
   */
  isAudioEnabled(): boolean {
    if (!this.currentLocalStream) return false;
    const audioTracks = this.currentLocalStream.getAudioTracks();
    return audioTracks.length > 0 && audioTracks[0].enabled;
  }

  /**
   * Check if video is enabled
   */
  isVideoEnabled(): boolean {
    if (!this.currentLocalStream) return false;
    const videoTracks = this.currentLocalStream.getVideoTracks();
    return videoTracks.length > 0 && videoTracks[0].enabled;
  }

  /**
   * Stop all media streams and clean up
   */
  stopAllStreams(): void {
    // Stop local stream
    if (this.currentLocalStream) {
      this.currentLocalStream.getTracks().forEach(track => track.stop());
      this.currentLocalStream = null;
      this.localStreamSubject$.next(null);
    }

    // Stop screen share
    if (this.screenShareDisplayStream) {
      this.screenShareDisplayStream.getTracks().forEach(track => track.stop());
      this.screenShareDisplayStream = null;
    }

    if (this.currentScreenShareStream) {
      this.currentScreenShareStream.getTracks().forEach(track => track.stop());
      this.currentScreenShareStream = null;
      this.screenShareStreamSubject$.next(null);
    }

    this.isScreenSharingSubject$.next(false);
    this.audioTracksSubject$.next(new Map());
    this.videoTracksSubject$.next(new Map());
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Build media constraints based on config
   */
  private buildMediaConstraints(
    audioEnabled: boolean,
    videoEnabled: boolean,
    audioDeviceId?: string,
    videoDeviceId?: string
  ): MediaStreamConstraints {
    const constraints: MediaStreamConstraints = {};

    if (audioEnabled) {
      const audioConfig = this.config.AUDIO_CONSTRAINTS;
      constraints.audio = audioDeviceId
        ? { ...audioConfig, deviceId: { exact: audioDeviceId } }
        : audioConfig;
    } else {
      constraints.audio = false;
    }

    if (videoEnabled) {
      const videoConfig = this.config.VIDEO_CONSTRAINTS;
      constraints.video = videoDeviceId
        ? { ...videoConfig, deviceId: { exact: videoDeviceId } }
        : videoConfig;
    } else {
      constraints.video = false;
    }

    return constraints;
  }

  /**
   * Track all media tracks in a stream for state management
   */
  private trackMediaTracks(stream: MediaStream): void {
    const audioTracks = new Map<string, MediaStreamTrack>();
    const videoTracks = new Map<string, MediaStreamTrack>();

    stream.getAudioTracks().forEach(track => {
      audioTracks.set(track.id, track);
    });

    stream.getVideoTracks().forEach(track => {
      videoTracks.set(track.id, track);
    });

    this.audioTracksSubject$.next(audioTracks);
    this.videoTracksSubject$.next(videoTracks);
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return 'Permission denied by user';
        case 'NotFoundError':
          return 'No media devices found';
        case 'NotReadableError':
          return 'Media device is already in use';
        case 'OverconstrainedError':
          return 'No device meets the required constraints';
        case 'TypeError':
          return 'Invalid media constraints';
        default:
          return error.message || 'Unknown error';
      }
    }
    return error?.message || 'Unknown error';
  }

  /**
   * Log stream state for debugging
   */
  logStreamState(): void {
    console.group('Media Stream State');
    console.log('Local Stream:', this.currentLocalStream ? 'Active' : 'None');
    if (this.currentLocalStream) {
      console.log('Audio Tracks:', this.currentLocalStream.getAudioTracks().length);
      console.log('Video Tracks:', this.currentLocalStream.getVideoTracks().length);
    }
    console.log('Screen Sharing:', this.isScreenSharingSubject$.value);
    console.log('Screen Stream:', this.currentScreenShareStream ? 'Active' : 'None');
    console.log('Available Devices:', this.availableDevicesSubject$.value);
    console.groupEnd();
  }
}
