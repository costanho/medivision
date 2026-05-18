import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, OnDestroy {
  currentImageIndex = 0;
  carouselInterval: any;
  selectedFeatureIndex = 0;

  heroImages = [
    {
      url: 'assets/images/hero-image-1.jpeg',
      alt: 'Healthcare service 1'
    },
    {
      url: 'assets/images/hero-image-2.jpeg',
      alt: 'Healthcare service 2'
    },
    {
      url: 'assets/images/hero-image-3.jpeg',
      alt: 'Healthcare service 3'
    },
    {
      url: 'assets/images/hero-image-4.jpeg',
      alt: 'Healthcare service 4'
    },
    {
      url: 'assets/images/hero-image-5.jpeg',
      alt: 'Healthcare service 5'
    },
    {
      url: 'assets/images/hero-image-6.jpeg',
      alt: 'Healthcare service 6'
    },
    {
      url: 'assets/images/hero-image-7.jpeg',
      alt: 'Healthcare service 7'
    },
    {
      url: 'assets/images/hero-image-8.jpeg',
      alt: 'Healthcare service 8'
    }
  ];

  ngOnInit() {
    this.startCarousel();
  }

  ngOnDestroy() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.heroImages.length;
    }, 4000);
  }

  nextImage() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.heroImages.length;
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      this.startCarousel();
    }
  }

  previousImage() {
    this.currentImageIndex = (this.currentImageIndex - 1 + this.heroImages.length) % this.heroImages.length;
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      this.startCarousel();
    }
  }

  features = [
    {
      icon: '💼',
      title: 'CareNexus Direct',
      description: 'Our flagship platform connecting patients with healthcare providers. Schedule appointments, manage health records, and communicate securely all in one place.',
      color: '#667eea',
      previewImage: 'assets/images/hero-image-1.jpeg'
    },
    {
      icon: '🔗',
      title: 'CareNexus Proxy',
      description: 'Seamless integration layer that bridges healthcare systems. Connect with multiple facilities and providers through our unified proxy service.',
      color: '#764ba2',
      previewImage: 'assets/images/hero-image-2.jpeg'
    },
    {
      icon: '🤝',
      title: 'CareNexus Companion',
      description: 'AI-powered assistant that helps patients manage their health journey. Get personalized recommendations and health insights tailored to your needs.',
      color: '#f093fb',
      previewImage: 'assets/images/hero-image-3.jpeg'
    },
    {
      icon: '📡',
      title: 'CareNexus Connect',
      description: 'Real-time communication platform for patients and providers. Video consultations, messaging, and secure file sharing in one unified space.',
      color: '#f5576c',
      previewImage: 'assets/images/hero-image-4.jpeg'
    },
    {
      icon: '📊',
      title: 'CareNexus Analytics',
      description: 'Advanced analytics and reporting dashboard for healthcare insights. Track patient outcomes, provider performance, and system metrics in real-time.',
      color: '#00bcd4',
      previewImage: 'assets/images/hero-image-5.jpeg'
    },
    {
      icon: '📅',
      title: 'CareNexus Appointments',
      description: 'Intelligent scheduling system that optimizes appointment booking. Smart reminders, rescheduling, and calendar management for providers and patients.',
      color: '#4caf50',
      previewImage: 'assets/images/hero-image-6.jpeg'
    },
    {
      icon: '📋',
      title: 'CareNexus Records',
      description: 'Comprehensive electronic health records system. Secure storage, quick access, and seamless sharing of medical histories and documents.',
      color: '#ff9800',
      previewImage: 'assets/images/hero-image-7.jpeg'
    },
    {
      icon: '🔔',
      title: 'CareNexus Notifications',
      description: 'Intelligent notification system for alerts and updates. Real-time communication for appointments, prescriptions, and health alerts.',
      color: '#e91e63',
      previewImage: 'assets/images/hero-image-8.jpeg'
    }
  ];

  testimonials = [
    {
      text: 'CareNexus made finding a doctor so easy. I got an appointment within 24 hours. Highly recommended!',
      author: 'Sarah Johnson',
      role: 'Patient',
      avatar: 'SJ'
    },
    {
      text: 'The appointment scheduling is seamless and saves me hours. Best healthcare platform I have used.',
      author: 'Michael Chen',
      role: 'Patient',
      avatar: 'MC'
    },
    {
      text: 'As a doctor, I appreciate how organized everything is. My patients love the convenience.',
      author: 'Dr. Emily Watson',
      role: 'Healthcare Provider',
      avatar: 'EW'
    },
    {
      text: 'The secure messaging feature is perfect for follow-ups. Saves me and my doctor so much time.',
      author: 'James Rodriguez',
      role: 'Patient',
      avatar: 'JR'
    }
  ];

  aboutText = {
    title: 'About CareNexus',
    description: 'CareNexus is transforming healthcare by bridging the gap between patients and providers. Our platform empowers millions of people to take control of their health journey with easy access to quality medical professionals, streamlined appointment scheduling, and secure communication tools. Whether you need preventive care, specialist consultations, or ongoing health management, CareNexus connects you with trusted healthcare providers who are committed to your wellbeing. We believe that quality healthcare should be accessible to everyone, everywhere, at any time.',
    subtitle: 'Your trusted healthcare companion'
  };

  selectedBenefitTab = 0;

  statistics = [
    {
      icon: '👥',
      number: '50K+',
      label: 'Active Users',
      color: '#667eea'
    },
    {
      icon: '👨‍⚕️',
      number: '5K+',
      label: 'Healthcare Professionals',
      color: '#764ba2'
    },
    {
      icon: '🏥',
      number: '500+',
      label: 'Hospitals Connected',
      color: '#f093fb'
    },
    {
      icon: '🏠',
      number: '2K+',
      label: 'Home Care Providers',
      color: '#f5576c'
    },
    {
      icon: '🤝',
      number: '1K+',
      label: 'Service Providers',
      color: '#00bcd4'
    }
  ];

  benefits = [
    {
      title: 'For Patients',
      tagline: 'Manage your health journey with easy access to quality care, anytime, anywhere.',
      benefitsList: [
        { icon: '📅', title: 'Easy Scheduling', description: 'Book appointments with real-time availability' },
        { icon: '📋', title: 'Medical Records', description: 'Secure access to your complete health history' },
        { icon: '💬', title: 'Direct Messaging', description: 'Communicate securely with your healthcare providers' },
        { icon: '💊', title: 'Prescription Management', description: 'Auto-refills and medication tracking' },
        { icon: '🔔', title: 'Smart Reminders', description: 'Appointment and medication notifications' },
        { icon: '⚡', title: 'Quick Access', description: 'Emergency medical information at your fingertips' }
      ]
    },
    {
      title: 'For Healthcare Providers',
      tagline: 'Enhance patient care with streamlined workflows and efficient practice management tools.',
      benefitsList: [
        { icon: '👥', title: 'Patient Dashboard', description: 'Centralized view of all patient information' },
        { icon: '⏰', title: 'Smart Scheduling', description: 'Automated appointment and room management' },
        { icon: '📱', title: 'Secure Communication', description: 'HIPAA-compliant messaging with patients' },
        { icon: '📝', title: 'Digital Notes', description: 'Easy-to-use clinical documentation' },
        { icon: '📊', title: 'Analytics', description: 'Practice performance and patient insights' },
        { icon: '🔗', title: 'Integration', description: 'Connect with existing healthcare systems' }
      ]
    },
    {
      title: 'For Clinics & Hospitals',
      tagline: 'Optimize operations and improve patient outcomes with enterprise-grade management solutions.',
      benefitsList: [
        { icon: '🏗️', title: 'Centralized Data', description: 'Unified patient information across departments' },
        { icon: '👨‍💼', title: 'Team Coordination', description: 'Multi-department collaboration tools' },
        { icon: '📈', title: 'Analytics & Reporting', description: 'Real-time performance dashboards' },
        { icon: '🔒', title: 'Security', description: 'HIPAA-compliant data protection' },
        { icon: '📊', title: 'Resource Planning', description: 'Optimize staff and facility scheduling' },
        { icon: '💰', title: 'Cost Optimization', description: 'Reduce operational expenses through automation' }
      ]
    },
    {
      title: 'For Administrators',
      tagline: 'Control and monitor your healthcare ecosystem with comprehensive administrative tools.',
      benefitsList: [
        { icon: '📊', title: 'System Analytics', description: 'Comprehensive reporting and insights' },
        { icon: '👤', title: 'Access Control', description: 'Manage user roles and permissions' },
        { icon: '⚙️', title: 'System Management', description: 'Monitor performance and health' },
        { icon: '📋', title: 'Compliance', description: 'Audit trails and regulatory compliance' },
        { icon: '🔄', title: 'Backup & Recovery', description: 'Automated data protection systems' },
        { icon: '📱', title: 'API Access', description: 'Custom integrations and extensions' }
      ]
    }
  ];
}
