import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.scss'],
  host: { 'ngSkipHydration': '' }
})
export class AdminHeaderComponent implements OnInit {
  @Input() currentUser: any = null;
  @Input() notificationBadge: number = 0;
  @Input() alertBadge: number = 0;
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
    const name = this.currentUser?.fullName || 'A';
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

  navigateToNotifications(): void {
    this.router.navigate(['/admin/notifications']);
  }

  navigateToAlerts(): void {
    this.router.navigate(['/admin/system-alerts']);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  logout(): void {
    console.log('[AdminHeader] Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
