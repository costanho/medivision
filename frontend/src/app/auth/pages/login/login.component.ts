import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  private destroy$ = new Subject<void>();
  private isLoggingIn = false; // Flag to track if we're in a login attempt

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  ngOnInit(): void {
    // Subscribe to role changes only when user is logging in
    this.authService.currentUserRole$
      .pipe(
        takeUntil(this.destroy$),
        filter(role => this.isLoggingIn && role !== null && role !== undefined) // Only redirect if logging in and role is available
      )
      .subscribe((role) => {
        this.redirectBasedOnRole(role);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.isLoggingIn = true; // Flag: we're attempting to login

    this.authService.login(this.loginForm.value).subscribe(
      (response) => {
        console.log('[LoginComponent] Login successful!', response);
        console.log('[LoginComponent] Response:', response);
        // AuthService is now fetching the role asynchronously
        // The ngOnInit subscription will handle redirect when role arrives
      },
      (error) => {
        console.error('[LoginComponent] Login failed:', error);
        this.error = error.error?.error || 'Login failed. Please check your credentials.';
        this.loading = false;
        this.submitted = false;
        this.isLoggingIn = false; // Reset flag on error
      }
    );
  }

  /**
   * Redirect user based on their role
   * Called by ngOnInit when role becomes available
   */
  private redirectBasedOnRole(role: string | null): void {
    let redirectUrl = '/service-selection'; // fallback

    console.log('[LoginComponent] Redirecting based on role:', role);

    // Handle both ROLE_* and * formats (backend returns PATIENT, DOCTOR, ADMIN without ROLE_ prefix)
    if (role === 'ROLE_PATIENT' || role === 'PATIENT') {
      redirectUrl = '/patient/profile';
    } else if (role === 'ROLE_DOCTOR' || role === 'DOCTOR') {
      redirectUrl = '/doctor/nexus-direct/profile';
    } else if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
      redirectUrl = '/admin/dashboard';
    }

    console.log('[LoginComponent] Redirecting to:', redirectUrl);

    // Reset flag before navigating
    this.isLoggingIn = false;
    this.loading = false;

    this.router.navigate([redirectUrl]);
  }
}
