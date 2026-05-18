/**
 * Registration form data model
 */
export interface RegisterFormData {
  firstName: string;
  surname: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  phoneCountryCode: string;
  phoneNumber: string;
  documentType: 'nationalId' | 'passport';
  nationalIdNumber?: string;
  passportNumber?: string;
  country: string;
  city: string;
  password: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  referenceNumber?: string;
}

/**
 * Registration API response model
 */
export interface RegistrationResponse {
  success: boolean;
  message?: string;
  error?: string;
  referenceNumber?: string;
  email?: string;
  userId?: number;
}

/**
 * Document type validation model
 */
export interface DocumentTypeValidation {
  type: 'nationalId' | 'passport';
  fieldName: 'nationalIdNumber' | 'passportNumber';
}
