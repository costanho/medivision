import { Injectable } from '@angular/core';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileFileService {
  private readonly MAX_PICTURE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_DOCUMENTS = 5;
  private readonly VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
  private readonly VALID_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  private readonly VALID_DOCUMENT_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|txt)$/i;

  constructor() {}

  /**
   * Validate profile picture file
   * Checks file type and size
   */
  validateProfilePicture(file: File): FileValidationResult {
    console.log('[ProfileFileService] Validating profile picture:', file.name);

    // Check file type
    if (!this.VALID_IMAGE_TYPES.includes(file.type)) {
      const error = 'Please select a valid image file (PNG, JPG, GIF)';
      console.warn('[ProfileFileService]', error);
      return { valid: false, error };
    }

    // Check file size
    if (file.size > this.MAX_PICTURE_SIZE) {
      const error = 'Profile picture must be less than 5MB';
      console.warn('[ProfileFileService]', error);
      return { valid: false, error };
    }

    console.log('[ProfileFileService] Profile picture validation passed');
    return { valid: true };
  }

  /**
   * Validate document files
   * Checks file type, size, and document count
   */
  validateDocuments(
    newFiles: FileList,
    currentDocumentCount: number
  ): FileValidationResult {
    console.log('[ProfileFileService] Validating documents:', newFiles.length);

    // Check total document count
    if (currentDocumentCount + newFiles.length > this.MAX_DOCUMENTS) {
      const error = `You can upload a maximum of ${this.MAX_DOCUMENTS} documents`;
      console.warn('[ProfileFileService]', error);
      return { valid: false, error };
    }

    // Validate each file
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const fileValidation = this.validateSingleDocument(file);

      if (!fileValidation.valid) {
        return fileValidation;
      }
    }

    console.log('[ProfileFileService] All documents validation passed');
    return { valid: true };
  }

  /**
   * Validate a single document file
   * Checks file type and size
   */
  private validateSingleDocument(file: File): FileValidationResult {
    console.log('[ProfileFileService] Validating single document:', file.name);

    // Check file type
    const isValidType = this.VALID_DOCUMENT_TYPES.includes(file.type) ||
                        this.VALID_DOCUMENT_EXTENSIONS.test(file.name);

    if (!isValidType) {
      const error = `File ${file.name} is not a valid document type. Use PDF, DOC, DOCX, XLS, XLSX, or TXT`;
      console.warn('[ProfileFileService]', error);
      return { valid: false, error };
    }

    // Check file size
    if (file.size > this.MAX_DOCUMENT_SIZE) {
      const error = `File ${file.name} exceeds 10MB limit`;
      console.warn('[ProfileFileService]', error);
      return { valid: false, error };
    }

    console.log('[ProfileFileService] Document validation passed:', file.name);
    return { valid: true };
  }

  /**
   * Create file preview for image
   * Returns data URL for image preview
   */
  createImagePreview(file: File): Promise<string> {
    console.log('[ProfileFileService] Creating image preview for:', file.name);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        console.log('[ProfileFileService] Image preview created');
        resolve(e.target.result);
      };

      reader.onerror = (err) => {
        console.error('[ProfileFileService] Error creating preview:', err);
        reject(err);
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Format file size for display
   * Converts bytes to human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
