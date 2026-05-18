/**
 * Message Input Component Unit Tests
 * Tests for message composition, validation, and sending
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MessageInputComponent } from './message-input.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('MessageInputComponent', () => {
  let component: MessageInputComponent;
  let fixture: ComponentFixture<MessageInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageInputComponent, FormsModule, CommonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(MessageInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  // ═══════════════════════════════════════════════════════════════
  // Component Initialization
  // ═══════════════════════════════════════════════════════════════

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty message', () => {
      expect(component.messageContent).toBe('');
    });

    it('should initialize with default inputs', () => {
      expect(component.isSending).toBeFalse();
      expect(component.isDisabled).toBeFalse();
      expect(component.autoFocus).toBeTrue();
      expect(component.maxLength).toBe(5000);
    });

    it('should initialize with zero character count', () => {
      expect(component.characterCount).toBe(0);
    });

    it('should initialize with send button hidden', () => {
      expect(component.showSendButton).toBeFalse();
    });

    it('should focus input on init when autoFocus is true', fakeAsync(() => {
      component.autoFocus = true;
      component.ngOnInit();
      tick(100);

      expect(component.messageInput?.nativeElement.matches(':focus')).toBe(true);
    }));

    it('should not focus input on init when autoFocus is false', fakeAsync(() => {
      component.autoFocus = false;
      component.ngOnInit();
      tick(100);

      expect(component.messageInput?.nativeElement.matches(':focus')).toBe(false);
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Input Validation
  // ═══════════════════════════════════════════════════════════════

  describe('Input Validation', () => {
    it('should detect empty message', () => {
      component.messageContent = '';
      expect(component.isMessageEmpty()).toBeTrue();
    });

    it('should detect non-empty message', () => {
      component.messageContent = 'Hello';
      expect(component.isMessageEmpty()).toBeFalse();
    });

    it('should detect whitespace-only as empty', () => {
      component.messageContent = '   ';
      expect(component.isMessageEmpty()).toBeTrue();
    });

    it('should detect message exceeding max length', () => {
      component.maxLength = 10;
      component.messageContent = 'This is a very long message';
      expect(component.isMessageTooLong()).toBeTrue();
    });

    it('should detect message within max length', () => {
      component.maxLength = 100;
      component.messageContent = 'Hello';
      expect(component.isMessageTooLong()).toBeFalse();
    });

    it('should calculate remaining characters', () => {
      component.maxLength = 100;
      component.messageContent = 'Hello';
      expect(component.getRemaining()).toBe(95);
    });

    it('should return zero remaining when exceeded', () => {
      component.maxLength = 5;
      component.messageContent = 'Hello World';
      expect(component.getRemaining()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Input Change Handling
  // ═══════════════════════════════════════════════════════════════

  describe('Input Change Handling', () => {
    it('should update message content on input', () => {
      const event = {
        target: { value: 'Hello' }
      };
      component.onInputChange(event);

      expect(component.messageContent).toBe('Hello');
    });

    it('should update character count on input', () => {
      const event = {
        target: { value: 'Hello World' }
      };
      component.onInputChange(event);

      expect(component.characterCount).toBe(11);
    });

    it('should show send button when text entered', () => {
      const event = {
        target: { value: 'Hello' }
      };
      component.onInputChange(event);

      expect(component.showSendButton).toBeTrue();
    });

    it('should hide send button for whitespace-only', () => {
      const event = {
        target: { value: '   ' }
      };
      component.onInputChange(event);

      expect(component.showSendButton).toBeFalse();
    });

    it('should trigger typing detection on input', fakeAsync(() => {
      let typingStarted = false;
      component.typingStarted.subscribe(() => {
        typingStarted = true;
      });

      const event = {
        target: { value: 'Hello' }
      };
      component.onInputChange(event);
      tick(400);

      expect(typingStarted).toBeTrue();
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Message Sending
  // ═══════════════════════════════════════════════════════════════

  describe('Message Sending', () => {
    it('should send message when valid', () => {
      let sentMessage: any = null;
      component.messageSent.subscribe(msg => {
        sentMessage = msg;
      });

      component.messageContent = 'Hello Doctor';
      component.sendMessage();

      expect(sentMessage).toBeTruthy();
      expect(sentMessage.content).toBe('Hello Doctor');
      expect(sentMessage.timestamp).toBeTruthy();
    });

    it('should trim whitespace from message', () => {
      let sentMessage: any = null;
      component.messageSent.subscribe(msg => {
        sentMessage = msg;
      });

      component.messageContent = '  Hello  ';
      component.sendMessage();

      expect(sentMessage.content).toBe('Hello');
    });

    it('should not send empty message', () => {
      let sentMessage: any = null;
      component.messageSent.subscribe(msg => {
        sentMessage = msg;
      });

      component.messageContent = '';
      component.sendMessage();

      expect(sentMessage).toBeNull();
    });

    it('should not send when message exceeds max length', () => {
      let sentMessage: any = null;
      component.messageSent.subscribe(msg => {
        sentMessage = msg;
      });

      component.maxLength = 5;
      component.messageContent = 'Hello World';
      component.sendMessage();

      expect(sentMessage).toBeNull();
    });

    it('should not send while already sending', () => {
      let sentCount = 0;
      component.messageSent.subscribe(() => {
        sentCount++;
      });

      component.isSending = true;
      component.messageContent = 'Hello';
      component.sendMessage();

      expect(sentCount).toBe(0);
    });

    it('should clear input after sending', () => {
      component.messageContent = 'Hello';
      component.characterCount = 5;
      component.showSendButton = true;

      component.sendMessage();

      expect(component.messageContent).toBe('');
      expect(component.characterCount).toBe(0);
      expect(component.showSendButton).toBeFalse();
    });

    it('should stop typing indicator after sending', () => {
      let typingStopped = false;
      component.typingStopped.subscribe(() => {
        typingStopped = true;
      });

      component.isTyping = true;
      component.messageContent = 'Hello';
      component.sendMessage();

      expect(typingStopped).toBeTrue();
      expect(component.isTyping).toBeFalse();
    });

    it('should refocus input after sending', fakeAsync(() => {
      component.messageContent = 'Hello';
      component.autoFocus = true;
      component.sendMessage();
      tick(150);

      expect(component.messageInput?.nativeElement.matches(':focus')).toBe(true);
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Keyboard Handling
  // ═══════════════════════════════════════════════════════════════

  describe('Keyboard Handling', () => {
    it('should send message on Enter key', () => {
      let sentMessage: any = null;
      component.messageSent.subscribe(msg => {
        sentMessage = msg;
      });

      component.messageContent = 'Hello';
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(sentMessage).toBeTruthy();
    });

    it('should not send on Shift+Enter', () => {
      let sentMessage: any = null;
      component.messageSent.subscribe(msg => {
        sentMessage = msg;
      });

      component.messageContent = 'Hello';
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
      spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(sentMessage).toBeNull();
    });

    it('should allow newline with Shift+Enter', () => {
      component.messageContent = 'Hello';
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });

      component.onKeyDown(event);

      // Default behavior allowed (no preventDefault called)
      expect(component.messageContent).toBe('Hello');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Typing Indicator
  // ═══════════════════════════════════════════════════════════════

  describe('Typing Indicator', () => {
    it('should emit typingStarted when user starts typing', fakeAsync(() => {
      let typingStarted = false;
      component.typingStarted.subscribe(() => {
        typingStarted = true;
      });

      const event = {
        target: { value: 'Hello' }
      };
      component.onInputChange(event);
      tick(400);

      expect(typingStarted).toBeTrue();
      expect(component.isTyping).toBeTrue();
    }));

    it('should emit typingStopped when user stops typing', fakeAsync(() => {
      let typingStopped = false;
      component.typingStopped.subscribe(() => {
        typingStopped = true;
      });

      const event = {
        target: { value: 'Hello' }
      };
      component.onInputChange(event);
      tick(400);

      tick(3100); // Wait for typing stop timeout

      expect(typingStopped).toBeTrue();
      expect(component.isTyping).toBeFalse();
    }));

    it('should not emit typingStarted multiple times', fakeAsync(() => {
      let typingStartedCount = 0;
      component.typingStarted.subscribe(() => {
        typingStartedCount++;
      });

      const event = {
        target: { value: 'Hello' }
      };
      component.onInputChange(event);
      tick(400);

      component.onInputChange(event);
      tick(400);

      expect(typingStartedCount).toBe(1);
    }));

    it('should reset typing stop timeout on new input', fakeAsync(() => {
      let typingStopped = false;
      component.typingStopped.subscribe(() => {
        typingStopped = true;
      });

      const event = {
        target: { value: 'Hello' }
      };
      component.onInputChange(event);
      tick(400);

      tick(2000); // Wait 2 seconds

      // Send another input
      component.onInputChange(event);
      tick(400);

      tick(2500); // Still within timeout

      expect(typingStopped).toBeFalse();
      expect(component.isTyping).toBeTrue();

      tick(1000); // Now exceed timeout

      expect(typingStopped).toBeTrue();
      expect(component.isTyping).toBeFalse();
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // Input Management
  // ═══════════════════════════════════════════════════════════════

  describe('Input Management', () => {
    it('should clear input', () => {
      component.messageContent = 'Hello';
      component.characterCount = 5;
      component.showSendButton = true;

      component.clearInput();

      expect(component.messageContent).toBe('');
      expect(component.characterCount).toBe(0);
      expect(component.showSendButton).toBeFalse();
    });

    it('should focus input', fakeAsync(() => {
      component.autoFocus = true;
      component.focusInput();
      tick(100);

      expect(component.messageInput?.nativeElement.matches(':focus')).toBe(true);
    }));

    it('should not focus when autoFocus is false', fakeAsync(() => {
      component.autoFocus = false;
      const input = component.messageInput?.nativeElement;
      input?.blur();

      component.focusInput();
      tick(100);

      expect(component.messageInput?.nativeElement.matches(':focus')).toBe(false);
    }));

    it('should blur input', () => {
      component.messageInput?.nativeElement.focus();
      component.blurInput();

      expect(component.messageInput?.nativeElement.matches(':focus')).toBe(false);
    });

    it('should get input value', () => {
      component.messageContent = 'Hello World';
      expect(component.getValue()).toBe('Hello World');
    });

    it('should set input value', () => {
      component.setValue('Hello');

      expect(component.messageContent).toBe('Hello');
      expect(component.characterCount).toBe(5);
      expect(component.showSendButton).toBeTrue();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Button State
  // ═══════════════════════════════════════════════════════════════

  describe('Button State', () => {
    it('should disable button when message empty', () => {
      component.messageContent = '';
      expect(component.isSendDisabled()).toBeTrue();
    });

    it('should enable button when message has content', () => {
      component.messageContent = 'Hello';
      expect(component.isSendDisabled()).toBeFalse();
    });

    it('should disable button when sending', () => {
      component.messageContent = 'Hello';
      component.isSending = true;
      expect(component.isSendDisabled()).toBeTrue();
    });

    it('should disable button when component disabled', () => {
      component.messageContent = 'Hello';
      component.isDisabled = true;
      expect(component.isSendDisabled()).toBeTrue();
    });

    it('should disable button when message too long', () => {
      component.messageContent = 'Hello';
      component.maxLength = 3;
      expect(component.isSendDisabled()).toBeTrue();
    });

    it('should disable input when sending', () => {
      component.isSending = true;
      expect(component.isInputDisabled()).toBeTrue();
    });

    it('should disable input when component disabled', () => {
      component.isDisabled = true;
      expect(component.isInputDisabled()).toBeTrue();
    });

    it('should return correct button class', () => {
      component.messageContent = 'Hello';
      const baseClass = component.getSendButtonClass();
      expect(baseClass).toContain('send-btn');

      component.isSending = true;
      const sendingClass = component.getSendButtonClass();
      expect(sendingClass).toContain('sending');

      component.messageContent = '';
      const disabledClass = component.getSendButtonClass();
      expect(disabledClass).toContain('disabled');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Disabled State
  // ═══════════════════════════════════════════════════════════════

  describe('Disabled State', () => {
    it('should disable input when isSending is true', () => {
      component.isSending = true;
      expect(component.isInputDisabled()).toBeTrue();
    });

    it('should disable input when isDisabled is true', () => {
      component.isDisabled = true;
      expect(component.isInputDisabled()).toBeTrue();
    });

    it('should disable send button when isSending', () => {
      component.messageContent = 'Hello';
      component.isSending = true;
      expect(component.isSendDisabled()).toBeTrue();
    });

    it('should disable send button when isDisabled', () => {
      component.messageContent = 'Hello';
      component.isDisabled = true;
      expect(component.isSendDisabled()).toBeTrue();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should clean up on destroy', fakeAsync(() => {
      component.messageContent = 'Hello';
      component.ngOnInit();
      tick(400);

      let typingStopped = false;
      component.typingStopped.subscribe(() => {
        typingStopped = true;
      });

      component.ngOnDestroy();

      tick(3100);

      // Should not emit events after destroy
      expect(typingStopped).toBeFalse();
    }));

    it('should clear typing timeout on destroy', () => {
      component.ngOnInit();
      const timeoutSpy = spyOn(window, 'clearTimeout');

      component.ngOnDestroy();

      expect(timeoutSpy).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(5000);
      component.maxLength = 5000;
      component.messageContent = longMessage;

      expect(component.isMessageTooLong()).toBeFalse();
      expect(component.getRemaining()).toBe(0);
    });

    it('should handle special characters', () => {
      component.messageContent = '🎉 Hello! @user #tag';
      expect(component.isMessageEmpty()).toBeFalse();
      expect(component.characterCount).toBeGreaterThan(0);
    });

    it('should handle rapid input changes', fakeAsync(() => {
      let typingStartedCount = 0;
      component.typingStarted.subscribe(() => {
        typingStartedCount++;
      });

      for (let i = 0; i < 10; i++) {
        const event = {
          target: { value: 'H'.repeat(i + 1) }
        };
        component.onInputChange(event);
        tick(50);
      }

      tick(400);

      expect(typingStartedCount).toBe(1);
    }));

    it('should handle clearing and refilling input', () => {
      component.messageContent = 'Hello';
      component.clearInput();

      expect(component.messageContent).toBe('');

      component.setValue('World');

      expect(component.messageContent).toBe('World');
    });

    it('should handle input with only newlines', () => {
      component.messageContent = '\n\n\n';
      expect(component.isMessageEmpty()).toBeTrue();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Integration', () => {
    it('should handle complete message send flow', fakeAsync(() => {
      let sentMessage: any = null;
      let typingStarted = false;
      let typingStopped = false;

      component.messageSent.subscribe(msg => {
        sentMessage = msg;
      });
      component.typingStarted.subscribe(() => {
        typingStarted = true;
      });
      component.typingStopped.subscribe(() => {
        typingStopped = true;
      });

      // User types
      const event = {
        target: { value: 'Hello Doctor' }
      };
      component.onInputChange(event);
      tick(400);

      expect(typingStarted).toBeTrue();
      expect(component.showSendButton).toBeTrue();

      // User sends
      component.sendMessage();

      expect(sentMessage).toBeTruthy();
      expect(sentMessage.content).toBe('Hello Doctor');
      expect(component.messageContent).toBe('');
      expect(typingStopped).toBeTrue();
    }));

    it('should validate and send with keyboard shortcut', fakeAsync(() => {
      let sentMessage: any = null;
      component.messageSent.subscribe(msg => {
        sentMessage = msg;
      });

      component.messageContent = 'Hello';
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(sentMessage).toBeTruthy();
      expect(component.messageContent).toBe('');
    }));
  });
});
