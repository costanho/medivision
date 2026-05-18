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
  type: 'text' | 'suggestion' | 'recommendation';
}

interface HealthTip {
  id: number;
  title: string;
  description: string;
  icon: string;
  category: 'wellness' | 'nutrition' | 'exercise' | 'sleep';
}

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  nextDue: string;
  icon: string;
}

@Component({
  selector: 'app-patient-companion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-companion-new.component.html',
  styleUrls: ['./patient-companion-new.component.scss']
})
export class PatientCompanionNewComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  currentUser: any = null;
  currentRole: string | null = null;
  destroy$ = new Subject<void>();

  // Chat interface
  chatMessages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  activeTab: 'chat' | 'health-tips' | 'medications' | 'articles' = 'chat';

  // Health tips
  healthTips: HealthTip[] = [
    {
      id: 1,
      title: 'Stay Hydrated',
      description: 'Drink at least 8 glasses of water daily to maintain optimal health and energy levels',
      icon: '💧',
      category: 'wellness'
    },
    {
      id: 2,
      title: 'Sleep 7-9 Hours',
      description: 'Quality sleep is essential for immune function, mental health, and overall well-being',
      icon: '😴',
      category: 'sleep'
    },
    {
      id: 3,
      title: 'Exercise 30 Minutes Daily',
      description: 'Regular physical activity reduces stress, improves heart health, and boosts mood',
      icon: '🏃',
      category: 'exercise'
    },
    {
      id: 4,
      title: 'Eat More Vegetables',
      description: 'Include colorful vegetables in every meal for essential vitamins and minerals',
      icon: '🥗',
      category: 'nutrition'
    },
    {
      id: 5,
      title: 'Manage Stress',
      description: 'Practice meditation, deep breathing, or yoga to reduce stress and anxiety',
      icon: '🧘',
      category: 'wellness'
    },
    {
      id: 6,
      title: 'Regular Check-ups',
      description: 'Schedule annual health check-ups to catch any health issues early',
      icon: '🏥',
      category: 'wellness'
    }
  ];

  // Medications and reminders
  medications: Medication[] = [
    {
      id: 1,
      name: 'Blood Pressure Medication',
      dosage: '10mg',
      frequency: 'Once daily',
      nextDue: 'Today at 8:00 AM',
      icon: '💊'
    },
    {
      id: 2,
      name: 'Vitamin D Supplement',
      dosage: '1000 IU',
      frequency: 'Once daily',
      nextDue: 'Today at 12:00 PM',
      icon: '🌞'
    },
    {
      id: 3,
      name: 'Antihistamine',
      dosage: '5mg',
      frequency: 'As needed',
      nextDue: 'No upcoming dose',
      icon: '😷'
    }
  ];

  // Health articles
  healthArticles = [
    {
      id: 1,
      title: 'Understanding Blood Pressure',
      excerpt: 'Learn what your blood pressure readings mean and how to maintain healthy levels',
      icon: '❤️',
      category: 'Cardiovascular'
    },
    {
      id: 2,
      title: 'Managing Allergies Naturally',
      excerpt: 'Natural remedies and lifestyle changes to help manage seasonal and environmental allergies',
      icon: '🌸',
      category: 'Allergies'
    },
    {
      id: 3,
      title: 'Sleep Hygiene Tips',
      excerpt: 'Proven strategies for improving sleep quality and establishing healthy sleep patterns',
      icon: '🛏️',
      category: 'Sleep'
    },
    {
      id: 4,
      title: 'Nutrition for Heart Health',
      excerpt: 'Discover foods and eating habits that support cardiovascular health and longevity',
      icon: '🫀',
      category: 'Nutrition'
    },
    {
      id: 5,
      title: 'Exercise Benefits and Guidelines',
      excerpt: 'Complete guide to physical activity benefits and recommendations for different age groups',
      icon: '💪',
      category: 'Fitness'
    },
    {
      id: 6,
      title: 'Mental Health and Wellness',
      excerpt: 'Strategies for managing stress, anxiety, and maintaining mental well-being',
      icon: '🧠',
      category: 'Mental Health'
    }
  ];

  // Quick action suggestions
  quickSuggestions = [
    { text: 'Check symptom', icon: '🤒' },
    { text: 'Schedule doctor visit', icon: '📅' },
    { text: 'Medication reminder', icon: '💊' },
    { text: 'Health tips', icon: '💡' },
    { text: 'Track mood', icon: '😊' },
    { text: 'Find nearby hospital', icon: '🏥' }
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
        message: 'Hello! I\'m your personal health assistant. How can I help you today?',
        timestamp: new Date(),
        type: 'text'
      }
    ];
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.currentRole = this.authService.getCurrentRole();

    if (!this.currentRole || (this.currentRole !== 'ROLE_PATIENT' && this.currentRole !== 'PATIENT')) {
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

  switchTab(tab: 'chat' | 'health-tips' | 'medications' | 'articles'): void {
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
    let type: 'text' | 'suggestion' | 'recommendation' = 'text';

    if (query.includes('symptom') || query.includes('feeling') || query.includes('pain')) {
      response = 'I can help you check your symptoms. Could you describe what you\'re experiencing? Please note that I\'m here to provide general guidance, not medical diagnosis. For serious concerns, always consult with a healthcare professional.';
    } else if (query.includes('medication') || query.includes('medicine') || query.includes('dose')) {
      response = 'I can help with information about your medications. Remember to always follow your doctor\'s instructions. You have 3 active medications with reminders set. Would you like me to show your medication schedule?';
    } else if (query.includes('exercise') || query.includes('workout') || query.includes('fitness')) {
      response = 'Great question! Regular exercise is wonderful for your health. I recommend 30 minutes of moderate activity daily. Would you like some exercise suggestions tailored to your health conditions?';
    } else if (query.includes('diet') || query.includes('food') || query.includes('nutrition')) {
      response = 'Nutrition is key to good health! Based on your health profile, I suggest including more vegetables, whole grains, and lean proteins. Would you like a personalized nutrition plan?';
    } else if (query.includes('sleep') || query.includes('insomnia') || query.includes('tired')) {
      response = 'Sleep quality is important. I recommend 7-9 hours nightly. Try maintaining a consistent sleep schedule, avoiding screens before bed, and keeping your room cool. Would you like more sleep hygiene tips?';
    } else if (query.includes('stress') || query.includes('anxiety') || query.includes('mental')) {
      response = 'Mental health matters! I can suggest relaxation techniques like deep breathing, meditation, or yoga. Would you like to try a guided breathing exercise right now?';
    } else if (query.includes('appointment') || query.includes('doctor') || query.includes('schedule')) {
      response = 'I can help you schedule an appointment. Based on your recent health history, which type of specialist would you like to see? I can show you available doctors.';
    } else if (query.includes('hi') || query.includes('hello') || query.includes('hey')) {
      response = 'Hello! I\'m here to support your health journey. You can ask me about symptoms, medications, health tips, or schedule appointments. What would you like help with?';
    } else {
      response = 'That\'s a great question! Based on your health profile, I can provide personalized recommendations. To give you better guidance, could you provide a bit more detail about what you\'re asking?';
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

  viewArticle(article: any): void {
    console.log('Opening article:', article.title);
    // Navigate to article detail or open modal
  }

  trackMedication(medication: any): void {
    console.log('Tracking medication:', medication.name);
    // Log medication tracking event
  }

  scheduleDoctorAppointment(): void {
    this.router.navigate(['/patient/dashboard']);
  }

  checkSymptom(): void {
    this.userInput = 'Can you help me check my symptoms?';
    this.sendMessage();
  }

  getMedicationStatus(): void {
    const dueToday = this.medications.filter(m => m.nextDue.includes('Today')).length;
    this.userInput = `I have ${dueToday} medications due today`;
    this.sendMessage();
  }

  backToProfile(): void {
    this.router.navigate(['/patient/profile']);
  }
}
