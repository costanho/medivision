import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-top-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-navbar.component.html',
  styleUrls: ['./top-navbar.component.scss'],
  host: { 'ngSkipHydration': '' }
})
export class TopNavbarComponent implements OnInit {
  @Input() currentUser: any = null;
  @Input() appointmentBadge: number = 3;
  @Input() messageBadge: number = 2;
  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() menuClick = new EventEmitter<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
  }

  toggleMobileMenu(): void {
    this.sidebarToggle.emit();
    this.menuClick.emit();
  }

  getInitials(): string {
    const name = this.currentUser?.fullName || 'P';
    return name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvatarColor(): string {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4caf50'];
    const charCode = this.currentUser?.email?.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  }

  navigateToAppointments(): void {
    this.router.navigate(['/patient/nexus-direct/dashboard/appointments']);
  }

  navigateToMessages(): void {
    this.router.navigate(['/patient/nexus-direct/dashboard/messages']);
  }

  logout(): void {
    console.log('[TopNavbar] Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
