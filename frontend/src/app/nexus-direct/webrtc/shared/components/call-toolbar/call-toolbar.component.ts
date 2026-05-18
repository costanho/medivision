import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * CallToolbarComponent
 * Control bar with media controls, recording, screen share, and call end
 *
 * Features:
 * - Audio/video toggle buttons
 * - Screen share toggle
 * - Recording start/stop
 * - Call duration display
 * - End call button
 * - Tooltip hints on hover
 * - Icon feedback
 */

@Component({
  selector: 'app-call-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call-toolbar.component.html',
  styleUrls: ['./call-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CallToolbarComponent implements OnInit, OnDestroy {
  @Input() isAudioEnabled: boolean = true;
  @Input() isVideoEnabled: boolean = true;
  @Input() isScreenSharing: boolean = false;
  @Input() isRecording: boolean = false;
  @Input() callDuration: number = 0; // seconds
  @Input() showAdvancedOptions: boolean = false;

  @Output() toggleAudio = new EventEmitter<boolean>();
  @Output() toggleVideo = new EventEmitter<boolean>();
  @Output() toggleScreenShare = new EventEmitter<void>();
  @Output() toggleRecording = new EventEmitter<void>();
  @Output() endCall = new EventEmitter<void>();
  @Output() addParticipant = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();

  displayDuration: string = '00:00:00';
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Update duration display every second
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateDurationDisplay();
      });

    // Initial update
    this.updateDurationDisplay();
  }

  /**
   * Format call duration as HH:MM:SS
   */
  private updateDurationDisplay(): void {
    const hours = Math.floor(this.callDuration / 3600);
    const minutes = Math.floor((this.callDuration % 3600) / 60);
    const seconds = this.callDuration % 60;

    this.displayDuration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Handle audio toggle
   */
  onToggleAudio(): void {
    this.toggleAudio.emit(!this.isAudioEnabled);
  }

  /**
   * Handle video toggle
   */
  onToggleVideo(): void {
    this.toggleVideo.emit(!this.isVideoEnabled);
  }

  /**
   * Handle screen share toggle
   */
  onToggleScreenShare(): void {
    this.toggleScreenShare.emit();
  }

  /**
   * Handle recording toggle
   */
  onToggleRecording(): void {
    this.toggleRecording.emit();
  }

  /**
   * Handle end call
   */
  onEndCall(): void {
    const confirm = window.confirm('End this call?');
    if (confirm) {
      this.endCall.emit();
    }
  }

  /**
   * Handle add participant
   */
  onAddParticipant(): void {
    this.addParticipant.emit();
  }

  /**
   * Handle open settings
   */
  onOpenSettings(): void {
    this.openSettings.emit();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
