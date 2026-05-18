import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * 404 Not Found Component
 * Displayed when user navigates to a non-existent route
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent {
  currentYear = new Date().getFullYear();

  constructor(private location: Location) {}

  /**
   * Navigate back to previous page
   */
  goBack(): void {
    this.location.back();
  }
}
