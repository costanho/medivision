import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, interval } from 'rxjs/operators';

/**
 * AdminCallMonitorComponent
 * Real-time call monitoring dashboard for administrators
 * Displays active calls, participants, call quality metrics, and system health
 */

export interface CallSession {
  id: string;
  doctorName: string;
  doctorId: string;
  patientName: string;
  patientId: string;
  startTime: Date;
  duration: number; // in seconds
  participantCount: number;
  audioQuality: 'excellent' | 'good' | 'fair' | 'poor';
  videoQuality: 'excellent' | 'good' | 'fair' | 'poor';
  status: 'active' | 'on-hold' | 'connecting' | 'ending';
  isRecording: boolean;
}

export interface SystemMetrics {
  activeCalls: number;
  totalParticipants: number;
  averageCallDuration: number;
  systemCpuUsage: number;
  systemMemoryUsage: number;
  networkLatency: number;
  packetLoss: number;
}

@Component({
  selector: 'app-admin-call-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-call-monitor.component.html',
  styleUrls: ['./admin-call-monitor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCallMonitorComponent implements OnInit, OnDestroy {
  @Input() refreshInterval = 5000; // milliseconds

  // Call data
  activeCalls: CallSession[] = [];
  selectedCall: CallSession | null = null;

  // Metrics
  systemMetrics: SystemMetrics = {
    activeCalls: 0,
    totalParticipants: 0,
    averageCallDuration: 0,
    systemCpuUsage: 0,
    systemMemoryUsage: 0,
    networkLatency: 0,
    packetLoss: 0
  };

  // UI state
  sortBy: 'duration' | 'doctor' | 'patient' | 'participants' = 'duration';
  sortOrder: 'asc' | 'desc' = 'desc';
  filterStatus: 'all' | 'active' | 'connecting' | 'on-hold' | 'ending' = 'all';
  searchText = '';

  private destroy$ = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.setupAutoRefresh();
  }

  /**
   * Load initial call data and metrics
   */
  private loadInitialData(): void {
    this.refreshCallData();
    this.refreshMetrics();
  }

  /**
   * Setup auto-refresh interval
   */
  private setupAutoRefresh(): void {
    interval(this.refreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshCallData();
        this.refreshMetrics();
      });
  }

  /**
   * Refresh call data from backend
   */
  private refreshCallData(): void {
    // In a real implementation, this would call an API
    // For now, we'll use mock data that updates
    this.updateActiveCalls();
    this.cdr.markForCheck();
  }

  /**
   * Refresh system metrics
   */
  private refreshMetrics(): void {
    // In a real implementation, this would call an API
    this.updateMetrics();
    this.cdr.markForCheck();
  }

  /**
   * Update active calls (mock implementation)
   */
  private updateActiveCalls(): void {
    // This would be replaced with actual API call
    // For now, maintain existing calls and add new ones periodically
    if (this.activeCalls.length === 0) {
      this.activeCalls = [
        {
          id: '1',
          doctorName: 'Dr. Smith',
          doctorId: 'doc1',
          patientName: 'John Doe',
          patientId: 'pat1',
          startTime: new Date(Date.now() - 5 * 60 * 1000),
          duration: 300,
          participantCount: 2,
          audioQuality: 'excellent',
          videoQuality: 'excellent',
          status: 'active',
          isRecording: true
        },
        {
          id: '2',
          doctorName: 'Dr. Johnson',
          doctorId: 'doc2',
          patientName: 'Jane Smith',
          patientId: 'pat2',
          startTime: new Date(Date.now() - 12 * 60 * 1000),
          duration: 720,
          participantCount: 3,
          audioQuality: 'good',
          videoQuality: 'good',
          status: 'active',
          isRecording: false
        }
      ];
    }

    // Update durations
    this.activeCalls = this.activeCalls.map(call => ({
      ...call,
      duration: call.duration + 5
    }));

    // Apply sorting and filtering
    this.applyFiltersAndSort();
  }

  /**
   * Update system metrics (mock implementation)
   */
  private updateMetrics(): void {
    this.systemMetrics = {
      activeCalls: this.activeCalls.length,
      totalParticipants: this.activeCalls.reduce((sum, call) => sum + call.participantCount, 0),
      averageCallDuration: this.activeCalls.length > 0
        ? Math.floor(this.activeCalls.reduce((sum, call) => sum + call.duration, 0) / this.activeCalls.length)
        : 0,
      systemCpuUsage: Math.random() * 80 + 10, // 10-90%
      systemMemoryUsage: Math.random() * 60 + 20, // 20-80%
      networkLatency: Math.floor(Math.random() * 50 + 10), // 10-60ms
      packetLoss: Math.random() * 2 // 0-2%
    };
  }

  /**
   * Apply filtering and sorting to calls
   */
  private applyFiltersAndSort(): void {
    let filtered = [...this.activeCalls];

    // Apply status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(call => call.status === this.filterStatus);
    }

    // Apply search filter
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(call =>
        call.doctorName.toLowerCase().includes(search) ||
        call.patientName.toLowerCase().includes(search) ||
        call.doctorId.toLowerCase().includes(search) ||
        call.patientId.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (this.sortBy) {
        case 'duration':
          compareValue = a.duration - b.duration;
          break;
        case 'doctor':
          compareValue = a.doctorName.localeCompare(b.doctorName);
          break;
        case 'patient':
          compareValue = a.patientName.localeCompare(b.patientName);
          break;
        case 'participants':
          compareValue = a.participantCount - b.participantCount;
          break;
      }

      return this.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    this.activeCalls = filtered;
  }

  /**
   * Format call duration to HH:MM:SS
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Get quality indicator color
   */
  getQualityColor(quality: string): string {
    switch (quality) {
      case 'excellent':
        return '#4CAF50'; // Green
      case 'good':
        return '#8BC34A'; // Light green
      case 'fair':
        return '#FF9800'; // Orange
      case 'poor':
        return '#F44336'; // Red
      default:
        return '#999';
    }
  }

  /**
   * Get status badge text
   */
  getStatusBadge(status: string): string {
    switch (status) {
      case 'active':
        return '🟢 Active';
      case 'connecting':
        return '🟡 Connecting';
      case 'on-hold':
        return '⏸️ On Hold';
      case 'ending':
        return '🔴 Ending';
      default:
        return status;
    }
  }

  /**
   * Select a call to view details
   */
  selectCall(call: CallSession): void {
    this.selectedCall = this.selectedCall?.id === call.id ? null : call;
    this.cdr.markForCheck();
  }

  /**
   * Change sort column
   */
  setSortBy(column: typeof this.sortBy): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'desc';
    }
    this.applyFiltersAndSort();
    this.cdr.markForCheck();
  }

  /**
   * Handle search input
   */
  onSearchChange(text: string): void {
    this.searchText = text;
    this.applyFiltersAndSort();
    this.cdr.markForCheck();
  }

  /**
   * Handle status filter change
   */
  onStatusFilterChange(status: typeof this.filterStatus): void {
    this.filterStatus = status;
    this.applyFiltersAndSort();
    this.cdr.markForCheck();
  }

  /**
   * Get metric health indicator
   */
  getMetricHealth(value: number, threshold: number): 'good' | 'warning' | 'critical' {
    if (value < threshold) return 'good';
    if (value < threshold * 1.5) return 'warning';
    return 'critical';
  }

  /**
   * Get health color
   */
  getHealthColor(health: string): string {
    switch (health) {
      case 'good':
        return '#4CAF50'; // Green
      case 'warning':
        return '#FF9800'; // Orange
      case 'critical':
        return '#F44336'; // Red
      default:
        return '#999';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
