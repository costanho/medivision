import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly ACCESS_TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly USER_KEY = 'user';

  constructor() {}

  /**
   * Save access token
   */
  setAccessToken(token: string): void {
    console.log('[StorageService] Saving access token:', token ? `${token.substring(0, 20)}...` : 'NULL');
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    const saved = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    console.log('[StorageService] Token saved and verified:', saved ? `${saved.substring(0, 20)}...` : 'NOT SAVED');
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    console.log('[StorageService] Retrieved access token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN FOUND');
    return token;
  }

  /**
   * Save refresh token
   */
  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Save user data
   */
  setUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Get user data
   */
  getUser(): any {
    const user = localStorage.getItem(this.USER_KEY);
    if (!user || user === 'undefined' || user === 'null') {
      return null;
    }
    try {
      return JSON.parse(user);
    } catch (error) {
      console.error('Error parsing user from storage:', error);
      return null;
    }
  }

  /**
   * Clear all tokens and user data (logout)
   */
  clear(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }
}
