import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UploadedDocument {
  name: string;
  size: string;
  file: File;
}

@Component({
  selector: 'app-documents-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="documents-upload">
      <div class="upload-area">
        <input
          type="file"
          #fileInput
          (change)="onFilesSelected($event)"
          class="file-input"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          [disabled]="disabled" />

        <button
          type="button"
          (click)="triggerFileInput()"
          class="upload-button"
          [disabled]="disabled">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Choose Documents
        </button>
        <p class="upload-hint">PDF, DOC, DOCX, JPG, PNG - Max 10MB per file</p>
      </div>

      <div *ngIf="documents.length > 0" class="documents-list">
        <h4 class="documents-title">Uploaded Documents ({{ documents.length }})</h4>
        <div class="document-item" *ngFor="let doc of documents; let i = index">
          <div class="document-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <div class="document-details">
              <p class="document-name">{{ doc.name }}</p>
              <p class="document-size">{{ doc.size }}</p>
            </div>
          </div>
          <button
            type="button"
            (click)="removeDocument(i)"
            class="remove-button"
            [disabled]="disabled"
            title="Remove document">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .documents-upload {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;

      .upload-area {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;

        .file-input {
          display: none;
        }

        .upload-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: 1px solid #1890ff;
          border-radius: 6px;
          background: #1890ff;
          color: #fff;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;

          &:hover:not(:disabled) {
            background: #0050b3;
            border-color: #0050b3;
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }

        .upload-hint {
          margin: 0;
          font-size: 0.85rem;
          color: #999;
        }
      }

      .documents-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .documents-title {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #333;
        }

        .document-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background: #f9f9f9;
          gap: 1rem;

          .document-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
            min-width: 0;

            svg {
              color: #1890ff;
              flex-shrink: 0;
            }

            .document-details {
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
              min-width: 0;

              .document-name {
                margin: 0;
                font-size: 0.9rem;
                font-weight: 500;
                color: #333;
                word-break: break-word;
              }

              .document-size {
                margin: 0;
                font-size: 0.8rem;
                color: #999;
              }
            }
          }

          .remove-button {
            padding: 0.5rem;
            border: none;
            background: transparent;
            color: #ff4d4f;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.3s ease;

            &:hover:not(:disabled) {
              background: #fff1f0;
              border-radius: 4px;
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }
    }
  `]
})
export class DocumentsUploadComponent {
  @Input() documents: UploadedDocument[] = [];
  @Input() error: string = '';
  @Input() disabled: boolean = false;

  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() documentRemoved = new EventEmitter<number>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files) return;

    const selectedFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        console.error(`[DocumentsUpload] File "${file.name}" exceeds maximum size of 10MB`);
        continue;
      }

      // Validate file type
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        console.error(`[DocumentsUpload] File "${file.name}" has unsupported format`);
        continue;
      }

      selectedFiles.push(file);
      console.log(`[DocumentsUpload] File selected: ${file.name}`);
    }

    if (selectedFiles.length > 0) {
      this.filesSelected.emit(selectedFiles);
    }

    // Reset file input
    if (input) {
      input.value = '';
    }
  }

  removeDocument(index: number): void {
    console.log(`[DocumentsUpload] Removing document at index ${index}`);
    this.documentRemoved.emit(index);
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      pdf: 'file-pdf',
      doc: 'file-word',
      docx: 'file-word',
      jpg: 'file-image',
      jpeg: 'file-image',
      png: 'file-image'
    };
    return iconMap[extension || ''] || 'file';
  }
}
