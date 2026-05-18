import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CountryCodesService, CountryCode } from '../../../core/services/country-codes.service';
import { RegistrationOrchestratorService } from '../services/registration-orchestrator.service';
import { RegisterFormBuilderService } from './services/register-form-builder.service';
import { RegisterErrorHandlerService } from './services/register-error-handler.service';
import { RegisterValidatorsService } from './services/register-validators.service';
import { RegisterFormData } from './models/register-form.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  countryCodes: CountryCode[] = [];
  countries: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilderService: RegisterFormBuilderService,
    private countryCodesService: CountryCodesService,
    private orchestrator: RegistrationOrchestratorService,
    private errorHandler: RegisterErrorHandlerService,
    private validators: RegisterValidatorsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadCountries();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the registration form
   */
  private initializeForm(): void {
    this.registerForm = this.formBuilderService.buildRegisterForm();
  }

  /**
   * Load country codes and countries
   */
  private loadCountries(): void {
    this.countryCodes = this.countryCodesService.getUniqueSortedCodes();
    this.countries = this.countryCodesService.getCountries();
  }

  /**
   * Getter for form controls
   */
  get f() {
    return this.registerForm.controls;
  }

  /**
   * Get validation error message for a control
   */
  getErrorMessage(controlName: string): string {
    const control = this.registerForm.get(controlName);
    if (!this.submitted || !control?.errors) {
      return '';
    }
    return this.errorHandler.getErrorMessage(controlName, control.errors);
  }

  /**
   * Get password mismatch error message
   */
  getPasswordErrorMessage(): string {
    const repeatPasswordTouched = this.registerForm.get('repeatPassword')?.touched;
    return this.errorHandler.getPasswordMismatchMessage(this.registerForm.errors, repeatPasswordTouched || false);
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    if (!this.isFormValid()) {
      return;
    }

    this.submitRegistration();
  }

  /**
   * Validate form before submission
   */
  private isFormValid(): boolean {
    this.validators.validateDocumentFields(this.registerForm);

    if (this.registerForm.invalid) {
      return false;
    }
    return true;
  }

  /**
   * Submit registration to backend
   *
   * Orchestrates multi-database registration:
   * Step 1: Auth user creation (auth database)
   * Step 2: User information creation (direct database)
   * Step 3: Role-specific record creation (direct database)
   *
   * The RegistrationOrchestratorService handles:
   * - Reference number generation via SystemNumberService
   * - Sequential database inserts
   * - Password security (only sent to auth database)
   */
  private submitRegistration(): void {
    this.loading = true;

    const formData = this.prepareFormData();

    // Orchestrator handles reference number generation and all database inserts
    this.orchestrator.orchestrateRegistration(formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: this.handleSuccessResponse.bind(this),
      error: this.handleErrorResponse.bind(this),
    });
  }

  /**
   * Prepare form data for submission
   */
  private prepareFormData(): RegisterFormData {
    const rawValue = this.registerForm.getRawValue();
    return {
      firstName: rawValue.firstName,
      surname: rawValue.surname,
      email: rawValue.email,
      dateOfBirth: rawValue.dateOfBirth,
      gender: rawValue.gender,
      phoneCountryCode: rawValue.phoneCountryCode,
      phoneNumber: rawValue.phoneNumber,
      documentType: rawValue.documentType,
      nationalIdNumber: rawValue.nationalIdNumber,
      passportNumber: rawValue.passportNumber,
      country: rawValue.country,
      city: rawValue.city,
      password: rawValue.password,
      role: rawValue.role,
    };
  }

  /**
   * Handle successful registration response
   */
  private handleSuccessResponse(response: any): void {
    if (response.success) {
      this.router.navigate(['/login']);
    } else {
      this.error = response.error || 'Registration failed. Please try again.';
      this.loading = false;
    }
  }

  /**
   * Handle registration error
   */
  private handleErrorResponse(error: any): void {
    this.error = this.errorHandler.extractApiError(error);
    this.loading = false;
  }
}
