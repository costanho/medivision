import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-services-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services-grid.component.html',
  styleUrls: ['./services-grid.component.scss']
})
export class ServicesGridComponent {
  @Input() availableServices: any[] = [];
  @Output() serviceSelected = new EventEmitter<any>();

  selectService(service: any): void {
    console.log('[ServicesGrid] Selected service:', service.id);
    this.serviceSelected.emit(service);
  }
}
