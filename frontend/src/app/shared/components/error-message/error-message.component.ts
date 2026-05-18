import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.scss']
})
export class ErrorMessageComponent {
  @Input() message: string = '';
  @Input() dismissible: boolean = true;
  @Input() type: 'error' | 'warning' | 'info' | 'success' = 'error';
  @Output() dismiss = new EventEmitter<void>();
  @Input() visible: boolean = true;

  onDismiss(): void {
    this.visible = false;
    this.dismiss.emit();
  }

  getIcon(): string {
    switch (this.type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return '❌';
    }
  }
}
