import { Injectable } from '@angular/core';

/**
 * System Number Service
 *
 * Handles system-wide numbering and sequencing logic
 */
@Injectable({
  providedIn: 'root'
})
export class SystemNumberService {

  /**
   * Generate initials from user information
   * @param firstName - User's first name
   * @param surname - User's surname
   * @param occupation - User's occupation
   * @returns Combined initials in format: OFS (Occupation, First name, Surname)
   */
  getInitials(firstName: string, surname: string, occupation: string): string {
    const firstLetterFirstName = firstName.charAt(0).toUpperCase();
    const firstLetterSurname = surname.charAt(0).toUpperCase();
    const firstLetterOccupation = occupation.charAt(0).toUpperCase();
    const dateNumber = this.getTodayAsNumber();
    const threeDigitNumber = this.getThreeDigitNumber();
    const time12Hour = this.getCurrentTime12Hour();

    return `${firstLetterFirstName}${firstLetterSurname}${firstLetterOccupation}${dateNumber}${threeDigitNumber}${time12Hour}`;
  }

  /**
   * Get today's date as a numeric value
   * @returns Date in DDMMYY format as a number
   */
  getTodayAsNumber(): number {
    const today = new Date();

    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = String(today.getFullYear()).slice(-2);
    

    return Number(`${day}${month}${year}`);
  }

  /**
   * Generate registration data with system reference number
   * @param formData - User registration form data
   * @returns Registration data enriched with system reference number
   */
  generateRegistrationData(formData: any): any {
    const registrationDataWithRef = {
      ...formData,
      systemReferenceNumber: this.generateSystemReferenceNumber(formData)
    };

    return registrationDataWithRef;
  }

  /**
   * Generate a unique system reference number for a user
   * @param formData - User registration form data
   * @returns System reference number in format: OCCUPATION + DATE
   */
  private generateSystemReferenceNumber(formData: any): string {
    const dateNumber = this.getTodayAsNumber();
    const rolePrefix = this.getRolePrefix(formData.role);
    const initials = this.getInitials(formData.firstName, formData.surname, formData.role);
    const threeDigitNumber = this.getThreeDigitNumber();
    const time12Hour = this.getCurrentTime12Hour();

    return `${initials}${rolePrefix}${dateNumber}${threeDigitNumber}${time12Hour}`;
  }

  /**
   * Get role prefix for system reference number
   * @param role - User role (PATIENT, DOCTOR, ADMIN, etc.)
   * @returns One-letter prefix for the role
   */
  private getRolePrefix(role: string): string {
    return role.substring(0, 2).toUpperCase();
  }

  private getCurrentTime12Hour(): string {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Convert to 12-hour format
    hours = hours % 12 || 12; // Convert 0 to 12 for midnight
    
    // Format without leading zeros and no colon
    const formattedMinutes = String(minutes).padStart(2, '0');
    
    return `${hours}${formattedMinutes}`;
  }

  private getThreeDigitNumber(): number {
    return Math.floor(Math.random() * 900) + 100;
  }
}
