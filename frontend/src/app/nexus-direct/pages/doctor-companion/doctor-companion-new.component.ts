import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  message: string;
  timestamp: Date;
  type: 'text' | 'medical-info' | 'patient-insight';
}

interface MedicalResource {
  id: number;
  title: string;
  description: string;
  icon: string;
  category: 'guidelines' | 'drugs' | 'conditions' | 'procedures';
}

interface PatientInsight {
  id: number;
  patientName: string;
  category: string;
  insight: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-doctor-companion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-companion-new.component.html',
  styleUrls: ['./doctor-companion-new.component.scss']
})
export class DoctorCompanionNewComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  currentUser: any = null;
  currentRole: string | null = null;
  destroy$ = new Subject<void>();

  // Chat interface
  chatMessages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  activeTab: 'chat' | 'resources' | 'patients' | 'learning' = 'chat';

  // Medical resources
  medicalResources: MedicalResource[] = [
    {
      id: 1,
      title: 'Clinical Practice Guidelines',
      description: 'Evidence-based guidelines for common conditions and treatments',
      icon: '📋',
      category: 'guidelines'
    },
    {
      id: 2,
      title: 'Drug Interaction Checker',
      description: 'Check potential drug interactions and side effects',
      icon: '💊',
      category: 'drugs'
    },
    {
      id: 3,
      title: 'Differential Diagnosis Tool',
      description: 'Support for differential diagnosis of symptoms',
      icon: '🔍',
      category: 'conditions'
    },
    {
      id: 4,
      title: 'Procedure Reference Library',
      description: 'Step-by-step guides for common medical procedures',
      icon: '👨‍⚕️',
      category: 'procedures'
    },
    {
      id: 5,
      title: 'Latest Medical Research',
      description: 'Recent findings and updates from medical journals',
      icon: '📚',
      category: 'guidelines'
    },
    {
      id: 6,
      title: 'Treatment Protocols',
      description: 'Established protocols for various medical conditions',
      icon: '📊',
      category: 'conditions'
    }
  ];

  // Patient insights
  patientInsights: PatientInsight[] = [
    {
      id: 1,
      patientName: 'Sarah Anderson',
      category: 'Risk Alert',
      insight: 'Patient blood pressure readings trending upward. Consider medication adjustment.',
      icon: '⚠️',
      priority: 'high'
    },
    {
      id: 2,
      patientName: 'James Wilson',
      category: 'Medication Review',
      insight: 'Patient on 4 medications. Check for drug-drug interactions at next visit.',
      icon: '💊',
      priority: 'medium'
    },
    {
      id: 3,
      patientName: 'Michael Chen',
      category: 'Follow-up Due',
      insight: 'Patient hasn\'t had labs drawn in 6 months. Due for routine screening.',
      icon: '📋',
      priority: 'medium'
    },
    {
      id: 4,
      patientName: 'Emma Johnson',
      category: 'Health Milestone',
      insight: 'Patient completed prescribed therapy successfully. Good adherence.',
      icon: '🎉',
      priority: 'low'
    }
  ];

  // Learning resources
  learningResources = [
    {
      id: 1,
      title: 'Hypertension Management in 2025',
      excerpt: 'Latest guidelines on managing patients with high blood pressure',
      icon: '❤️',
      category: 'CME'
    },
    {
      id: 2,
      title: 'Diabetes Care Best Practices',
      excerpt: 'Evidence-based approaches to diabetes management and patient education',
      icon: '🔬',
      category: 'CME'
    },
    {
      id: 3,
      title: 'Mental Health in Primary Care',
      excerpt: 'Recognizing and managing mental health issues in your practice',
      icon: '🧠',
      category: 'Professional Development'
    },
    {
      id: 4,
      title: 'Preventive Medicine Update',
      excerpt: 'Current recommendations for preventive care and screening',
      icon: '🛡️',
      category: 'Clinical Update'
    },
    {
      id: 5,
      title: 'Patient Communication Skills',
      excerpt: 'Improving patient engagement and satisfaction through better communication',
      icon: '🗣️',
      category: 'Professional Development'
    },
    {
      id: 6,
      title: 'Telemedicine Best Practices',
      excerpt: 'Effective remote consultation techniques and virtual patient care',
      icon: '💻',
      category: 'Clinical Update'
    }
  ];

  // Quick action suggestions
  quickSuggestions = [
    { text: 'Check medication', icon: '💊' },
    { text: 'Drug interactions', icon: '⚠️' },
    { text: 'Diagnosis support', icon: '🔍' },
    { text: 'Treatment options', icon: '📊' },
    { text: 'Guidelines', icon: '📋' },
    { text: 'Patient insights', icon: '👥' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize with welcome message
    this.chatMessages = [
      {
        id: 'welcome-1',
        sender: 'assistant',
        message: 'Hello, Doctor! I\'m your clinical support assistant. How can I help you today? I can assist with medical knowledge, drug interactions, patient management insights, and clinical guidelines.',
        timestamp: new Date(),
        type: 'text'
      }
    ];
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.currentRole = this.authService.getCurrentRole();

    if (!this.currentRole || (this.currentRole !== 'ROLE_DOCTOR' && this.currentRole !== 'DOCTOR')) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.currentUserRole$
      .pipe(takeUntil(this.destroy$))
      .subscribe(role => {
        if (!role) {
          this.router.navigate(['/login']);
        }
      });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  switchTab(tab: 'chat' | 'resources' | 'patients' | 'learning'): void {
    this.activeTab = tab;
  }

  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {
      // Ignore scroll errors
    }
  }

  sendMessage(): void {
    if (!this.userInput.trim()) {
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      message: this.userInput,
      timestamp: new Date(),
      type: 'text'
    };

    this.chatMessages.push(userMessage);
    const userQuery = this.userInput.toLowerCase();
    this.userInput = '';
    this.isLoading = true;

    // Simulate AI response delay
    setTimeout(() => {
      const assistantMessage = this.generateAIResponse(userQuery);
      this.chatMessages.push(assistantMessage);
      this.isLoading = false;
    }, 800);
  }

  private generateAIResponse(query: string): ChatMessage {
    let response = '';
    let type: 'text' | 'medical-info' | 'patient-insight' = 'text';

    if (query.includes('drug') || query.includes('medication') || query.includes('interaction')) {
      response = 'I can help check for drug interactions and provide medication information. What medications would you like me to review? Please provide the drug names and dosages.';
      type = 'medical-info';
    } else if (query.includes('diagnosis') || query.includes('symptom') || query.includes('condition')) {
      response = 'For diagnosis support, I can help with differential diagnosis considerations. Please describe the patient\'s symptoms, medical history, and any relevant test results.';
      type = 'medical-info';
    } else if (query.includes('guideline') || query.includes('protocol') || query.includes('treatment')) {
      response = 'I can provide current clinical guidelines and evidence-based treatment protocols. Which condition or treatment area are you interested in?';
      type = 'medical-info';
    } else if (query.includes('patient') || query.includes('my patients')) {
      response = 'I have insights on your patients\' health metrics and follow-up needs. You have 4 active alerts requiring attention. Would you like me to show them?';
      type = 'patient-insight';
    } else if (query.includes('research') || query.includes('update') || query.includes('study')) {
      response = 'Latest medical research shows important updates in several areas. I can summarize recent findings in cardiology, diabetes, mental health, and preventive medicine.';
      type = 'medical-info';
    } else if (query.includes('procedure') || query.includes('surgery') || query.includes('technique')) {
      response = 'I have references for surgical and procedural techniques. Which procedure would you like information about?';
      type = 'medical-info';
    } else if (query.includes('cme') || query.includes('learning') || query.includes('education')) {
      response = 'I have current CME resources covering hypertension, diabetes, mental health, telemedicine, and more. Which topics interest you?';
      type: 'text';
    } else {
      response = 'I can assist with medical knowledge, clinical guidelines, drug interactions, patient management insights, and professional development. What would you like help with?';
    }

    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      message: response,
      timestamp: new Date(),
      type: type
    };
  }

  selectQuickSuggestion(suggestion: any): void {
    this.userInput = suggestion.text;
  }

  useSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    this.sendMessage();
  }

  viewResource(resource: any): void {
    console.log('Opening resource:', resource.title);
  }

  checkInsight(insight: any): void {
    console.log('Reviewing insight for:', insight.patientName);
    this.userInput = `Tell me more about ${insight.patientName}: ${insight.insight}`;
    this.sendMessage();
  }

  readArticle(article: any): void {
    console.log('Reading article:', article.title);
  }

  getPatientInsights(): void {
    this.userInput = 'Show me my patient insights and alerts';
    this.sendMessage();
  }

  checkDrugInteraction(): void {
    this.userInput = 'Check drug interactions for my current patient';
    this.sendMessage();
  }

  requestGuidelines(): void {
    this.userInput = 'What are the latest clinical guidelines?';
    this.sendMessage();
  }

  backToProfile(): void {
    this.router.navigate(['/doctor/profile']);
  }
}
