export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9]{7,14}$/,
};

export const VALIDATION_RULES = {
  firstName: {
    minLength: 2,
  },
  surname: {
    minLength: 2,
  },
  password: {
    minLength: 6,
  },
  repeatPassword: {
    minLength: 6,
  },
  phone: {
    minLength: 7,
    maxLength: 14,
  },
};

export const VALIDATION_MESSAGES = {
  firstName: {
    required: 'First name is required',
    minlength: 'Name must be at least 2 characters',
  },
  surname: {
    required: 'Surname is required',
    minlength: 'Surname must be at least 2 characters',
  },
  email: {
    required: 'Email is required',
    invalidEmail: 'Please enter a valid email address',
  },
  dateOfBirth: {
    required: 'Date of birth is required',
  },
  gender: {
    required: 'Gender is required',
  },
  phoneCountryCode: {
    required: 'Phone country code is required',
  },
  phoneNumber: {
    required: 'Phone number is required',
    pattern: 'Phone number must be 7-14 digits',
  },
  nationalIdNumber: {
    required: 'National ID is required',
  },
  passportNumber: {
    required: 'Passport is required',
  },
  country: {
    required: 'Country is required',
  },
  city: {
    required: 'City is required',
  },
  password: {
    required: 'Password is required',
    minlength: 'Password must be at least 6 characters',
  },
  repeatPassword: {
    required: 'Please confirm your password',
    minlength: 'Password must be at least 6 characters',
    passwordMismatch: 'Passwords do not match',
  },
  role: {
    required: 'Account type is required',
  },
  documentType: {
    required: 'Identity document type is required',
  },
};

export const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export const ROLE_OPTIONS = [
  { value: 'PATIENT', label: 'Patient' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'ADMIN', label: 'Admin' },
];

export const DOCUMENT_TYPES = [
  { value: 'nationalId', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
];
