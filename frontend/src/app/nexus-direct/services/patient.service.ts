import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

export interface Patient {
  // Basic Information
  id: number;
  userEmail?: string;
  email?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  mobilePhone?: string;

  // Demographics
  age?: number;
  gender?: string;
  dateOfBirth?: string;

  // Medical Information
  bloodType?: string;
  height?: number;
  weight?: number;
  medicalConditions?: string;
  allergies?: string;
  currentMedications?: string;
  medicalHistory?: string;

  // Address & Location
  address?: string;
  location?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Emergency Contact
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;

  // Insurance Information
  insuranceProvider?: string;
  insurancePolicy?: string;
  insuranceGroupId?: string;

  // Additional Information
  nationalIdNumber?: string;
  passportNumber?: string;
  notes?: string;

  // Profile & Status
  profilePictureUrl?: string;
  isOnline?: boolean;
  lastSeenAt?: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
  registrationDate?: string;

  // User/Auth Information
  referenceNumber?: string;
  role?: string;
  password?: string;
}

export interface PatientListResponse {
  content: Patient[];
  totalElements: number;
  totalPages: number;
  pageable: any;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  // Cache for current patient data
  private currentPatient$ = new BehaviorSubject<Patient | null>(null);
  public currentPatient = this.currentPatient$.asObservable();

  // Cache timestamp to know if data is stale
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private apiService: ApiService) {}

  // Get current cached patient or null
  getCachedPatient(): Patient | null {
    return this.currentPatient$.value;
  }

  // Check if cached data is still valid
  isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION && this.currentPatient$.value !== null;
  }

  // Get all patients (paginated)
  getPatients(page: number = 0, size: number = 10): Observable<PatientListResponse> {
    console.log('[PatientService] getPatients called', { page, size });
    // Use the simpler endpoint that returns array directly
    return new Observable(subscriber => {
      this.apiService.get<Patient[]>('/patients')
        .subscribe({
          next: (patients) => {
            console.log('[PatientService] ✓ Got patients array from /patients endpoint:', patients);
            // Convert array response to paginated format
            const response: PatientListResponse = {
              content: patients,
              totalElements: patients.length,
              totalPages: 1,
              pageable: {}
            };
            subscriber.next(response);
            subscriber.complete();
          },
          error: (err) => {
            console.error('[PatientService] ✗ Error fetching patients:', err);
            subscriber.error(err);
          }
        });
    });
  }

  // Search patients by name
  searchByName(name: string, page: number = 0, size: number = 10): Observable<PatientListResponse> {
    return this.apiService.get<PatientListResponse>('/patients/search/by-name', {
      name,
      page,
      size
    });
  }

  // Search patients by email - returns paginated response
  // Note: The backend endpoint actually returns { content: [...] } format despite method name
  searchByEmail(email: string): Observable<any> {
    return this.apiService.get<any>('/patients/search/by-email', {
      email
    });
  }

  // Load and cache current patient by email
  loadAndCachePatientByEmail(email: string): Observable<Patient> {
    return new Observable(subscriber => {
      // If cache is valid, use it
      if (this.isCacheValid() && this.currentPatient$.value) {
        console.log('[PatientService] Using cached patient data');
        console.log('[PatientService] Cached patient:', this.currentPatient$.value);
        subscriber.next(this.currentPatient$.value);
        subscriber.complete();
        return;
      }

      // Otherwise fetch from API
      console.log('[PatientService] Fetching patient data from API for email:', email);
      this.searchByEmail(email).subscribe({
        next: (response: any) => {
          console.log('[PatientService] RAW API RESPONSE:', JSON.stringify(response, null, 2));
          console.log('[PatientService] API Response type:', typeof response);
          console.log('[PatientService] API Response keys:', response ? Object.keys(response) : 'null');

          // Extract patient from paginated response
          let patient: Patient | null = null;
          if (response && response.content && Array.isArray(response.content) && response.content.length > 0) {
            console.log('[PatientService] ✅ Response is paginated, extracted patient from content[0]');
            patient = response.content[0];
          } else if (response && typeof response === 'object' && response.id) {
            console.log('[PatientService] ✅ Response is direct patient object');
            patient = response;
          } else {
            console.log('[PatientService] ❌ No patient found in response');
          }

          if (!patient || !patient.id) {
            const error = 'No patient found for email: ' + email;
            console.error('[PatientService]', error);
            subscriber.error(new Error(error));
            return;
          }

          console.log('[PatientService] EXTRACTED PATIENT OBJECT:', JSON.stringify(patient, null, 2));
          console.log('[PatientService] Patient keys:', Object.keys(patient || {}));
          console.log('[PatientService] Patient ID:', patient.id);

          // Update cache
          this.currentPatient$.next(patient);
          this.cacheTimestamp = Date.now();
          console.log('[PatientService] ✅ Patient data cached successfully at:', new Date().toISOString());

          subscriber.next(patient);
          subscriber.complete();
        },
        error: (err: any) => {
          console.error('[PatientService] ❌ Failed to load patient:', err);
          console.error('[PatientService] Error status:', err.status);
          console.error('[PatientService] Error message:', err.message);
          console.error('[PatientService] Full error:', JSON.stringify(err, null, 2));
          subscriber.error(err);
        }
      });
    });
  }

  // Get single patient by ID
  getPatientById(id: number): Observable<Patient> {
    return this.apiService.get<Patient>(`/patients/${id}`);
  }

  // Get current logged-in patient profile
  getCurrentPatient(): Observable<Patient> {
    return this.apiService.get<Patient>('/patients/me');
  }

  // Create new patient
  createPatient(patient: any): Observable<Patient> {
    return this.apiService.post<Patient>('/patients', patient);
  }

  // Update patient
  updatePatient(id: number, patient: any): Observable<Patient> {
    return this.apiService.put<Patient>(`/patients/${id}`, patient);
  }

  // Update current patient profile
  updateCurrentPatient(patient: any): Observable<Patient> {
    const cachedPatient = this.currentPatient$.value;
    if (cachedPatient && cachedPatient.id) {
      console.log('[PatientService] Updating patient with ID:', cachedPatient.id);
      return this.apiService.put<Patient>(`/patients/${cachedPatient.id}`, patient);
    }
    console.error('[PatientService] No patient ID available for update');
    throw new Error('Patient ID not available');
  }

  // Delete patient
  deletePatient(id: number): Observable<any> {
    return this.apiService.delete(`/patients/${id}`);
  }

  // Update cached patient with address data
  setCachedPatientAddress(address: any): void {
    const current = this.currentPatient$.value;
    if (current) {
      const updated = { ...current, ...address };
      this.currentPatient$.next(updated);
      console.log('[PatientService] Updated cached patient with address:', updated);
    }
  }

  // Get user data from auth database by reference number
  getUserByReferenceNumber(referenceNumber: string): Observable<any> {
    console.log('[PatientService] Fetching user data for reference number:', referenceNumber);
    return this.apiService.get<any>('/auth/users/by-reference-number', {
      referenceNumber
    });
  }

  // Get patient data from direct database by reference number
  getPatientByReferenceNumber(referenceNumber: string): Observable<Patient> {
    console.log('[PatientService] Fetching patient data for reference number:', referenceNumber);
    return this.apiService.get<Patient>('/patients/by-reference-number', {
      referenceNumber
    });
  }

  // Update user data in auth database
  updateUserData(referenceNumber: string, userData: any): Observable<any> {
    console.log('[PatientService] Updating user data for reference number:', referenceNumber);
    return this.apiService.put<any>(`/auth/users/by-reference-number/${referenceNumber}`, userData);
  }

  // Update patient data in direct database
  updatePatientData(referenceNumber: string, patientData: any): Observable<Patient> {
    console.log('[PatientService] Updating patient data for reference number:', referenceNumber);
    return this.apiService.put<Patient>(`/patients/by-reference-number/${referenceNumber}`, patientData);
  }

  // Get user information (location, demographics) by reference number from direct database
  getUserInformationByReferenceNumber(referenceNumber: string): Observable<any> {
    console.log('[PatientService] 🔍 getUserInformationByReferenceNumber called for:', referenceNumber);
    return this.apiService.get<any>(`/users-information/reference/${referenceNumber}`).pipe(
      tap((userInfo: any) => {
        console.log('[PatientService] ✅ User information response:', userInfo);
        console.log('[PatientService] ✅ User information fetched:', JSON.stringify(userInfo, null, 2));
        console.log('[PatientService] User information keys:', userInfo ? Object.keys(userInfo) : 'null');
        if (userInfo && userInfo.address) {
          console.log('[PatientService] ✅ Address found:', userInfo.address);
        } else if (userInfo && userInfo.location) {
          console.log('[PatientService] ✅ Location found:', userInfo.location);
        }
      }),
      catchError((err: any) => {
        console.warn('[PatientService] ⚠️ Could not fetch user information by reference:', referenceNumber);
        console.warn('[PatientService] Error status:', err.status);
        console.warn('[PatientService] Error message:', err.message);
        console.warn('[PatientService] Full error:', JSON.stringify(err, null, 2));
        // Return empty object instead of null so merge still works
        return of({});
      })
    );
  }

  // Get user data by email from auth service
  // User data (firstName, lastName, phone, password, role, referenceNumber) is stored in Auth Service
  getUserByEmail(email: string): Observable<any> {
    console.log('[PatientService] 🔍 getUserByEmail called for email:', email);
    // Route to Auth Service endpoint: /auth/users/by-email
    return this.apiService.get<any>('/auth/users/by-email', {
      email: email
    }).pipe(
      tap((userData) => {
        console.log('[PatientService] ✅ getUserByEmail - RAW response received:', JSON.stringify(userData, null, 2));
        console.log('[PatientService] ✅ getUserByEmail - Response type:', typeof userData);
        console.log('[PatientService] ✅ getUserByEmail - Response keys:', userData ? Object.keys(userData) : 'null');
        console.log('[PatientService] ✅ getUserByEmail - firstName:', userData?.firstName);
        console.log('[PatientService] ✅ getUserByEmail - lastName:', userData?.lastName);
        console.log('[PatientService] ✅ getUserByEmail - email:', userData?.email);
        console.log('[PatientService] ✅ getUserByEmail - phone:', userData?.phone);
        console.log('[PatientService] ✅ getUserByEmail - role:', userData?.role);
        console.log('[PatientService] ✅ getUserByEmail - referenceNumber:', userData?.referenceNumber);
      }),
      catchError((err) => {
        console.error('[PatientService] ❌ Error fetching user by email:', email);
        console.error('[PatientService] ❌ Error details:', JSON.stringify(err, null, 2));
        console.error('[PatientService] ❌ Error status:', err.status);
        console.error('[PatientService] ❌ Error message:', err.message);
        return throwError(() => err);
      })
    );
  }
}
