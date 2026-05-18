/**
 * Read Receipt Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { ReadReceiptService, MessageReadStatus, ReadReceipt } from './read-receipt.service';
import { ReadReceiptEvent } from './models';

describe('ReadReceiptService', () => {
  let service: ReadReceiptService;

  const mockReadReceipt: ReadReceiptEvent = {
    eventType: 'read',
    messageId: 123,
    conversationId: 1,
    readerId: 2,
    readerName: 'John Doe',
    timestamp: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReadReceiptService]
    });

    service = TestBed.inject(ReadReceiptService);
    service.setCurrentUser(1, 'Test User');
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  // ═══════════════════════════════════════════════════════════════
  // Service Initialization
  // ═══════════════════════════════════════════════════════════════

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should set current user', () => {
      service.setCurrentUser(1, 'Test User');
      expect(service).toBeTruthy();
    });

    it('should set current conversation', () => {
      service.setCurrentConversation(1);
      expect(service).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Message Visibility
  // ═══════════════════════════════════════════════════════════════

  describe('Message Visibility', () => {
    it('should mark message as visible', (done) => {
      service.visibilityChanged$
        .subscribe(visibility => {
          expect(visibility.isVisible).toBe(true);
          expect(visibility.messageId).toBe(123);
          done();
        });

      service.markMessageVisible(123, 1);
    });

    it('should mark message as not visible', (done) => {
      service.markMessageVisible(123, 1);

      service.visibilityChanged$
        .subscribe(visibility => {
          if (!visibility.isVisible) {
            expect(visibility.messageId).toBe(123);
            done();
          }
        });

      service.markMessageNotVisible(123);
    });

    it('should track visibility duration', (done) => {
      service.markMessageVisible(123, 1);

      setTimeout(() => {
        service.markMessageNotVisible(123);

        const visibility = service.getMessageVisibility(123);
        expect(visibility?.visibilityDuration).toBeGreaterThanOrEqual(0);
        done();
      }, 100);
    });

    it('should track last visible time', () => {
      service.markMessageVisible(123, 1);

      const visibility1 = service.getMessageVisibility(123);
      expect(visibility1?.visibleAt).toBeDefined();

      service.markMessageNotVisible(123);

      const visibility2 = service.getMessageVisibility(123);
      expect(visibility2?.lastVisibleAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Message Read Status
  // ═══════════════════════════════════════════════════════════════

  describe('Message Read Status', () => {
    it('should mark message as read', (done) => {
      service.messageRead$
        .subscribe(status => {
          expect(status.isRead).toBe(true);
          expect(status.messageId).toBe(123);
          done();
        });

      service.markMessageAsRead(123, 1);
    });

    it('should track read timestamp', () => {
      const beforeRead = new Date();
      service.markMessageAsRead(123, 1);
      const afterRead = new Date();

      const status = service.getMessageReadStatus(123);
      expect(status?.readAt).toBeDefined();
      expect(status?.readAt!.getTime()).toBeGreaterThanOrEqual(beforeRead.getTime());
      expect(status?.readAt!.getTime()).toBeLessThanOrEqual(afterRead.getTime());
    });

    it('should track who read the message', () => {
      service.setCurrentUser(5, 'Reader Name');
      service.markMessageAsRead(123, 1);

      const status = service.getMessageReadStatus(123);
      expect(status?.readBy).toBe(5);
      expect(status?.readByName).toBe('Reader Name');
    });

    it('should use custom read timestamp', () => {
      const customTime = new Date('2024-01-15T10:30:00Z');
      service.markMessageAsRead(123, 1, customTime);

      const status = service.getMessageReadStatus(123);
      expect(status?.readAt).toEqual(customTime);
    });

    it('should mark multiple messages as read', (done) => {
      let readCount = 0;

      service.messageRead$
        .subscribe(() => {
          readCount++;
          if (readCount === 3) {
            expect(readCount).toBe(3);
            done();
          }
        });

      service.markMessagesAsRead([1, 2, 3], 1);
    });

    it('should get message read status', () => {
      service.markMessageAsRead(123, 1);

      const status = service.getMessageReadStatus(123);
      expect(status).toBeDefined();
      expect(status?.messageId).toBe(123);
      expect(status?.isRead).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Incoming Read Receipts
  // ═══════════════════════════════════════════════════════════════

  describe('Incoming Read Receipts', () => {
    it('should handle incoming read receipt', (done) => {
      service.readReceipt$
        .subscribe(receipt => {
          expect(receipt.messageId).toBe(mockReadReceipt.messageId);
          expect(receipt.readerId).toBe(mockReadReceipt.readerId);
          done();
        });

      service.handleReadReceipt(mockReadReceipt);
    });

    it('should store read receipt', () => {
      service.handleReadReceipt(mockReadReceipt);

      const receipt = service.getReadReceipt(123);
      expect(receipt).toBeDefined();
      expect(receipt?.readerId).toBe(2);
    });

    it('should check if message is read', () => {
      expect(service.isMessageRead(123)).toBe(false);

      service.handleReadReceipt(mockReadReceipt);

      expect(service.isMessageRead(123)).toBe(true);
    });

    it('should handle batch read receipts', (done) => {
      let receiptCount = 0;

      service.readReceipt$
        .subscribe(() => {
          receiptCount++;
          if (receiptCount === 3) {
            expect(receiptCount).toBe(3);
            done();
          }
        });

      const receipts: ReadReceiptEvent[] = [
        { ...mockReadReceipt, messageId: 1 },
        { ...mockReadReceipt, messageId: 2 },
        { ...mockReadReceipt, messageId: 3 }
      ];

      service.handleBatchReadReceipts(receipts);
    });

    it('should get all read receipts', () => {
      service.handleReadReceipt(mockReadReceipt);
      service.handleReadReceipt({ ...mockReadReceipt, messageId: 456 });

      const receipts = service.getAllReadReceipts();
      expect(receipts.length).toBe(2);
    });

    it('should get conversation read receipts', () => {
      service.handleReadReceipt(mockReadReceipt);
      service.handleReadReceipt({ ...mockReadReceipt, messageId: 456, conversationId: 2 });

      const receipts = service.getConversationReadReceipts(1);
      expect(receipts.length).toBe(1);
      expect(receipts[0].conversationId).toBe(1);
    });

    it('should update read receipts map on new receipt', (done) => {
      service.readReceiptsMap$
        .subscribe(map => {
          if (map.size > 0) {
            expect(map.has(123)).toBe(true);
            done();
          }
        });

      service.handleReadReceipt(mockReadReceipt);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Batch Processing
  // ═══════════════════════════════════════════════════════════════

  describe('Batch Processing', () => {
    it('should emit batch ready event', (done) => {
      service.batchReady$
        .subscribe(batch => {
          expect(batch.messageIds.length).toBe(1);
          expect(batch.conversationId).toBe(1);
          done();
        });

      service.setCurrentConversation(1);
      service.markMessageAsRead(123, 1);
    });

    it('should batch multiple messages', (done) => {
      let batchEmitted = false;

      service.batchReady$
        .subscribe(batch => {
          batchEmitted = true;
          expect(batch.messageIds.length).toBeGreaterThan(1);
        });

      service.setCurrentConversation(1);
      service.markMessageAsRead(1, 1);
      service.markMessageAsRead(2, 1);
      service.markMessageAsRead(3, 1);

      setTimeout(() => {
        expect(batchEmitted).toBe(true);
        done();
      }, 1000);
    });

    it('should flush batch when conversation changes', (done) => {
      service.setCurrentConversation(1);
      service.markMessageAsRead(1, 1);

      service.batchReady$
        .subscribe(batch => {
          expect(batch.conversationId).toBe(1);
          done();
        });

      service.setCurrentConversation(2);
    });

    it('should mark all visible as read', (done) => {
      let readCount = 0;

      service.messageRead$
        .subscribe(() => {
          readCount++;
        });

      service.markMessageVisible(1, 1);
      service.markMessageVisible(2, 1);
      service.markMessageVisible(3, 1);

      service.markAllVisibleAsRead(1);

      setTimeout(() => {
        expect(readCount).toBeGreaterThanOrEqual(3);
        done();
      }, 200);
    });

    it('should mark all conversation as read', (done) => {
      let readCount = 0;

      service.messageRead$
        .subscribe(() => {
          readCount++;
        });

      service.markAllConversationAsRead(1, [1, 2, 3, 4, 5]);

      setTimeout(() => {
        expect(readCount).toBe(5);
        done();
      }, 200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Query Methods
  // ═══════════════════════════════════════════════════════════════

  describe('Query Methods', () => {
    it('should get unread message IDs', () => {
      service.handleReadReceipt(mockReadReceipt);
      service.handleReadReceipt({ ...mockReadReceipt, messageId: 456 });

      const unread = service.getUnreadMessageIds(1, [123, 456, 789]);
      expect(unread.length).toBe(1);
      expect(unread[0]).toBe(789);
    });

    it('should get unread count', () => {
      service.handleReadReceipt(mockReadReceipt);

      const count = service.getUnreadCount(1, [123, 456, 789]);
      expect(count).toBe(2);
    });

    it('should return 0 for empty message list', () => {
      const count = service.getUnreadCount(1, []);
      expect(count).toBe(0);
    });

    it('should return all unread when no receipts', () => {
      const unread = service.getUnreadMessageIds(1, [1, 2, 3]);
      expect(unread.length).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Observable Streams
  // ═══════════════════════════════════════════════════════════════

  describe('Observable Streams', () => {
    it('should emit readReceipt event', (done) => {
      service.readReceipt$
        .subscribe(receipt => {
          expect(receipt).toBeDefined();
          done();
        });

      service.handleReadReceipt(mockReadReceipt);
    });

    it('should emit messageRead event', (done) => {
      service.messageRead$
        .subscribe(status => {
          expect(status).toBeDefined();
          done();
        });

      service.markMessageAsRead(123, 1);
    });

    it('should emit visibilityChanged event', (done) => {
      service.visibilityChanged$
        .subscribe(visibility => {
          expect(visibility).toBeDefined();
          done();
        });

      service.markMessageVisible(123, 1);
    });

    it('should provide read receipts map', (done) => {
      let mapReceived = false;

      service.readReceiptsMap$
        .subscribe(map => {
          if (map.size > 0) {
            mapReceived = true;
            expect(map.has(123)).toBe(true);
            done();
          }
        });

      service.handleReadReceipt(mockReadReceipt);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Clear & Reset
  // ═══════════════════════════════════════════════════════════════

  describe('Clear & Reset', () => {
    it('should clear all read receipts', () => {
      service.handleReadReceipt(mockReadReceipt);
      service.handleReadReceipt({ ...mockReadReceipt, messageId: 456 });

      expect(service.getAllReadReceipts().length).toBe(2);

      service.clearReadReceipts();

      expect(service.getAllReadReceipts().length).toBe(0);
    });

    it('should clear conversation receipts', () => {
      service.handleReadReceipt(mockReadReceipt);
      service.handleReadReceipt({ ...mockReadReceipt, messageId: 456, conversationId: 2 });

      service.clearConversationReceipts(1);

      expect(service.getConversationReadReceipts(1).length).toBe(0);
      expect(service.getConversationReadReceipts(2).length).toBe(1);
    });

    it('should not affect other conversations when clearing', () => {
      service.handleReadReceipt(mockReadReceipt);
      service.handleReadReceipt({ ...mockReadReceipt, messageId: 456, conversationId: 2 });

      service.clearConversationReceipts(1);

      const receipts2 = service.getConversationReadReceipts(2);
      expect(receipts2.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle rapid visibility changes', () => {
      for (let i = 0; i < 10; i++) {
        service.markMessageVisible(i, 1);
        service.markMessageNotVisible(i);
      }

      expect(service.getAllReadReceipts().length).toBe(0);
    });

    it('should handle marking already read message', () => {
      service.handleReadReceipt(mockReadReceipt);
      expect(service.isMessageRead(123)).toBe(true);

      service.handleReadReceipt(mockReadReceipt);
      expect(service.isMessageRead(123)).toBe(true);
    });

    it('should handle multiple read receipts for same message', () => {
      service.handleReadReceipt(mockReadReceipt);
      service.handleReadReceipt({ ...mockReadReceipt, readerId: 3, readerName: 'Jane' });

      // Last receipt wins
      const receipt = service.getReadReceipt(123);
      expect(receipt?.readerId).toBe(3);
    });

    it('should handle large batch of messages', () => {
      const messageIds = Array.from({ length: 100 }, (_, i) => i + 1);

      expect(() => {
        service.markMessagesAsRead(messageIds, 1);
      }).not.toThrow();
    });

    it('should handle set current conversation with pending batch', (done) => {
      service.setCurrentConversation(1);
      service.markMessageAsRead(1, 1);

      service.batchReady$
        .subscribe(batch => {
          expect(batch.conversationId).toBe(1);
          done();
        });

      service.setCurrentConversation(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should destroy gracefully', () => {
      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });

    it('should flush batch on destroy', (done) => {
      service.setCurrentConversation(1);
      service.markMessageAsRead(123, 1);

      service.batchReady$
        .subscribe(batch => {
          expect(batch.messageIds.length).toBeGreaterThan(0);
          done();
        });

      service.ngOnDestroy();
    });
  });
});
