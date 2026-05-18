import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface DoctorSettings {
  // Profile Settings
  profile_visibility: 'public' | 'private';
  show_email: boolean;
  show_phone: boolean;
  show_address: boolean;
  bio: string;
  specializations: string[];
  languages: string[];

  // Consultation Settings
  consultation_fee: number;
  min_consultation_duration: number;
  max_consultations_per_day: number;
  available_consultation_types: ('video' | 'voice' | 'text')[];

  // Appointment Settings
  appointment_duration: number;
  appointment_buffer_time: number;
  auto_confirm_appointments: boolean;
  require_appointment_confirmation: boolean;
  cancellation_notice_hours: number;

  // Notification Settings
  email_on_new_consultation: boolean;
  email_on_new_appointment: boolean;
  email_on_appointment_reminder: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  daily_summary_email: boolean;

  // Availability Settings
  working_hours_start: string;
  working_hours_end: string;
  time_zone: string;
  available_days: string[];

  // Privacy Settings
  two_factor_auth: boolean;
  hide_profile_from_search: boolean;
  block_list: string[];

  // Payment Settings
  payment_method: string;
  withdrawal_frequency: 'daily' | 'weekly' | 'monthly';
  minimum_withdrawal_amount: number;

  // General Settings
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

@Component({
  selector: 'app-doctor-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-settings.component.html',
  styleUrls: ['./doctor-settings.component.scss']
})
export class DoctorSettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  settings: DoctorSettings = {
    profile_visibility: 'public',
    show_email: true,
    show_phone: false,
    show_address: false,
    bio: '',
    specializations: [],
    languages: [],
    consultation_fee: 85,
    min_consultation_duration: 15,
    max_consultations_per_day: 20,
    available_consultation_types: ['video', 'voice', 'text'],
    appointment_duration: 30,
    appointment_buffer_time: 5,
    auto_confirm_appointments: false,
    require_appointment_confirmation: true,
    cancellation_notice_hours: 24,
    email_on_new_consultation: true,
    email_on_new_appointment: true,
    email_on_appointment_reminder: true,
    sms_notifications: false,
    push_notifications: true,
    daily_summary_email: false,
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    time_zone: 'UTC',
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    two_factor_auth: true,
    hide_profile_from_search: false,
    block_list: [],
    payment_method: 'bank_transfer',
    withdrawal_frequency: 'weekly',
    minimum_withdrawal_amount: 50,
    theme: 'light',
    language: 'en'
  };

  originalSettings: DoctorSettings | null = null;
  loading = false;
  error = '';
  successMessage = '';
  hasChanges = false;
  activeTab: 'profile' | 'consultation' | 'appointment' | 'notification' | 'privacy' | 'payment' | 'general' = 'profile';

  // Available options
  specialization_options = ['Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'Neurology', 'General Practice'];
  language_options = ['English', 'Spanish', 'French', 'German', 'Arabic', 'Chinese', 'Japanese', 'Hindi'];
  timezone_options = ['UTC', 'EST', 'CST', 'MST', 'PST', 'IST', 'GST', 'JST'];
  theme_options = ['light', 'dark', 'auto'];
  language_app_options = ['en', 'es', 'fr', 'de', 'ar', 'zh', 'ja', 'hi'];

  ngOnInit(): void {
    console.log('[DoctorSettings] Component initialized');
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSettings(): void {
    console.log('[DoctorSettings] Loading settings...');
    // In a real app, this would be an API call
    this.originalSettings = JSON.parse(JSON.stringify(this.settings));
  }

  onSettingChange(): void {
    this.hasChanges = JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings);
  }

  saveSettings(): void {
    this.loading = true;
    this.error = '';
    console.log('[DoctorSettings] Saving settings...');

    // Simulate API call
    setTimeout(() => {
      this.originalSettings = JSON.parse(JSON.stringify(this.settings));
      this.hasChanges = false;
      this.successMessage = 'Settings saved successfully!';
      this.loading = false;

      setTimeout(() => {
        this.successMessage = '';
      }, 3000);

      console.log('[DoctorSettings] Settings saved');
    }, 1000);
  }

  resetSettings(): void {
    if (confirm('Are you sure you want to discard all changes?')) {
      this.settings = JSON.parse(JSON.stringify(this.originalSettings));
      this.hasChanges = false;
      console.log('[DoctorSettings] Settings reset');
    }
  }

  toggleSpecialization(spec: string): void {
    const index = this.settings.specializations.indexOf(spec);
    if (index > -1) {
      this.settings.specializations.splice(index, 1);
    } else {
      this.settings.specializations.push(spec);
    }
    this.onSettingChange();
  }

  toggleLanguage(lang: string): void {
    const index = this.settings.languages.indexOf(lang);
    if (index > -1) {
      this.settings.languages.splice(index, 1);
    } else {
      this.settings.languages.push(lang);
    }
    this.onSettingChange();
  }

  toggleAvailableDay(day: string): void {
    const index = this.settings.available_days.indexOf(day);
    if (index > -1) {
      this.settings.available_days.splice(index, 1);
    } else {
      this.settings.available_days.push(day);
    }
    this.onSettingChange();
  }

  toggleConsultationType(type: 'video' | 'voice' | 'text'): void {
    const index = this.settings.available_consultation_types.indexOf(type);
    if (index > -1) {
      this.settings.available_consultation_types.splice(index, 1);
    } else {
      this.settings.available_consultation_types.push(type);
    }
    this.onSettingChange();
  }

  removeFromBlockList(user: string): void {
    this.settings.block_list = this.settings.block_list.filter(u => u !== user);
    this.onSettingChange();
  }

  clearBlockList(): void {
    if (confirm('Are you sure you want to clear the block list?')) {
      this.settings.block_list = [];
      this.onSettingChange();
    }
  }

  changePassword(): void {
    console.log('[DoctorSettings] Change password initiated');
    alert('Password change feature coming soon!');
  }

  enableTwoFactorAuth(): void {
    if (confirm('Enable two-factor authentication? You will need to verify your phone number.')) {
      this.settings.two_factor_auth = true;
      this.onSettingChange();
      this.successMessage = 'Two-factor authentication enabled!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }
  }

  disableTwoFactorAuth(): void {
    if (confirm('Disable two-factor authentication? Your account will be less secure.')) {
      this.settings.two_factor_auth = false;
      this.onSettingChange();
      this.successMessage = 'Two-factor authentication disabled!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }
  }

  exportSettings(): void {
    const dataStr = JSON.stringify(this.settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'doctor-settings-backup.json';
    link.click();
    console.log('[DoctorSettings] Settings exported');
  }

  deleteAccount(): void {
    if (confirm('Are you absolutely sure? This action cannot be undone. Your account and all data will be permanently deleted.')) {
      if (confirm('This is your last chance to reconsider. Type "DELETE" to confirm account deletion.')) {
        this.loading = true;
        console.log('[DoctorSettings] Account deletion initiated');

        setTimeout(() => {
          this.successMessage = 'Your account has been scheduled for deletion. You will receive a confirmation email.';
          this.loading = false;
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        }, 1000);
      }
    }
  }

  clearError(): void {
    this.error = '';
  }
}
