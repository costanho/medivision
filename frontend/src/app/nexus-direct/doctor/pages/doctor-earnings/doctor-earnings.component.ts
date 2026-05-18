import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'annual';
  features: string[];
  consultation_fee_limit: number;
  appointment_limit: number;
  is_active: boolean;
}

interface Transaction {
  id: number;
  date: string;
  type: 'consultation' | 'appointment' | 'subscription' | 'refund';
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
}

interface EarningsData {
  total_earned: number;
  current_month_earned: number;
  pending_balance: number;
  total_consultations: number;
  total_appointments: number;
  average_consultation_fee: number;
}

interface DoctorSubscription {
  id: number;
  plan_id: number;
  plan_name: string;
  status: 'active' | 'inactive' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  renewal_date: string;
  is_auto_renew: boolean;
  next_billing_date: string;
}

@Component({
  selector: 'app-doctor-earnings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-earnings.component.html',
  styleUrls: ['./doctor-earnings.component.scss']
})
export class DoctorEarningsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Earnings Data
  earningsData: EarningsData = {
    total_earned: 0,
    current_month_earned: 0,
    pending_balance: 0,
    total_consultations: 0,
    total_appointments: 0,
    average_consultation_fee: 0
  };

  // Subscription Data
  subscription: DoctorSubscription | null = null;
  availablePlans: SubscriptionPlan[] = [];
  subscriptionStatus: 'active' | 'inactive' | 'expired' = 'inactive';

  // Transactions
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  transactionFilter: 'all' | 'consultation' | 'appointment' | 'subscription' | 'refund' = 'all';
  selectedPeriod: '7days' | '30days' | '90days' | 'all' = '30days';

  // UI State
  loading = false;
  error = '';
  successMessage = '';
  showSubscriptionModal = false;
  selectedPlan: SubscriptionPlan | null = null;

  ngOnInit(): void {
    console.log('[DoctorEarnings] Component initialized');
    this.loadEarningsData();
    this.loadSubscriptionData();
    this.loadTransactions();
    this.loadAvailablePlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEarningsData(): void {
    // Mock data - replace with actual API call
    this.earningsData = {
      total_earned: 15750.50,
      current_month_earned: 3450.00,
      pending_balance: 850.00,
      total_consultations: 185,
      total_appointments: 342,
      average_consultation_fee: 85.13
    };
    console.log('[DoctorEarnings] Earnings data loaded');
  }

  private loadSubscriptionData(): void {
    // Mock data - replace with actual API call
    this.subscription = {
      id: 1,
      plan_id: 2,
      plan_name: 'Professional',
      status: 'active',
      start_date: '2025-12-13',
      end_date: '2026-01-13',
      renewal_date: '2026-01-13',
      is_auto_renew: true,
      next_billing_date: '2026-01-13'
    };

    if (this.subscription) {
      this.subscriptionStatus = this.subscription.status as any;
    }
    console.log('[DoctorEarnings] Subscription data loaded');
  }

  private loadTransactions(): void {
    // Mock data - replace with actual API call
    this.transactions = [
      {
        id: 1,
        date: '2026-01-12',
        type: 'consultation',
        description: 'Video consultation with Patient',
        amount: 85.00,
        status: 'completed'
      },
      {
        id: 2,
        date: '2026-01-11',
        type: 'appointment',
        description: 'In-person appointment',
        amount: 120.00,
        status: 'completed'
      },
      {
        id: 3,
        date: '2026-01-10',
        type: 'subscription',
        description: 'Professional Plan Renewal',
        amount: -99.99,
        status: 'completed'
      },
      {
        id: 4,
        date: '2026-01-08',
        type: 'consultation',
        description: 'Follow-up consultation',
        amount: 65.00,
        status: 'completed'
      },
      {
        id: 5,
        date: '2026-01-05',
        type: 'appointment',
        description: 'Phone consultation',
        amount: 50.00,
        status: 'pending'
      },
      {
        id: 6,
        date: '2026-01-03',
        type: 'refund',
        description: 'Cancelled appointment refund',
        amount: -120.00,
        status: 'completed'
      }
    ];

    this.applyTransactionFilters();
    console.log('[DoctorEarnings] Transactions loaded');
  }

  private loadAvailablePlans(): void {
    // Mock data - replace with actual API call
    this.availablePlans = [
      {
        id: 1,
        name: 'Starter',
        price: 29.99,
        billing_cycle: 'monthly',
        features: ['Up to 100 consultations/month', 'Basic analytics', 'Email support'],
        consultation_fee_limit: 50,
        appointment_limit: 100,
        is_active: false
      },
      {
        id: 2,
        name: 'Professional',
        price: 99.99,
        billing_cycle: 'monthly',
        features: ['Unlimited consultations', 'Advanced analytics', 'Priority support', 'Custom branding'],
        consultation_fee_limit: 200,
        appointment_limit: 500,
        is_active: true
      },
      {
        id: 3,
        name: 'Premium',
        price: 199.99,
        billing_cycle: 'monthly',
        features: ['Unlimited everything', 'AI-powered analytics', '24/7 support', 'White-label option', 'API access'],
        consultation_fee_limit: 500,
        appointment_limit: 9999,
        is_active: false
      }
    ];
    console.log('[DoctorEarnings] Available plans loaded');
  }

  applyTransactionFilters(): void {
    this.filteredTransactions = this.transactions.filter(transaction => {
      const matchesType = this.transactionFilter === 'all' || transaction.type === this.transactionFilter;

      // Apply period filter
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      const daysAgo = this.getDaysFromPeriod();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      const matchesPeriod = this.selectedPeriod === 'all' || transactionDate >= cutoffDate;

      return matchesType && matchesPeriod;
    });
  }

  private getDaysFromPeriod(): number {
    switch (this.selectedPeriod) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      case 'all': return 999999;
      default: return 30;
    }
  }

  openSubscriptionModal(plan: SubscriptionPlan): void {
    this.selectedPlan = plan;
    this.showSubscriptionModal = true;
    console.log('[DoctorEarnings] Subscription modal opened for plan:', plan.name);
  }

  closeSubscriptionModal(): void {
    this.showSubscriptionModal = false;
    this.selectedPlan = null;
  }

  upgradeSubscription(): void {
    if (!this.selectedPlan) return;

    this.loading = true;
    console.log('[DoctorEarnings] Upgrading to plan:', this.selectedPlan.name);

    // Simulate API call
    setTimeout(() => {
      this.subscription = {
        id: 1,
        plan_id: this.selectedPlan!.id,
        plan_name: this.selectedPlan!.name,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_auto_renew: true,
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      this.subscriptionStatus = 'active';
      this.successMessage = `Successfully upgraded to ${this.selectedPlan?.name} plan!`;
      this.loading = false;
      this.closeSubscriptionModal();

      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 1000);
  }

  cancelSubscription(): void {
    if (!this.subscription) return;

    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      this.loading = true;
      console.log('[DoctorEarnings] Cancelling subscription');

      setTimeout(() => {
        if (this.subscription) {
          this.subscription.status = 'cancelled';
          this.subscriptionStatus = 'inactive';
        }
        this.successMessage = 'Subscription cancelled. You will have access until the end of your billing period.';
        this.loading = false;

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      }, 1000);
    }
  }

  renewSubscription(): void {
    if (!this.subscription) return;

    this.loading = true;
    console.log('[DoctorEarnings] Renewing subscription');

    setTimeout(() => {
      if (this.subscription) {
        this.subscription.status = 'active';
        this.subscription.end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      this.subscriptionStatus = 'active';
      this.successMessage = 'Subscription renewed successfully!';
      this.loading = false;

      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 1000);
  }

  toggleAutoRenew(): void {
    if (this.subscription) {
      this.subscription.is_auto_renew = !this.subscription.is_auto_renew;
      this.successMessage = `Auto-renewal ${this.subscription.is_auto_renew ? 'enabled' : 'disabled'}`;
      setTimeout(() => {
        this.successMessage = '';
      }, 2000);
    }
  }

  requestWithdrawal(): void {
    if (this.earningsData.pending_balance <= 0) {
      this.error = 'No pending balance to withdraw';
      return;
    }

    if (confirm(`Withdraw $${this.earningsData.pending_balance.toFixed(2)}?`)) {
      this.loading = true;
      console.log('[DoctorEarnings] Requesting withdrawal of:', this.earningsData.pending_balance);

      setTimeout(() => {
        this.successMessage = `Withdrawal request submitted! You will receive $${this.earningsData.pending_balance.toFixed(2)} within 3-5 business days.`;
        this.earningsData.pending_balance = 0;
        this.loading = false;

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      }, 1000);
    }
  }

  getTransactionIcon(type: string): string {
    switch (type) {
      case 'consultation': return 'fas fa-video';
      case 'appointment': return 'fas fa-calendar-check';
      case 'subscription': return 'fas fa-credit-card';
      case 'refund': return 'fas fa-undo';
      default: return 'fas fa-money-bill';
    }
  }

  getTransactionColor(type: string): string {
    switch (type) {
      case 'consultation': return '#3b82f6';
      case 'appointment': return '#8b5cf6';
      case 'subscription': return '#ef4444';
      case 'refund': return '#f59e0b';
      default: return '#6b7280';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed': return 'completed';
      case 'pending': return 'pending';
      case 'failed': return 'failed';
      default: return 'pending';
    }
  }

  getSubscriptionStatusClass(): string {
    switch (this.subscriptionStatus) {
      case 'active': return 'active';
      case 'expired': return 'expired';
      case 'inactive': return 'inactive';
      default: return 'inactive';
    }
  }

  clearError(): void {
    this.error = '';
  }
}
