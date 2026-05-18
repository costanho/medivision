import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input() currentPage: number = 0;
  @Input() totalPages: number = 1;
  @Input() loading: boolean = false;
  @Output() pageChange = new EventEmitter<'next' | 'previous'>();

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.loading) {
      this.pageChange.emit('next');
    }
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.loading) {
      this.pageChange.emit('previous');
    }
  }

  get pages(): number[] {
    const pages: number[] = [];
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 3);

    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page !== this.currentPage && !this.loading) {
      if (page > this.currentPage) {
        this.pageChange.emit('next');
      } else {
        this.pageChange.emit('previous');
      }
    }
  }
}
