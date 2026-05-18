import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

/**
 * AddParticipantDialogComponent
 * Modal for searching and inviting additional participants to consultation
 * Supports filtering by role, status, and search text
 */

export interface Participant {
  id: string;
  name: string;
  email: string;
  role: 'doctor' | 'nurse' | 'specialist' | 'admin' | 'assistant';
  avatar?: string;
  status: 'available' | 'busy' | 'offline';
  specialty?: string;
  inCall?: boolean;
}

@Component({
  selector: 'app-add-participant-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-participant-dialog.component.html',
  styleUrls: ['./add-participant-dialog.component.scss'],
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
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class AddParticipantDialogComponent implements OnInit {
  @Input() isVisible = false;
  @Input() availableParticipants: Participant[] = [];
  @Input() currentParticipantIds: string[] = [];
  @Input() maxParticipants = 10;

  @Output() participantSelected = new EventEmitter<Participant>();
  @Output() close = new EventEmitter<void>();

  // Search and filtering
  searchText = '';
  selectedRole: 'all' | 'doctor' | 'nurse' | 'specialist' | 'admin' | 'assistant' = 'all';
  selectedStatus: 'all' | 'available' | 'busy' | 'offline' = 'available';

  // Filtered participants
  filteredParticipants: Participant[] = [];

  // Selected participants to invite
  selectedToInvite: Set<string> = new Set();

  // UI state
  isLoading = false;
  isInviting = false;

  roles: Array<{ value: string; label: string; icon: string }> = [
    { value: 'all', label: 'All Roles', icon: '👥' },
    { value: 'doctor', label: 'Doctor', icon: '👨‍⚕️' },
    { value: 'nurse', label: 'Nurse', icon: '👩‍⚕️' },
    { value: 'specialist', label: 'Specialist', icon: '🔬' },
    { value: 'assistant', label: 'Assistant', icon: '📋' },
    { value: 'admin', label: 'Admin', icon: '⚙️' }
  ];

  statuses: Array<{ value: string; label: string; color: string }> = [
    { value: 'all', label: 'All Status', color: '#999' },
    { value: 'available', label: 'Available', color: '#4CAF50' },
    { value: 'busy', label: 'Busy', color: '#FF9800' },
    { value: 'offline', label: 'Offline', color: '#999' }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.filterParticipants();
  }

  /**
   * Handle search input changes
   */
  onSearchChange(): void {
    this.filterParticipants();
  }

  /**
   * Handle role filter change
   */
  onRoleChange(role: string): void {
    this.selectedRole = role as any;
    this.filterParticipants();
  }

  /**
   * Handle status filter change
   */
  onStatusChange(status: string): void {
    this.selectedStatus = status as any;
    this.filterParticipants();
  }

  /**
   * Filter participants based on search and filters
   */
  private filterParticipants(): void {
    let filtered = this.availableParticipants.filter(p => !this.currentParticipantIds.includes(p.id));

    // Filter by role
    if (this.selectedRole !== 'all') {
      filtered = filtered.filter(p => p.role === this.selectedRole);
    }

    // Filter by status
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(p => p.status === this.selectedStatus);
    }

    // Filter by search text
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.email.toLowerCase().includes(search) ||
        (p.specialty && p.specialty.toLowerCase().includes(search))
      );
    }

    this.filteredParticipants = filtered;
    this.cdr.markForCheck();
  }

  /**
   * Toggle participant selection
   */
  toggleParticipant(participantId: string): void {
    if (this.selectedToInvite.has(participantId)) {
      this.selectedToInvite.delete(participantId);
    } else {
      if (this.selectedToInvite.size < this.maxParticipants - 1) {
        this.selectedToInvite.add(participantId);
      }
    }
    this.cdr.markForCheck();
  }

  /**
   * Check if participant is selected
   */
  isParticipantSelected(participantId: string): boolean {
    return this.selectedToInvite.has(participantId);
  }

  /**
   * Can select more participants
   */
  canSelectMore(): boolean {
    return this.selectedToInvite.size < this.maxParticipants - 1;
  }

  /**
   * Invite selected participants
   */
  inviteSelected(): void {
    if (this.selectedToInvite.size === 0) return;

    this.isInviting = true;

    // Simulate invitation sending
    setTimeout(() => {
      for (const id of this.selectedToInvite) {
        const participant = this.availableParticipants.find(p => p.id === id);
        if (participant) {
          this.participantSelected.emit(participant);
        }
      }

      this.isInviting = false;
      this.selectedToInvite.clear();
      this.searchText = '';
      this.selectedRole = 'all';
      this.selectedStatus = 'available';
      this.filterParticipants();
      this.close.emit();
      this.cdr.markForCheck();
    }, 1000);
  }

  /**
   * Quick invite a single participant
   */
  quickInvite(participant: Participant): void {
    this.participantSelected.emit(participant);
    this.selectedToInvite.delete(participant.id);
    this.filterParticipants();
  }

  /**
   * Close dialog
   */
  onClose(): void {
    this.selectedToInvite.clear();
    this.searchText = '';
    this.selectedRole = 'all';
    this.selectedStatus = 'available';
    this.close.emit();
  }

  /**
   * Get role icon
   */
  getRoleIcon(role: string): string {
    return this.roles.find(r => r.value === role)?.icon || '👤';
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    return this.statuses.find(s => s.value === status)?.color || '#999';
  }

  /**
   * Get selected count label
   */
  getSelectedLabel(): string {
    if (this.selectedToInvite.size === 0) {
      return 'Select participants';
    }
    return `${this.selectedToInvite.size} selected`;
  }

  /**
   * Track by function for *ngFor
   */
  trackByParticipantId(index: number, participant: Participant): string {
    return participant.id;
  }
}
