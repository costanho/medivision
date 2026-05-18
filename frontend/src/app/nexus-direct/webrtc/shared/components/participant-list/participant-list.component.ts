import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParticipantWithState } from '../../../models';

/**
 * ParticipantListComponent
 * Display list of call participants with status and controls
 */

@Component({
  selector: 'app-participant-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './participant-list.component.html',
  styleUrls: ['./participant-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantListComponent implements OnInit, OnChanges {
  @Input() participants: ParticipantWithState[] = [];
  @Input() currentUserId: number | null = null;
  @Input() maxVisible: number = 4;
  @Input() isDoctor: boolean = false;

  @Output() participantSelected = new EventEmitter<number>();
  @Output() removeParticipant = new EventEmitter<number>();
  @Output() muteParticipant = new EventEmitter<number>();

  visibleParticipants: ParticipantWithState[] = [];
  hiddenCount: number = 0;
  showAll: boolean = false;

  ngOnInit() {
    this.updateVisibleParticipants();
  }

  ngOnChanges() {
    this.updateVisibleParticipants();
  }

  /**
   * Update visible participants based on max visible count
   */
  private updateVisibleParticipants(): void {
    if (this.showAll) {
      this.visibleParticipants = this.participants;
      this.hiddenCount = 0;
    } else {
      this.visibleParticipants = this.participants.slice(0, this.maxVisible);
      this.hiddenCount = Math.max(0, this.participants.length - this.maxVisible);
    }
  }

  /**
   * Show all participants
   */
  showAllParticipants(): void {
    this.showAll = true;
    this.updateVisibleParticipants();
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'CONNECTED': 'Connected',
      'CONNECTING': 'Connecting...',
      'DISCONNECTED': 'Disconnected',
      'INVITED': 'Invited',
      'RINGING': 'Ringing...'
    };
    return labels[status] || status;
  }

  /**
   * Check if participant audio is enabled
   */
  isAudioEnabled(participant: ParticipantWithState): boolean {
    return true; // Would check actual state from participant
  }

  /**
   * Check if participant video is enabled
   */
  isVideoEnabled(participant: ParticipantWithState): boolean {
    return true; // Would check actual state from participant
  }

  /**
   * Check if can remove participant (doctor only, not self)
   */
  canRemoveParticipant(participant: ParticipantWithState): boolean {
    return this.isDoctor && participant.userId !== this.currentUserId;
  }

  /**
   * Handle participant click
   */
  onParticipantClick(userId: number): void {
    this.participantSelected.emit(userId);
  }

  /**
   * Handle remove participant
   */
  onRemoveParticipant(event: Event, userId: number): void {
    event.stopPropagation();
    this.removeParticipant.emit(userId);
  }

  /**
   * Handle mute participant
   */
  onMuteParticipant(event: Event, userId: number): void {
    event.stopPropagation();
    this.muteParticipant.emit(userId);
  }
}
