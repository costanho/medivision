import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, timer } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

/**
 * ConsultationNotesComponent
 * Rich note-taking editor for doctors during consultations
 * Features: Auto-save, templates, timestamps, formatting
 */

export interface ConsultationNote {
  id?: string;
  patientId: string;
  consultationId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isAutoSaved?: boolean;
}

export interface NoteTemplate {
  id: string;
  name: string;
  content: string;
}

@Component({
  selector: 'app-consultation-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consultation-notes.component.html',
  styleUrls: ['./consultation-notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConsultationNotesComponent implements OnInit, OnDestroy {
  @Input() patientId: string = '';
  @Input() consultationId: string = '';
  @Input() initialContent: string = '';
  @Input() templates: NoteTemplate[] = [];
  @Input() isReadOnly = false;

  @Output() contentChanged = new EventEmitter<string>();
  @Output() noteSaved = new EventEmitter<ConsultationNote>();
  @Output() noteCreated = new EventEmitter<ConsultationNote>();

  @ViewChild('noteEditor') noteEditor!: ElementRef<HTMLTextAreaElement>;

  // Note content and state
  noteContent: string = '';
  isSaving = false;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  lastSaveTime: Date | null = null;
  characterCount = 0;
  wordCount = 0;

  // UI state
  showTemplates = false;
  showFormatting = false;
  selectedTemplate: NoteTemplate | null = null;
  currentNote: ConsultationNote | null = null;

  // Quick tags for note categorization
  quickTags = ['Follow-up', 'Important', 'Urgent', 'Medication', 'Lab Work', 'Referral', 'Procedure'];
  addedTags: string[] = [];

  private destroy$ = new Subject<void>();
  private contentChanged$ = new Subject<string>();
  private autoSaveInterval = 30000; // 30 seconds

  constructor() {}

  ngOnInit(): void {
    this.noteContent = this.initialContent;
    this.updateCounts();
    this.setupAutoSave();
  }

  /**
   * Setup auto-save functionality
   */
  private setupAutoSave(): void {
    this.contentChanged$
      .pipe(
        debounceTime(this.autoSaveInterval),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.autoSave();
      });
  }

  /**
   * Handle note content changes
   */
  onContentChange(content: string): void {
    this.noteContent = content;
    this.updateCounts();
    this.contentChanged.emit(content);
    this.contentChanged$.next(content);
    this.saveStatus = 'idle';
  }

  /**
   * Update character and word counts
   */
  private updateCounts(): void {
    this.characterCount = this.noteContent.length;
    this.wordCount = this.noteContent.trim() ? this.noteContent.trim().split(/\s+/).length : 0;
  }

  /**
   * Insert timestamp at cursor position
   */
  insertTimestamp(): void {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    this.insertAtCursor(`[${timestamp}] `);
  }

  /**
   * Insert text at cursor position in textarea
   */
  private insertAtCursor(text: string): void {
    const textarea = this.noteEditor.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = this.noteContent.substring(0, start);
    const after = this.noteContent.substring(end);
    this.noteContent = before + text + after;
    this.updateCounts();
    this.contentChanged.emit(this.noteContent);
    this.contentChanged$.next(this.noteContent);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  }

  /**
   * Insert template content
   */
  insertTemplate(template: NoteTemplate): void {
    this.insertAtCursor(template.content + '\n');
    this.selectedTemplate = template;
    this.showTemplates = false;
  }

  /**
   * Add tag to note
   */
  addTag(tag: string): void {
    if (!this.addedTags.includes(tag)) {
      this.addedTags.push(tag);
    }
  }

  /**
   * Remove tag from note
   */
  removeTag(tag: string): void {
    this.addedTags = this.addedTags.filter(t => t !== tag);
  }

  /**
   * Auto-save note
   */
  private autoSave(): void {
    if (!this.noteContent.trim() || this.isReadOnly) return;
    this.saveStatus = 'saving';

    // Simulate save with timeout
    setTimeout(() => {
      const note: ConsultationNote = {
        patientId: this.patientId,
        consultationId: this.consultationId,
        content: this.noteContent,
        createdAt: this.currentNote?.createdAt || new Date(),
        updatedAt: new Date(),
        tags: this.addedTags,
        isAutoSaved: true
      };

      this.currentNote = note;
      this.lastSaveTime = new Date();
      this.saveStatus = 'saved';
      this.noteSaved.emit(note);

      // Reset status after 2 seconds
      setTimeout(() => {
        this.saveStatus = 'idle';
      }, 2000);
    }, 500);
  }

  /**
   * Manually save note
   */
  saveNote(): void {
    if (!this.noteContent.trim() || this.isReadOnly) return;
    this.saveStatus = 'saving';

    setTimeout(() => {
      const note: ConsultationNote = {
        id: this.currentNote?.id,
        patientId: this.patientId,
        consultationId: this.consultationId,
        content: this.noteContent,
        createdAt: this.currentNote?.createdAt || new Date(),
        updatedAt: new Date(),
        tags: this.addedTags,
        isAutoSaved: false
      };

      this.currentNote = note;
      this.lastSaveTime = new Date();
      this.saveStatus = 'saved';

      if (note.id) {
        this.noteSaved.emit(note);
      } else {
        this.noteCreated.emit(note);
      }

      // Reset status after 2 seconds
      setTimeout(() => {
        this.saveStatus = 'idle';
      }, 2000);
    }, 500);
  }

  /**
   * Clear note content
   */
  clearNote(): void {
    if (confirm('Are you sure you want to clear all content?')) {
      this.noteContent = '';
      this.addedTags = [];
      this.updateCounts();
      this.contentChanged.emit('');
      this.saveStatus = 'idle';
    }
  }

  /**
   * Copy note to clipboard
   */
  copyToClipboard(): void {
    navigator.clipboard.writeText(this.noteContent).then(() => {
      // Show success feedback (could be toast notification)
      console.log('Note copied to clipboard');
    });
  }

  /**
   * Export note as text file
   */
  exportNote(): void {
    const content = `Patient ID: ${this.patientId}\nConsultation ID: ${this.consultationId}\nDate: ${new Date().toLocaleString()}\n\n${this.noteContent}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consultation-note-${this.patientId}-${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Get save status display text
   */
  getSaveStatusText(): string {
    switch (this.saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Error saving';
      default:
        return this.lastSaveTime ? `Last saved ${this.getTimeAgo(this.lastSaveTime)}` : 'Not saved';
    }
  }

  /**
   * Get time ago string
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Toggle templates panel
   */
  toggleTemplates(): void {
    this.showTemplates = !this.showTemplates;
  }

  /**
   * Toggle formatting guide
   */
  toggleFormatting(): void {
    this.showFormatting = !this.showFormatting;
  }

  ngOnDestroy(): void {
    // Save note before component is destroyed
    if (this.noteContent.trim()) {
      this.autoSave();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
