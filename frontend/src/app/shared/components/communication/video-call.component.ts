import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface CallState {
  isActive: boolean;
  isAudio: boolean;
  isVideo: boolean;
  isMuted: boolean;
  isScreenSharing: boolean;
  duration: number;
  participantCount: number;
}

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss']
})
export class VideoCallComponent implements OnInit, OnDestroy {
  @Input() callId: string | null = null;
  @Input() participantName: string = 'User';
  @Input() callType: 'video' | 'audio' = 'video';

  callState: CallState = {
    isActive: true,
    isAudio: true,
    isVideo: true,
    isMuted: false,
    isScreenSharing: false,
    duration: 0,
    participantCount: 2
  };

  localVideoRef: HTMLVideoElement | null = null;
  remoteVideoRef: HTMLVideoElement | null = null;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  callDuration = '00:00';

  private destroy$ = new Subject<void>();
  private durationInterval: any;

  constructor() {}

  ngOnInit() {
    this.initializeMediaStreams();
    this.startCallDurationTimer();
  }

  async initializeMediaStreams() {
    try {
      // Request user media (camera and microphone)
      const constraints = {
        audio: this.callState.isAudio,
        video: this.callState.isVideo ? { width: 1280, height: 720 } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Set local video source
      if (this.localVideoRef && this.callState.isVideo) {
        this.localVideoRef.srcObject = this.localStream;
      }

      console.log('[VideoCall] Media streams initialized');
    } catch (error) {
      console.error('[VideoCall] Failed to initialize media streams:', error);
    }
  }

  startCallDurationTimer() {
    this.durationInterval = setInterval(() => {
      this.callState.duration++;
      this.updateCallDurationDisplay();
    }, 1000);
  }

  updateCallDurationDisplay() {
    const minutes = Math.floor(this.callState.duration / 60);
    const seconds = this.callState.duration % 60;
    this.callDuration = `${this.padZero(minutes)}:${this.padZero(seconds)}`;
  }

  padZero(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      this.callState.isMuted = !this.callState.isMuted;
    }
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      this.callState.isVideo = !this.callState.isVideo;
    }
  }

  toggleScreenShare() {
    this.callState.isScreenSharing = !this.callState.isScreenSharing;
    // TODO: Implement actual screen sharing via getUserDisplayMedia
    console.log('[VideoCall] Screen sharing:', this.callState.isScreenSharing);
  }

  endCall() {
    this.stopMediaStreams();
    this.callState.isActive = false;
    console.log('[VideoCall] Call ended');
  }

  stopMediaStreams() {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // Clear refs
    if (this.localVideoRef) {
      this.localVideoRef.srcObject = null;
    }
    if (this.remoteVideoRef) {
      this.remoteVideoRef.srcObject = null;
    }

    // Stop duration timer
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
  }

  ngOnDestroy() {
    this.stopMediaStreams();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
