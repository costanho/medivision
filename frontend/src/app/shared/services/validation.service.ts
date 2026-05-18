import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private validationErrors$ = new BehaviorSubject<ValidationError[]>([]);

  // Validation rules
  private readonly MESSAGE_MIN_LENGTH = 1;
  private readonly MESSAGE_MAX_LENGTH = 5000;
  private readonly CONVERSATION_ID_MIN = 1;
  private readonly CONVERSATION_ID_MAX = 999999999;
  private readonly USER_ID_MIN = 1;
  private readonly USER_ID_MAX = 999999999;

  constructor() {}

  /**
   * Validate message content
   * - Non-empty
   * - Not just whitespace
   * - Within length limits
   * - No excessive special characters
   */
  validateMessage(content: string | null | undefined): ValidationResult {
    const errors: ValidationError[] = [];

    if (!content || typeof content !== 'string') {
      errors.push({
        field: 'content',
        message: 'Message is required',
        code: 'MESSAGE_REQUIRED',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const trimmed = content.trim();

    // Check if empty or whitespace only
    if (trimmed.length === 0) {
      errors.push({
        field: 'content',
        message: 'Message cannot be empty or contain only whitespace',
        code: 'MESSAGE_EMPTY',
        severity: 'error'
      });
    }

    // Check minimum length
    if (trimmed.length < this.MESSAGE_MIN_LENGTH) {
      errors.push({
        field: 'content',
        message: `Message must be at least ${this.MESSAGE_MIN_LENGTH} character`,
        code: 'MESSAGE_TOO_SHORT',
        severity: 'error'
      });
    }

    // Check maximum length
    if (trimmed.length > this.MESSAGE_MAX_LENGTH) {
      errors.push({
        field: 'content',
        message: `Message must be no more than ${this.MESSAGE_MAX_LENGTH} characters (${trimmed.length}/${this.MESSAGE_MAX_LENGTH})`,
        code: 'MESSAGE_TOO_LONG',
        severity: 'error'
      });
    }

    // Check for excessive special characters (potential injection)
    const specialCharCount = (trimmed.match(/[<>{}[\]]/g) || []).length;
    if (specialCharCount > 5) {
      errors.push({
        field: 'content',
        message: 'Message contains too many special characters',
        code: 'MESSAGE_SUSPICIOUS_CONTENT',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Validate conversation ID
   * - Must be a number
   * - Must be within valid range
   * - Must be positive
   */
  validateConversationId(id: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (id === null || id === undefined) {
      errors.push({
        field: 'conversationId',
        message: 'Conversation ID is required',
        code: 'CONVERSATION_ID_REQUIRED',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const numId = Number(id);

    // Check if valid number
    if (isNaN(numId)) {
      errors.push({
        field: 'conversationId',
        message: 'Conversation ID must be a valid number',
        code: 'CONVERSATION_ID_INVALID_FORMAT',
        severity: 'error'
      });
    }

    // Check if positive
    if (!isNaN(numId) && numId < this.CONVERSATION_ID_MIN) {
      errors.push({
        field: 'conversationId',
        message: 'Conversation ID must be positive',
        code: 'CONVERSATION_ID_NEGATIVE',
        severity: 'error'
      });
    }

    // Check if within range
    if (!isNaN(numId) && numId > this.CONVERSATION_ID_MAX) {
      errors.push({
        field: 'conversationId',
        message: `Conversation ID must be less than ${this.CONVERSATION_ID_MAX}`,
        code: 'CONVERSATION_ID_OUT_OF_RANGE',
        severity: 'error'
      });
    }

    // Check if integer
    if (!isNaN(numId) && !Number.isInteger(numId)) {
      errors.push({
        field: 'conversationId',
        message: 'Conversation ID must be an integer',
        code: 'CONVERSATION_ID_NOT_INTEGER',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user ID
   * - Must be a number
   * - Must be within valid range
   * - Must be positive
   */
  validateUserId(id: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (id === null || id === undefined) {
      errors.push({
        field: 'userId',
        message: 'User ID is required',
        code: 'USER_ID_REQUIRED',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const numId = Number(id);

    if (isNaN(numId)) {
      errors.push({
        field: 'userId',
        message: 'User ID must be a valid number',
        code: 'USER_ID_INVALID_FORMAT',
        severity: 'error'
      });
    }

    if (!isNaN(numId) && numId < this.USER_ID_MIN) {
      errors.push({
        field: 'userId',
        message: 'User ID must be positive',
        code: 'USER_ID_NEGATIVE',
        severity: 'error'
      });
    }

    if (!isNaN(numId) && numId > this.USER_ID_MAX) {
      errors.push({
        field: 'userId',
        message: `User ID must be less than ${this.USER_ID_MAX}`,
        code: 'USER_ID_OUT_OF_RANGE',
        severity: 'error'
      });
    }

    if (!isNaN(numId) && !Number.isInteger(numId)) {
      errors.push({
        field: 'userId',
        message: 'User ID must be an integer',
        code: 'USER_ID_NOT_INTEGER',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user has permission to access conversation
   * Check if currentUserId is participant in conversation
   */
  validateConversationAccess(conversationId: any, currentUserId: any, participants?: number[]): ValidationResult {
    const errors: ValidationError[] = [];

    // First validate IDs
    const idValidation = this.validateConversationId(conversationId);
    if (!idValidation.isValid) {
      return idValidation;
    }

    const userValidation = this.validateUserId(currentUserId);
    if (!userValidation.isValid) {
      return userValidation;
    }

    // Check if user is in participants list
    if (participants && Array.isArray(participants)) {
      if (!participants.includes(Number(currentUserId))) {
        errors.push({
          field: 'conversationId',
          message: 'You do not have permission to access this conversation',
          code: 'ACCESS_DENIED',
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format
   */
  validateEmail(email: string | null | undefined): ValidationResult {
    const errors: ValidationError[] = [];

    if (!email || typeof email !== 'string') {
      errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'EMAIL_REQUIRED',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const trimmed = email.trim();

    if (trimmed.length === 0) {
      errors.push({
        field: 'email',
        message: 'Email cannot be empty',
        code: 'EMAIL_EMPTY',
        severity: 'error'
      });
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      errors.push({
        field: 'email',
        message: 'Email format is invalid',
        code: 'EMAIL_INVALID_FORMAT',
        severity: 'error'
      });
    }

    if (trimmed.length > 254) {
      errors.push({
        field: 'email',
        message: 'Email is too long (max 254 characters)',
        code: 'EMAIL_TOO_LONG',
        severity: 'error'
      });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Validate date is in the future
   */
  validateFutureDate(date: Date | null | undefined, fieldName = 'Date'): ValidationResult {
    const errors: ValidationError[] = [];

    if (!date) {
      errors.push({
        field: 'date',
        message: `${fieldName} is required`,
        code: 'DATE_REQUIRED',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      errors.push({
        field: 'date',
        message: `${fieldName} must be a valid date`,
        code: 'DATE_INVALID',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const now = new Date();
    if (date <= now) {
      errors.push({
        field: 'date',
        message: `${fieldName} must be in the future`,
        code: 'DATE_IN_PAST',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate date is in the past (for historical data)
   */
  validatePastDate(date: Date | null | undefined, fieldName = 'Date'): ValidationResult {
    const errors: ValidationError[] = [];

    if (!date) {
      errors.push({
        field: 'date',
        message: `${fieldName} is required`,
        code: 'DATE_REQUIRED',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      errors.push({
        field: 'date',
        message: `${fieldName} must be a valid date`,
        code: 'DATE_INVALID',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const now = new Date();
    if (date > now) {
      errors.push({
        field: 'date',
        message: `${fieldName} must be in the past`,
        code: 'DATE_IN_FUTURE',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate URL format
   */
  validateUrl(url: string | null | undefined): ValidationResult {
    const errors: ValidationError[] = [];

    if (!url || typeof url !== 'string') {
      errors.push({
        field: 'url',
        message: 'URL is required',
        code: 'URL_REQUIRED',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    try {
      new URL(url);
    } catch {
      errors.push({
        field: 'url',
        message: 'URL format is invalid',
        code: 'URL_INVALID_FORMAT',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate form object with multiple fields
   * Accepts custom validation rules
   */
  validateForm(
    data: Record<string, any>,
    rules: Record<string, (value: any) => ValidationError | null>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      const error = rule(value);
      if (error) {
        errors.push(error);
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Get validation errors as observable
   */
  getValidationErrors$(): Observable<ValidationError[]> {
    return this.validationErrors$.asObservable();
  }

  /**
   * Set validation errors (for displaying to user)
   */
  setValidationErrors(errors: ValidationError[]): void {
    this.validationErrors$.next(errors);
  }

  /**
   * Clear validation errors
   */
  clearValidationErrors(): void {
    this.validationErrors$.next([]);
  }

  /**
   * Add a validation error
   */
  addValidationError(error: ValidationError): void {
    const current = this.validationErrors$.value;
    const updated = [...current, error];
    this.validationErrors$.next(updated);
  }

  /**
   * Remove validation error by field
   */
  removeValidationError(field: string): void {
    const current = this.validationErrors$.value;
    const updated = current.filter(e => e.field !== field);
    this.validationErrors$.next(updated);
  }

  /**
   * Get errors for specific field
   */
  getErrorsForField(field: string): ValidationError[] {
    return this.validationErrors$.value.filter(e => e.field === field);
  }

  /**
   * Check if has errors for field
   */
  hasErrorsForField(field: string): boolean {
    return this.getErrorsForField(field).length > 0;
  }

  /**
   * Get all error messages as strings
   */
  getErrorMessages(): string[] {
    return this.validationErrors$.value.map(e => e.message);
  }

  /**
   * Get error messages for specific field
   */
  getErrorMessagesForField(field: string): string[] {
    return this.getErrorsForField(field).map(e => e.message);
  }
}
