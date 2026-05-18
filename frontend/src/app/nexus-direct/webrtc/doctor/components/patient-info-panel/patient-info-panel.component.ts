import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

/**
 * PatientInfoPanelComponent
 * Displays patient medical information during consultation
 * Includes allergies, current medications, medical history, vital signs
 */

export interface PatientInfo {
  id: string;
  name: string;
  age: number;
  allergies: string[];
  medications: string[];
  conditions: string[];
  vitalSigns?: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    oxygenLevel: number;
  };
  lastVisit?: Date;
  notes?: string;
}

@Component({
  selector: 'app-patient-info-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-info-panel.component.html',
  styleUrls: ['./patient-info-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(10px)', opacity: 0 }),
        animate('150ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class PatientInfoPanelComponent implements OnInit {
  @Input() patientInfo: PatientInfo | null = null;
  @Input() isCompact = false;

  // Accordion state
  expandedSections = new Map<string, boolean>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Initialize accordion sections - expand critical info by default
    this.expandedSections.set('allergies', true);
    this.expandedSections.set('medications', true);
    this.expandedSections.set('vitalSigns', true);
    this.expandedSections.set('history', false);
    this.expandedSections.set('notes', false);
  }

  /**
   * Toggle accordion section
   */
  toggleSection(section: string): void {
    const current = this.expandedSections.get(section) || false;
    this.expandedSections.set(section, !current);
    this.cdr.markForCheck();
  }

  /**
   * Check if section is expanded
   */
  isSectionExpanded(section: string): boolean {
    return this.expandedSections.get(section) || false;
  }

  /**
   * Get risk level color based on value
   */
  getRiskColor(value: number | string, type: 'allergy' | 'condition'): string {
    if (type === 'allergy') {
      return '#F44336'; // Red for allergies
    }
    if (type === 'condition') {
      return '#FF9800'; // Orange for conditions
    }
    return '#999';
  }

  /**
   * Format vital sign values
   */
  formatVitalSign(key: string, value: any): string {
    switch (key) {
      case 'bloodPressure':
        return value;
      case 'heartRate':
        return `${value} bpm`;
      case 'temperature':
        return `${value}°C`;
      case 'oxygenLevel':
        return `${value}%`;
      default:
        return String(value);
    }
  }

  /**
   * Get vital sign status (normal, warning, critical)
   */
  getVitalStatus(key: string, value: number): 'normal' | 'warning' | 'critical' {
    switch (key) {
      case 'heartRate':
        if (value < 60 || value > 100) return 'warning';
        if (value < 40 || value > 120) return 'critical';
        return 'normal';
      case 'temperature':
        if (value < 36.5 || value > 37.5) return 'warning';
        if (value < 36 || value > 39) return 'critical';
        return 'normal';
      case 'oxygenLevel':
        if (value < 95) return 'critical';
        if (value < 97) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  }

  /**
   * Get status color
   */
  getStatusColor(status: 'normal' | 'warning' | 'critical'): string {
    switch (status) {
      case 'critical':
        return '#F44336'; // Red
      case 'warning':
        return '#FF9800'; // Orange
      case 'normal':
        return '#4CAF50'; // Green
    }
  }

  /**
   * Format date display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Get icon for allergy
   */
  getAllergyIcon(allergy: string): string {
    const allergyLower = allergy.toLowerCase();
    if (allergyLower.includes('penicillin') || allergyLower.includes('antibiotic')) return '💊';
    if (allergyLower.includes('latex')) return '🧤';
    if (allergyLower.includes('nut') || allergyLower.includes('shellfish')) return '🥜';
    if (allergyLower.includes('iodine')) return '⚠️';
    return '⚠️';
  }
}
