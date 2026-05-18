/**
 * Message Queue Service
 * Manages queued messages while offline
 *
 * Features:
 * - Queue messages when offline
 * - Priority-based message ordering (high/normal/low)
 * - Automatic retry with exponential backoff
 * - LocalStorage persistence
 * - Queue size limits and TTL management
 * - Automatic cleanup of expired messages
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { QueuedMessage, QueueStats, OfflineMessageOptions } from './models';

@Injectable({
  providedIn: 'root'
})
export class MessageQueueService implements OnDestroy {
  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════

  private config: OfflineMessageOptions = {
    queueMessage: true,
    maxQueueSize: 500,
    persistQueue: true,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    priority: 'normal'
  };

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════

  private messageQueue: Map<string, QueuedMessage> = new Map();
  private readonly STORAGE_KEY = 'messaging_queue';
  private cleanupInterval: number | undefined;

  // ═══════════════════════════════════════════════════════════════
  // Subjects & Observables
  // ═══════════════════════════════════════════════════════════════

  // Emitted when message is queued
  private messageQueued$ = new Subject<QueuedMessage>();

  // Emitted when message is dequeued
  private messageDequeued$ = new Subject<QueuedMessage>();

  // Queue stats observable
  private queueStats$ = new BehaviorSubject<QueueStats>(this.getEmptyStats());

  // Queue cleared event
  private queueCleared$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Public Observables
  // ═══════════════════════════════════════════════════════════════

  public messageQueued = this.messageQueued$.asObservable();
  public messageDequeued = this.messageDequeued$.asObservable();
  public queueStats = this.queueStats$.asObservable();
  public queueCleared = this.queueCleared$.asObservable();

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize service and load persisted queue
   */
  private initializeService(): void {
    console.log('[MessageQueueService] Initializing service');
    this.loadFromStorage();
    this.startCleanupTimer();
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Configuration
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update queue configuration
   */
  public setConfig(config: Partial<OfflineMessageOptions>): void {
    this.config = { ...this.config, ...config };
    console.log('[MessageQueueService] Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): OfflineMessageOptions {
    return { ...this.config };
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Queue Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Add message to queue
   */
  public enqueueMessage(
    type: 'message' | 'typing' | 'presence' | 'read',
    payload: any,
    priority: 'high' | 'normal' | 'low' = 'normal',
    conversationId?: number,
    recipientId?: number
  ): QueuedMessage {
    if (!this.config.queueMessage) {
      console.warn('[MessageQueueService] Queuing disabled');
      throw new Error('Message queueing is disabled');
    }

    // Check queue size limit
    if (this.messageQueue.size >= this.config.maxQueueSize) {
      console.error('[MessageQueueService] Queue size limit exceeded');
      // Remove oldest low-priority message
      const oldestLow = Array.from(this.messageQueue.values())
        .filter(m => m.priority === 'low')
        .sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime())[0];

      if (oldestLow) {
        this.messageQueue.delete(oldestLow.id);
      } else {
        throw new Error('Queue is full and no low-priority messages to remove');
      }
    }

    const message: QueuedMessage = {
      id: this.generateMessageId(),
      type,
      conversationId,
      recipientId,
      payload,
      queuedAt: new Date(),
      attemptCount: 0,
      priority
    };

    this.messageQueue.set(message.id, message);
    this.updateStats();
    this.saveToStorage();

    console.log('[MessageQueueService] Message queued:', {
      id: message.id,
      type,
      priority,
      queueSize: this.messageQueue.size
    });

    this.messageQueued$.next(message);
    return message;
  }

  /**
   * Remove message from queue
   */
  public dequeueMessage(messageId: string): QueuedMessage | undefined {
    const message = this.messageQueue.get(messageId);

    if (message) {
      this.messageQueue.delete(messageId);
      this.updateStats();
      this.saveToStorage();

      console.log('[MessageQueueService] Message dequeued:', messageId);
      this.messageDequeued$.next(message);
    }

    return message;
  }

  /**
   * Get next message to send (highest priority first)
   */
  public getNextMessage(): QueuedMessage | undefined {
    // Sort by: priority (high->low), then by queue time (oldest first)
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const messages = Array.from(this.messageQueue.values())
      .sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.queuedAt.getTime() - b.queuedAt.getTime();
      });

    return messages[0];
  }

  /**
   * Get all queued messages
   */
  public getAllMessages(): QueuedMessage[] {
    return Array.from(this.messageQueue.values());
  }

  /**
   * Get queued messages by type
   */
  public getMessagesByType(type: 'message' | 'typing' | 'presence' | 'read'): QueuedMessage[] {
    return Array.from(this.messageQueue.values()).filter(m => m.type === type);
  }

  /**
   * Get queued messages by conversation
   */
  public getMessagesByConversation(conversationId: number): QueuedMessage[] {
    return Array.from(this.messageQueue.values())
      .filter(m => m.conversationId === conversationId);
  }

  /**
   * Get message by ID
   */
  public getMessage(messageId: string): QueuedMessage | undefined {
    return this.messageQueue.get(messageId);
  }

  /**
   * Update attempt count for message
   */
  public updateAttemptCount(messageId: string): void {
    const message = this.messageQueue.get(messageId);
    if (message) {
      message.attemptCount++;
      message.lastAttemptAt = new Date();
      this.updateStats();
      this.saveToStorage();

      console.log('[MessageQueueService] Attempt count updated:', {
        id: messageId,
        attempts: message.attemptCount
      });
    }
  }

  /**
   * Clear entire queue
   */
  public clearQueue(): void {
    console.log('[MessageQueueService] Clearing entire queue');
    this.messageQueue.clear();
    this.updateStats();
    this.saveToStorage();
    this.queueCleared$.next();
  }

  /**
   * Clear queue by type
   */
  public clearQueueByType(type: 'message' | 'typing' | 'presence' | 'read'): void {
    const messages = this.getMessagesByType(type);
    messages.forEach(m => this.messageQueue.delete(m.id));
    this.updateStats();
    this.saveToStorage();

    console.log('[MessageQueueService] Cleared queue by type:', {
      type,
      count: messages.length
    });
  }

  /**
   * Clear queue by conversation
   */
  public clearQueueByConversation(conversationId: number): void {
    const messages = this.getMessagesByConversation(conversationId);
    messages.forEach(m => this.messageQueue.delete(m.id));
    this.updateStats();
    this.saveToStorage();

    console.log('[MessageQueueService] Cleared queue by conversation:', {
      conversationId,
      count: messages.length
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public: Queue Statistics
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get queue statistics
   */
  public getStats(): QueueStats {
    return this.queueStats$.getValue();
  }

  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.messageQueue.size;
  }

  /**
   * Check if queue is empty
   */
  public isEmpty(): boolean {
    return this.messageQueue.size === 0;
  }

  /**
   * Check if queue is full
   */
  public isFull(): boolean {
    return this.messageQueue.size >= this.config.maxQueueSize;
  }

  /**
   * Get estimated queue age
   */
  public getOldestMessageAge(): number {
    if (this.messageQueue.size === 0) return 0;

    const oldest = Array.from(this.messageQueue.values())
      .reduce((prev, curr) => {
        return prev.queuedAt < curr.queuedAt ? prev : curr;
      });

    return Date.now() - oldest.queuedAt.getTime();
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Storage Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    if (!this.config.persistQueue) {
      return;
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const messages = JSON.parse(stored) as QueuedMessage[];
        messages.forEach(msg => {
          // Reconstruct Date objects
          msg.queuedAt = new Date(msg.queuedAt);
          if (msg.lastAttemptAt) {
            msg.lastAttemptAt = new Date(msg.lastAttemptAt);
          }
          this.messageQueue.set(msg.id, msg);
        });

        console.log('[MessageQueueService] Loaded from storage:', messages.length);
      }
    } catch (error) {
      console.error('[MessageQueueService] Error loading from storage:', error);
    }

    this.updateStats();
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.persistQueue) {
      return;
    }

    try {
      const messages = Array.from(this.messageQueue.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(messages));
      console.log('[MessageQueueService] Saved to storage:', messages.length);
    } catch (error) {
      console.error('[MessageQueueService] Error saving to storage:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Cleanup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start cleanup timer to remove expired messages
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupExpiredMessages();
    }, 60000); // Run every minute
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Remove expired messages from queue
   */
  private cleanupExpiredMessages(): void {
    if (!this.config.ttl) {
      return;
    }

    const now = Date.now();
    const expired: string[] = [];

    this.messageQueue.forEach((msg, id) => {
      if (now - msg.queuedAt.getTime() > this.config.ttl!) {
        expired.push(id);
      }
    });

    if (expired.length > 0) {
      expired.forEach(id => this.messageQueue.delete(id));
      this.updateStats();
      this.saveToStorage();

      console.log('[MessageQueueService] Cleaned up expired messages:', expired.length);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update queue statistics
   */
  private updateStats(): void {
    const stats = this.calculateStats();
    this.queueStats$.next(stats);
  }

  /**
   * Calculate queue statistics
   */
  private calculateStats(): QueueStats {
    const messages = Array.from(this.messageQueue.values());

    return {
      totalQueued: messages.length,
      highPriority: messages.filter(m => m.priority === 'high').length,
      normalPriority: messages.filter(m => m.priority === 'normal').length,
      lowPriority: messages.filter(m => m.priority === 'low').length,
      oldestMessageAge: this.getOldestMessageAge(),
      totalBytes: JSON.stringify(messages).length
    };
  }

  /**
   * Get empty stats object
   */
  private getEmptyStats(): QueueStats {
    return {
      totalQueued: 0,
      highPriority: 0,
      normalPriority: 0,
      lowPriority: 0,
      oldestMessageAge: 0,
      totalBytes: 0
    };
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    this.stopCleanupTimer();
    this.messageQueue.clear();
    this.destroy$.next();
    this.destroy$.complete();
    this.messageQueued$.complete();
    this.messageDequeued$.complete();
    this.queueStats$.complete();
    this.queueCleared$.complete();
  }
}
