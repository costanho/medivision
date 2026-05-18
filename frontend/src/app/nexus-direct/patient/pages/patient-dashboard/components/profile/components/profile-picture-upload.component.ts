import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-picture-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-picture-upload">
      <div class="picture-preview">
        <img *ngIf="preview" [src]="preview" alt="Profile Picture Preview" class="preview-image" />
        <div *ngIf="!preview" class="preview-placeholder">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <p>No picture selected</p>
        </div>
      </div>

      <div class="upload-input-wrapper">
        <input
          type="file"
          #fileInput
          (change)="onFileSelected($event)"
          class="file-input"
          accept="image/jpeg,image/jpg,image/png,image/gif"
          [disabled]="disabled" />
        <button
          type="button"
          (click)="triggerFileInput()"
          class="upload-button"
          [disabled]="disabled">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Choose Picture
        </button>

        <button
          *ngIf="preview"
          type="button"
          (click)="removeFile()"
          class="remove-button"
          [disabled]="disabled">
          Remove
        </button>
      </div>

      <p class="file-requirements">JPG, PNG, GIF - Max 5MB</p>
    </div>
  `,
  styles: [`
    .profile-picture-upload {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .picture-preview {
        width: 120px;
        height: 120px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f5f5f5;
        overflow: hidden;

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #999;

          p {
            margin: 0;
            font-size: 0.85rem;
            text-align: center;
          }
        }
      }

      .upload-input-wrapper {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;

        .file-input {
          display: none;
        }

        .upload-button,
        .remove-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #fff;
          color: #333;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;

          &:hover:not(:disabled) {
            background: #f5f5f5;
            border-color: #bbb;
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }

        .upload-button {
          border-color: #1890ff;
          color: #1890ff;

          &:hover:not(:disabled) {
            background: #e6f7ff;
          }
        }

        .remove-button {
          border-color: #ff4d4f;
          color: #ff4d4f;

          &:hover:not(:disabled) {
            background: #fff1f0;
          }
        }
      }

      .file-requirements {
        margin: 0;
        font-size: 0.85rem;
        color: #999;
      }
    }
  `]
})
export class ProfilePictureUploadComponent {
  @Input() preview: string | null = null;
  @Input() error: string = '';
  @Input() disabled: boolean = false;

  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileRemoved = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      console.error('[ProfilePictureUpload] File size exceeds 5MB');
      return;
    }

    // Validate file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      console.error('[ProfilePictureUpload] Invalid file type:', file.type);
      return;
    }

    console.log('[ProfilePictureUpload] File selected:', file.name);
    this.fileSelected.emit(file);

    // Reset file input
    if (input) {
      input.value = '';
    }
  }

  removeFile(): void {
    console.log('[ProfilePictureUpload] Removing profile picture');
    this.fileRemoved.emit();
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }
}
