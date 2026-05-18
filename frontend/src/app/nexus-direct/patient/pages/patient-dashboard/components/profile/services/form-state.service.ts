import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * FormStateService
 *
 * Manages form state for the profile component including:
 * - Active tab (personal, more, security)
 * - Edit mode state
 * - Form submission status
 * - Error and success messages
 */
@Injectable({
  providedIn: 'root'
})
export class FormStateService {
  // Tab state
  private activeTabSubject = new BehaviorSubject<string>('personal');
  activeTab$ = this.activeTabSubject.asObservable();

  // Edit mode state
  private editingSubject = new BehaviorSubject<boolean>(false);
  editing$ = this.editingSubject.asObservable();

  // Submission state
  private submittedSubject = new BehaviorSubject<boolean>(false);
  submitted$ = this.submittedSubject.asObservable();

  // Saving state
  private savingSubject = new BehaviorSubject<boolean>(false);
  saving$ = this.savingSubject.asObservable();

  // Messages
  private errorSubject = new BehaviorSubject<string>('');
  error$ = this.errorSubject.asObservable();

  private successSubject = new BehaviorSubject<string>('');
  success$ = this.successSubject.asObservable();

  constructor() {}

  // ──────────────────────────────────────────────────────────────────
  // TAB MANAGEMENT
  // ──────────────────────────────────────────────────────────────────

  selectTab(tab: string): void {
    console.log(`[FormStateService] Selecting tab: ${tab}`);
    this.activeTabSubject.next(tab);
    this.clearMessages();
    this.setEditing(false);
  }

  getActiveTab(): string {
    return this.activeTabSubject.getValue();
  }

  // ──────────────────────────────────────────────────────────────────
  // EDIT MODE
  // ──────────────────────────────────────────────────────────────────

  toggleEdit(): void {
    const currentState = this.editingSubject.getValue();
    console.log(`[FormStateService] Toggling edit mode: ${currentState} -> ${!currentState}`);
    this.editingSubject.next(!currentState);
    this.resetSubmitted();
    this.clearMessages();
  }

  setEditing(editing: boolean): void {
    this.editingSubject.next(editing);
    if (!editing) {
      this.resetSubmitted();
    }
  }

  isEditing(): boolean {
    return this.editingSubject.getValue();
  }

  // ──────────────────────────────────────────────────────────────────
  // SUBMISSION STATE
  // ──────────────────────────────────────────────────────────────────

  setSubmitted(submitted: boolean): void {
    console.log(`[FormStateService] Setting submitted state: ${submitted}`);
    this.submittedSubject.next(submitted);
  }

  resetSubmitted(): void {
    this.submittedSubject.next(false);
  }

  isSubmitted(): boolean {
    return this.submittedSubject.getValue();
  }

  // ──────────────────────────────────────────────────────────────────
  // SAVING STATE
  // ──────────────────────────────────────────────────────────────────

  setSaving(saving: boolean): void {
    console.log(`[FormStateService] Setting saving state: ${saving}`);
    this.savingSubject.next(saving);
  }

  isSaving(): boolean {
    return this.savingSubject.getValue();
  }

  // ──────────────────────────────────────────────────────────────────
  // MESSAGES
  // ──────────────────────────────────────────────────────────────────

  setError(message: string): void {
    console.log(`[FormStateService] Setting error: ${message}`);
    this.errorSubject.next(message);
  }

  setSuccess(message: string): void {
    console.log(`[FormStateService] Setting success: ${message}`);
    this.successSubject.next(message);
    // Auto-clear success message after 3 seconds
    setTimeout(() => {
      if (this.successSubject.getValue() === message) {
        this.successSubject.next('');
      }
    }, 3000);
  }

  getError(): string {
    return this.errorSubject.getValue();
  }

  getSuccess(): string {
    return this.successSubject.getValue();
  }

  clearMessages(): void {
    this.errorSubject.next('');
    this.successSubject.next('');
  }

  // ──────────────────────────────────────────────────────────────────
  // BULK STATE RESET
  // ──────────────────────────────────────────────────────────────────

  resetState(): void {
    console.log('[FormStateService] Resetting all state');
    this.activeTabSubject.next('personal');
    this.editingSubject.next(false);
    this.submittedSubject.next(false);
    this.savingSubject.next(false);
    this.clearMessages();
  }
}
