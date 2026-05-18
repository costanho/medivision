import { Component, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SettingsComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Settings state
  notifications = {
    email: true,
    sms: false,
    appointments: true,
    messages: true
  };

  preferences = {
    theme: 'light',
    language: 'en',
    timeFormat: '12h'
  };

  privacy = {
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false
  };

  saveSuccess = '';
  saveError = '';

  saveSettings(): void {
    this.saveSuccess = 'Settings saved successfully!';
    setTimeout(() => {
      this.saveSuccess = '';
    }, 3000);
  }

  resetPassword(): void {
    alert('Password reset link would be sent to your email');
  }

  twoFactorToggle(): void {
    alert('Two-factor authentication settings updated');
  }

  exportData(): void {
    alert('Your data will be exported as JSON and downloaded');
  }

  deleteAccount(): void {
    if (confirm('Are you sure? This action cannot be undone. All your data will be permanently deleted.')) {
      alert('Account deletion requested. This would be processed in 30 days.');
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  logoutAllDevices(): void {
    this.authService.logout();
    alert('All sessions terminated. Please login again.');
    this.router.navigate(['/login']);
  }
}
