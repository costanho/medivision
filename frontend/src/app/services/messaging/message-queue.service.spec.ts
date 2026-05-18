/**
 * Message Queue Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { MessageQueueService } from './message-queue.service';
import { QueuedMessage } from './models';

describe('MessageQueueService', () => {
  let service: MessageQueueService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MessageQueueService]
    });

    service = TestBed.inject(MessageQueueService);
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    service.ngOnDestroy();
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have default configuration', () => {
      const config = service.getConfig();
      expect(config.queueMessage).toBe(true);
      expect(config.maxQueueSize).toBe(500);
      expect(config.persistQueue).toBe(true);
      expect(config.ttl).toBe(24 * 60 * 60 * 1000);
    });

    it('should start with empty queue', () => {
      expect(service.isEmpty()).toBe(true);
      expect(service.getQueueSize()).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      service.setConfig({
        maxQueueSize: 100,
        persistQueue: false
      });

      const config = service.getConfig();
      expect(config.maxQueueSize).toBe(100);
      expect(config.persistQueue).toBe(false);
    });

    it('should set priority in configuration', () => {
      service.setConfig({ priority: 'high' });

      const config = service.getConfig();
      expect(config.priority).toBe('high');
    });
  });

  describe('Message Queueing', () => {
    it('should enqueue message with default priority', () => {
      const message = service.enqueueMessage('message', { content: 'test' });

      expect(message).toBeDefined();
      expect(message.type).toBe('message');
      expect(message.priority).toBe('normal');
      expect(service.getQueueSize()).toBe(1);
    });

    it('should enqueue message with custom priority', () => {
      const message = service.enqueueMessage('message', { content: 'test' }, 'high');

      expect(message.priority).toBe('high');
    });

    it('should enqueue multiple messages', () => {
      service.enqueueMessage('message', { content: 'msg1' });
      service.enqueueMessage('typing', { isTyping: true });
      service.enqueueMessage('read', { messageId: 1 });

      expect(service.getQueueSize()).toBe(3);
    });

    it('should generate unique message IDs', () => {
      const msg1 = service.enqueueMessage('message', { content: 'test1' });
      const msg2 = service.enqueueMessage('message', { content: 'test2' });

      expect(msg1.id).not.toEqual(msg2.id);
    });

    it('should set conversation and recipient IDs', () => {
      const message = service.enqueueMessage(
        'message',
        { content: 'test' },
        'normal',
        123,
        456
      );

      expect(message.conversationId).toBe(123);
      expect(message.recipientId).toBe(456);
    });

    it('should reject enqueue when queuing disabled', () => {
      service.setConfig({ queueMessage: false });

      expect(() => {
        service.enqueueMessage('message', { content: 'test' });
      }).toThrow();
    });

    it('should emit messageQueued event', (done) => {
      service.messageQueued.subscribe(message => {
        expect(message.type).toBe('message');
        done();
      });

      service.enqueueMessage('message', { content: 'test' });
    });
  });

  describe('Message Dequeuing', () => {
    it('should dequeue message by ID', () => {
      const queued = service.enqueueMessage('message', { content: 'test' });
      const dequeued = service.dequeueMessage(queued.id);

      expect(dequeued).toBeDefined();
      expect(dequeued?.id).toEqual(queued.id);
      expect(service.isEmpty()).toBe(true);
    });

    it('should return undefined for non-existent ID', () => {
      const dequeued = service.dequeueMessage('non-existent');

      expect(dequeued).toBeUndefined();
    });

    it('should emit messageDequeued event', (done) => {
      const queued = service.enqueueMessage('message', { content: 'test' });

      service.messageDequeued.subscribe(message => {
        expect(message.id).toEqual(queued.id);
        done();
      });

      service.dequeueMessage(queued.id);
    });
  });

  describe('Message Retrieval', () => {
    beforeEach(() => {
      service.enqueueMessage('message', { content: 'msg1' }, 'normal', 1);
      service.enqueueMessage('typing', { isTyping: true }, 'high', 1);
      service.enqueueMessage('read', { messageId: 1 }, 'low', 1);
      service.enqueueMessage('message', { content: 'msg2' }, 'normal', 2);
    });

    it('should get next message by priority', () => {
      const next = service.getNextMessage();

      expect(next?.priority).toBe('high');
      expect(next?.type).toBe('typing');
    });

    it('should get all messages', () => {
      const all = service.getAllMessages();

      expect(all.length).toBe(4);
    });

    it('should get messages by type', () => {
      const messages = service.getMessagesByType('message');

      expect(messages.length).toBe(2);
      messages.forEach(m => expect(m.type).toBe('message'));
    });

    it('should get messages by conversation', () => {
      const messages = service.getMessagesByConversation(1);

      expect(messages.length).toBe(3);
    });

    it('should get message by ID', () => {
      const queued = service.enqueueMessage('message', { content: 'test' });
      const retrieved = service.getMessage(queued.id);

      expect(retrieved?.id).toEqual(queued.id);
    });
  });

  describe('Priority Ordering', () => {
    it('should return high priority message first', () => {
      service.enqueueMessage('message', { content: 'low' }, 'low');
      service.enqueueMessage('message', { content: 'high' }, 'high');
      service.enqueueMessage('message', { content: 'normal' }, 'normal');

      const next = service.getNextMessage();
      expect(next?.priority).toBe('high');
    });

    it('should return oldest message of same priority', () => {
      const msg1 = service.enqueueMessage('message', { content: 'first' }, 'normal');
      const msg2 = service.enqueueMessage('message', { content: 'second' }, 'normal');

      const next = service.getNextMessage();
      expect(next?.id).toEqual(msg1.id);
    });
  });

  describe('Attempt Tracking', () => {
    it('should track attempt count', () => {
      const queued = service.enqueueMessage('message', { content: 'test' });
      expect(queued.attemptCount).toBe(0);

      service.updateAttemptCount(queued.id);
      const updated = service.getMessage(queued.id);

      expect(updated?.attemptCount).toBe(1);
    });

    it('should update last attempt time', () => {
      const queued = service.enqueueMessage('message', { content: 'test' });
      const beforeUpdate = Date.now();

      service.updateAttemptCount(queued.id);
      const updated = service.getMessage(queued.id);

      expect(updated?.lastAttemptAt).toBeDefined();
      expect(updated?.lastAttemptAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('should increment attempts multiple times', () => {
      const queued = service.enqueueMessage('message', { content: 'test' });

      service.updateAttemptCount(queued.id);
      service.updateAttemptCount(queued.id);
      service.updateAttemptCount(queued.id);

      const updated = service.getMessage(queued.id);
      expect(updated?.attemptCount).toBe(3);
    });
  });

  describe('Queue Clearing', () => {
    it('should clear entire queue', () => {
      service.enqueueMessage('message', { content: 'msg1' });
      service.enqueueMessage('typing', { isTyping: true });
      service.enqueueMessage('read', { messageId: 1 });

      expect(service.getQueueSize()).toBe(3);

      service.clearQueue();
      expect(service.isEmpty()).toBe(true);
    });

    it('should clear queue by type', () => {
      service.enqueueMessage('message', { content: 'msg1' });
      service.enqueueMessage('message', { content: 'msg2' });
      service.enqueueMessage('typing', { isTyping: true });

      service.clearQueueByType('message');

      expect(service.getQueueSize()).toBe(1);
      expect(service.getMessage('typing')).toBeUndefined();
    });

    it('should clear queue by conversation', () => {
      service.enqueueMessage('message', { content: 'msg1' }, 'normal', 1);
      service.enqueueMessage('message', { content: 'msg2' }, 'normal', 1);
      service.enqueueMessage('message', { content: 'msg3' }, 'normal', 2);

      service.clearQueueByConversation(1);

      expect(service.getQueueSize()).toBe(1);
    });

    it('should emit queueCleared event', (done) => {
      service.enqueueMessage('message', { content: 'test' });

      service.queueCleared.subscribe(() => {
        expect(service.isEmpty()).toBe(true);
        done();
      });

      service.clearQueue();
    });
  });

  describe('Queue Statistics', () => {
    it('should get stats with empty queue', () => {
      const stats = service.getStats();

      expect(stats.totalQueued).toBe(0);
      expect(stats.highPriority).toBe(0);
      expect(stats.normalPriority).toBe(0);
      expect(stats.lowPriority).toBe(0);
      expect(stats.oldestMessageAge).toBe(0);
    });

    it('should count priorities correctly', () => {
      service.enqueueMessage('message', { content: 'h1' }, 'high');
      service.enqueueMessage('message', { content: 'h2' }, 'high');
      service.enqueueMessage('message', { content: 'n1' }, 'normal');
      service.enqueueMessage('message', { content: 'l1' }, 'low');

      const stats = service.getStats();

      expect(stats.highPriority).toBe(2);
      expect(stats.normalPriority).toBe(1);
      expect(stats.lowPriority).toBe(1);
      expect(stats.totalQueued).toBe(4);
    });

    it('should get oldest message age', (done) => {
      service.enqueueMessage('message', { content: 'old' });

      setTimeout(() => {
        const stats = service.getStats();
        expect(stats.oldestMessageAge).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should calculate total bytes', () => {
      service.enqueueMessage('message', { content: 'test content' });
      service.enqueueMessage('typing', { isTyping: true });

      const stats = service.getStats();
      expect(stats.totalBytes).toBeGreaterThan(0);
    });
  });

  describe('Queue Size Management', () => {
    it('should enforce max queue size', () => {
      service.setConfig({ maxQueueSize: 3 });

      service.enqueueMessage('message', { content: 'msg1' });
      service.enqueueMessage('message', { content: 'msg2' });
      service.enqueueMessage('message', { content: 'msg3' });

      expect(() => {
        service.enqueueMessage('message', { content: 'msg4' });
      }).toThrow();
    });

    it('should remove low priority message when full', () => {
      service.setConfig({ maxQueueSize: 2 });

      service.enqueueMessage('message', { content: 'high' }, 'high');
      service.enqueueMessage('message', { content: 'low' }, 'low');

      expect(service.getQueueSize()).toBe(2);

      service.enqueueMessage('message', { content: 'normal' }, 'normal');

      expect(service.getQueueSize()).toBe(2);
      // Low priority should be removed
      const messages = service.getAllMessages();
      expect(messages.every(m => m.priority !== 'low')).toBe(true);
    });

    it('should report queue full status', () => {
      service.setConfig({ maxQueueSize: 2 });

      service.enqueueMessage('message', { content: 'msg1' });
      expect(service.isFull()).toBe(false);

      service.enqueueMessage('message', { content: 'msg2' });
      expect(service.isFull()).toBe(true);
    });
  });

  describe('Storage Persistence', () => {
    it('should save to storage when enabled', () => {
      service.setConfig({ persistQueue: true });
      service.enqueueMessage('message', { content: 'test' });

      const stored = localStorage.getItem('messaging_queue');
      expect(stored).toBeTruthy();
    });

    it('should load from storage on init', () => {
      service.setConfig({ persistQueue: true });
      service.enqueueMessage('message', { content: 'test' });

      // Create new instance
      const service2 = TestBed.inject(MessageQueueService);
      expect(service2.getQueueSize()).toBe(1);

      service2.ngOnDestroy();
    });

    it('should not save to storage when disabled', () => {
      service.setConfig({ persistQueue: false });
      service.enqueueMessage('message', { content: 'test' });

      const stored = localStorage.getItem('messaging_queue');
      expect(stored).toBeFalsy();
    });

    it('should restore Date objects from storage', () => {
      service.setConfig({ persistQueue: true });
      const queued = service.enqueueMessage('message', { content: 'test' });

      const service2 = TestBed.inject(MessageQueueService);
      const messages = service2.getAllMessages();

      expect(messages[0].queuedAt instanceof Date).toBe(true);
      service2.ngOnDestroy();
    });
  });

  describe('Queue Stats Observable', () => {
    it('should emit initial stats', (done) => {
      service.queueStats.subscribe(stats => {
        expect(stats.totalQueued).toBe(0);
        done();
      });
    });

    it('should emit updated stats', (done) => {
      let emissionCount = 0;

      service.queueStats.subscribe(stats => {
        emissionCount++;

        if (emissionCount === 2) {
          expect(stats.totalQueued).toBe(1);
          done();
        }
      });

      service.enqueueMessage('message', { content: 'test' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue retrieval', () => {
      expect(service.getNextMessage()).toBeUndefined();
      expect(service.getAllMessages()).toEqual([]);
    });

    it('should handle dequeue from empty queue', () => {
      const dequeued = service.dequeueMessage('non-existent');
      expect(dequeued).toBeUndefined();
    });

    it('should handle multiple queue clears', () => {
      service.enqueueMessage('message', { content: 'test' });
      service.clearQueue();
      service.clearQueue();

      expect(service.isEmpty()).toBe(true);
    });

    it('should handle update on non-existent message', () => {
      expect(() => {
        service.updateAttemptCount('non-existent');
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      service.enqueueMessage('message', { content: 'test' });

      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();

      expect(service.isEmpty()).toBe(true);
    });
  });
});
