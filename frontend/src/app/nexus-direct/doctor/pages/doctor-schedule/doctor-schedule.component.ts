import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface TimeSlot {
  id: string;
  time: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  patientName?: string;
  patientEmail?: string;
  appointmentStatus?: 'scheduled' | 'confirmed' | 'cancelled';
}

interface Schedule {
  id: number;
  date: string;
  dayName: string;
  timeSlots: TimeSlot[];
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
}

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-schedule.component.html',
  styleUrls: ['./doctor-schedule.component.scss']
})
export class DoctorScheduleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  schedules: Schedule[] = [];
  selectedDate: string = '';
  selectedDateSchedule: Schedule | null = null;
  loading = false;
  error = '';
  successMessage = '';

  // Filter and view options
  viewType: 'weekly' | 'monthly' | 'list' = 'weekly';
  filterStatus: 'all' | 'available' | 'booked' | 'cancelled' = 'all';
  searchQuery = '';

  // Modal management
  showSlotModal = false;
  selectedSlot: TimeSlot | null = null;
  newSlotForm = {
    date: '',
    startTime: '',
    endTime: '',
    slotCount: 1
  };

  ngOnInit(): void {
    console.log('[DoctorSchedule] Component initialized');
    this.initializeSchedule();
    this.generateWeeklySchedule();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSchedule(): void {
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0];
  }

  private generateWeeklySchedule(): void {
    this.loading = true;
    this.error = '';

    const today = new Date();
    const schedules: Schedule[] = [];

    // Generate 7 days of schedules
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

      // Generate time slots (9 AM to 5 PM, 30-minute slots)
      const timeSlots: TimeSlot[] = [];
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const endTime = minute === 30
            ? `${String(hour + 1).padStart(2, '0')}:00`
            : `${String(hour).padStart(2, '0')}:30`;

          // Randomly mark some slots as booked
          const isAvailable = Math.random() > 0.3;
          const appointmentStatus = !isAvailable ? 'scheduled' : undefined;

          timeSlots.push({
            id: `${dateStr}-${slotTime}`,
            time: slotTime,
            startTime: slotTime,
            endTime: endTime,
            isAvailable: isAvailable,
            patientName: !isAvailable ? `Patient ${Math.floor(Math.random() * 100)}` : undefined,
            patientEmail: !isAvailable ? `patient@example.com` : undefined,
            appointmentStatus: appointmentStatus
          });
        }
      }

      const bookedSlots = timeSlots.filter(slot => !slot.isAvailable).length;
      const availableSlots = timeSlots.length - bookedSlots;

      schedules.push({
        id: i,
        date: dateStr,
        dayName: dayName,
        timeSlots: timeSlots,
        totalSlots: timeSlots.length,
        bookedSlots: bookedSlots,
        availableSlots: availableSlots
      });
    }

    this.schedules = schedules;
    this.selectedDateSchedule = schedules[0];
    this.loading = false;
    console.log('[DoctorSchedule] Weekly schedule generated:', schedules.length, 'days');
  }

  selectDate(date: string): void {
    this.selectedDate = date;
    this.selectedDateSchedule = this.schedules.find(s => s.date === date) || null;
    console.log('[DoctorSchedule] Date selected:', date);
  }

  openSlotModal(slot?: TimeSlot): void {
    this.showSlotModal = true;
    this.selectedSlot = slot || null;
    if (!slot) {
      this.newSlotForm = {
        date: this.selectedDate,
        startTime: '',
        endTime: '',
        slotCount: 1
      };
    }
  }

  closeSlotModal(): void {
    this.showSlotModal = false;
    this.selectedSlot = null;
  }

  createTimeSlot(): void {
    if (!this.newSlotForm.date || !this.newSlotForm.startTime || !this.newSlotForm.endTime) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    setTimeout(() => {
      this.successMessage = 'Time slot created successfully!';
      this.loading = false;
      this.closeSlotModal();
      this.generateWeeklySchedule();
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 500);
  }

  updateSlotStatus(slot: TimeSlot, status: 'confirmed' | 'cancelled'): void {
    console.log('[DoctorSchedule] Updating slot status:', slot.id, status);
    slot.appointmentStatus = status;
    this.successMessage = `Appointment ${status}!`;
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  releaseSlot(slot: TimeSlot): void {
    console.log('[DoctorSchedule] Releasing slot:', slot.id);
    slot.isAvailable = true;
    slot.patientName = undefined;
    slot.patientEmail = undefined;
    slot.appointmentStatus = undefined;
    this.successMessage = 'Slot released and is now available!';
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  deleteSlot(slot: TimeSlot): void {
    if (this.selectedDateSchedule) {
      this.selectedDateSchedule.timeSlots = this.selectedDateSchedule.timeSlots.filter(s => s.id !== slot.id);
      this.successMessage = 'Time slot deleted!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }
  }

  getFilteredSlots(): TimeSlot[] {
    if (!this.selectedDateSchedule) return [];

    return this.selectedDateSchedule.timeSlots.filter(slot => {
      const matchesStatus =
        this.filterStatus === 'all' ||
        (this.filterStatus === 'available' && slot.isAvailable) ||
        (this.filterStatus === 'booked' && !slot.isAvailable) ||
        (this.filterStatus === 'cancelled' && slot.appointmentStatus === 'cancelled');

      const matchesSearch = !this.searchQuery ||
        (slot.patientName?.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (slot.patientEmail?.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        slot.time.includes(this.searchQuery);

      return matchesStatus && matchesSearch;
    });
  }

  getSlotStatusClass(slot: TimeSlot): string {
    if (slot.isAvailable) return 'available';
    if (slot.appointmentStatus === 'confirmed') return 'confirmed';
    if (slot.appointmentStatus === 'cancelled') return 'cancelled';
    return 'scheduled';
  }

  clearError(): void {
    this.error = '';
  }
}
