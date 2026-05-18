import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Microservice endpoints - prefer values from `environment` so runtime ports can be configured
  private readonly DIRECT_SERVICE_URL =
    environment.directServiceUrl || 'http://localhost:8081/api'; // Doctors, Patients, Appointments
  private readonly AUTH_SERVICE_URL =
    environment.authServiceUrl || 'http://localhost:8082/api'; // Authentication, JWT

  constructor(private http: HttpClient) {}

  /**
   * Determine which service URL to use based on endpoint
   * Auth endpoints (/auth/...) → Auth Service (8082)
   * All other endpoints → Direct Service (8081)
   */
  private getBaseUrl(endpoint: string): string {
    if (endpoint.startsWith('/auth')) {
      return this.AUTH_SERVICE_URL;
    }
    return this.DIRECT_SERVICE_URL;
  }

  /**
   * GET request - Auto-routes to correct microservice
   */
  get<T>(endpoint: string, params?: any): Observable<T> {
    const baseUrl = this.getBaseUrl(endpoint);
    return this.http.get<T>(`${baseUrl}${endpoint}`, {
      params: this.buildParams(params)
    });
  }

  /**
   * POST request - Auto-routes to correct microservice
   */
  post<T>(endpoint: string, body: any): Observable<T> {
    const baseUrl = this.getBaseUrl(endpoint);
    return this.http.post<T>(`${baseUrl}${endpoint}`, body);
  }

  /**
   * PUT request - Auto-routes to correct microservice
   */
  put<T>(endpoint: string, body: any, params?: any): Observable<T> {
    const baseUrl = this.getBaseUrl(endpoint);
    const options = params ? { params: this.buildParams(params) } : {};
    return this.http.put<T>(`${baseUrl}${endpoint}`, body, options);
  }

  /**
   * DELETE request - Auto-routes to correct microservice
   */
  delete<T>(endpoint: string): Observable<T> {
    const baseUrl = this.getBaseUrl(endpoint);
    return this.http.delete<T>(`${baseUrl}${endpoint}`);
  }

  /**
   * Build HTTP params from object
   */
  private buildParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return httpParams;
  }
}
