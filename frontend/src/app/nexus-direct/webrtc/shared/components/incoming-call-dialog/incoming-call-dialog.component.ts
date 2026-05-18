import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

/**
 * IncomingCallDialogComponent
 * Modal dialog for incoming call acceptance/rejection
 */

@Component({
  selector: 'app-incoming-call-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './incoming-call-dialog.component.html',
  styleUrls: ['./incoming-call-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(50px)', opacity: 0 }),
        animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('ring', [
      transition('* => *', [
        animate('0.5s ease-in-out', style({ transform: 'scale(1.05)' })),
        animate('0.5s ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class IncomingCallDialogComponent {
  @Input() callerName: string = 'Unknown Caller';
  @Input() callerAvatar: string = '';
  @Input() callerRole: string = 'Doctor';
  @Input() isVisible: boolean = false;

  @Output() accept = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  ringCounter = 0;

  /**
   * Accept call (Enter key)
   */
  @HostListener('document:keydown.enter')
  onEnter(): void {
    if (this.isVisible) {
      this.onAccept();
    }
  }

  /**
   * Reject call (Escape key)
   */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isVisible) {
      this.onReject();
    }
  }

  /**
   * Handle accept button
   */
  onAccept(): void {
    this.accept.emit();
  }

  /**
   * Handle reject button
   */
  onReject(): void {
    this.reject.emit();
  }

  /**
   * Handle overlay click (reject)
   */
  onOverlayClick(): void {
    this.onReject();
  }

  /**
   * Trigger ring animation
   */
  triggerRing(): void {
    this.ringCounter++;
  }
}
