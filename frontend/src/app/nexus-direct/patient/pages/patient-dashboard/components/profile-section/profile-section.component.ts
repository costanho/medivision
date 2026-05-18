import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-section.component.html',
  styleUrls: ['./profile-section.component.scss']
})
export class ProfileSectionComponent implements OnInit {
  @Input() currentUser: any = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    console.log('[ProfileSection] User data:', this.currentUser);
  }

  getInitials(): string {
    const name = this.currentUser?.fullName || 'U';
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

  goToProfile(): void {
    this.router.navigate(['/patient/nexus-direct/profile']);
  }

  goToSettings(): void {
    this.router.navigate(['/patient/nexus-direct/settings']);
  }
}
