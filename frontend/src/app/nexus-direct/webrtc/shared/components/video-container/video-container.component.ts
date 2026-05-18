import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * VideoContainerComponent
 * Responsive video grid layout for displaying multiple video streams
 *
 * Features:
 * - Grid layout (1x1, 2x2, 2x3, etc.)
 * - Focus mode (one large + thumbnails)
 * - Spotlight mode (fullscreen one)
 * - Auto-layout adjustment
 * - HD video quality
 * - Proper aspect ratio (16:9)
 */

@Component({
  selector: 'app-video-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-container.component.html',
  styleUrls: ['./video-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoContainerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() localStream: MediaStream | null = null;
  @Input() remoteStreams: Map<number, MediaStream> = new Map();
  @Input() layout: 'grid' | 'focus' | 'spotlight' = 'grid';
  @Input() maxColumns: number = 2;
  @Input() focusedUserId: number | null = null;
  @Input() participantNames: Map<number, string> = new Map();

  @Output() focusUser = new EventEmitter<number | null>();
  @Output() videoError = new EventEmitter<string>();

  @ViewChildren('localVideo') localVideoRefs!: QueryList<any>;
  @ViewChildren('remoteVideo') remoteVideoRefs!: QueryList<any>;

  remoteUserIds: number[] = [];
  private destroy$ = new Subject<void>();

  ngAfterViewInit() {
    this.attachMediaStreams();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['localStream'] || changes['remoteStreams']) {
      this.remoteUserIds = Array.from(this.remoteStreams.keys());
      setTimeout(() => this.attachMediaStreams(), 0);
    }
  }

  /**
   * Attach media streams to video elements
   */
  private attachMediaStreams(): void {
    // Attach local stream
    if (this.localStream && this.localVideoRefs.length > 0) {
      const localVideoElement = this.localVideoRefs.first.nativeElement as HTMLVideoElement;
      try {
        localVideoElement.srcObject = this.localStream;
      } catch (error) {
        this.videoError.emit(`Failed to attach local stream: ${error}`);
      }
    }

    // Attach remote streams
    this.remoteVideoRefs.forEach((ref, index) => {
      const userId = this.remoteUserIds[index];
      const remoteStream = this.remoteStreams.get(userId);

      if (remoteStream) {
        const videoElement = ref.nativeElement as HTMLVideoElement;
        try {
          videoElement.srcObject = remoteStream;
        } catch (error) {
          this.videoError.emit(`Failed to attach remote stream for user ${userId}: ${error}`);
        }
      }
    });
  }

  /**
   * Handle video element click (for focus/spotlight)
   */
  onVideoClick(userId: number | null): void {
    if (this.layout === 'grid') return; // No focus in grid mode
    this.focusUser.emit(userId);
  }

  /**
   * Get CSS class for video container based on layout
   */
  getContainerClass(): string {
    return `video-container layout-${this.layout} columns-${this.maxColumns}`;
  }

  /**
   * Get CSS class for grid layout
   */
  getGridClass(): string {
    return `grid columns-${this.maxColumns}`;
  }

  /**
   * Get participant name
   */
  getParticipantName(userId: number): string {
    return this.participantNames.get(userId) || `User ${userId}`;
  }

  /**
   * Check if this is the focused video
   */
  isFocused(userId: number | null): boolean {
    return this.focusedUserId === userId;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
