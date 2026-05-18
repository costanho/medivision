import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * ProfileDataService
 *
 * Simple state container for patient profile data.
 * Can be extended in the future to handle more complex logic.
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileDataService {
  private patientSubject = new BehaviorSubject<any>(null);
  private authUserSubject = new BehaviorSubject<any>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  patient$ = this.patientSubject.asObservable();
  authUser$ = this.authUserSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  setPatient(patient: any): void {
    this.patientSubject.next(patient);
  }

  getPatient(): any {
    return this.patientSubject.getValue();
  }

  setAuthUser(user: any): void {
    this.authUserSubject.next(user);
  }

  getAuthUser(): any {
    return this.authUserSubject.getValue();
  }

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  isLoading(): boolean {
    return this.loadingSubject.getValue();
  }

  clearCache(): void {
    this.patientSubject.next(null);
    this.authUserSubject.next(null);
    this.loadingSubject.next(false);
  }
}
