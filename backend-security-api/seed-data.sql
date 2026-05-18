-- ====================================================================
-- CareNexus Auth Service - Test Data/Seed Users
-- ====================================================================
-- This script inserts test users for development and testing
-- Passwords are hashed using bcrypt (Spring Security)
-- ====================================================================

-- NOTE: These are hashed passwords for testing purposes ONLY
-- Password: "patient123" (bcrypt)
-- Hash: $2a$10$dXJ3SW6G7P50eS3B.lR/Ye4v.YXkQlZKqfP6RW.7Hx6KMvnwEFvdu

-- Password: "doctor123" (bcrypt)
-- Hash: $2a$10$85R3IG4PB7O3MYA9H8t3OuQvGLzJqLxGJCu.KrKzFJDXFxBvPDZ0m

-- Password: "admin123" (bcrypt)
-- Hash: $2a$10$qPZFAuQ1sRn7ETRM4Cf7Mu4r8U8WdYqz0I7KZp8IxD5B2Z9rT7K0O

-- ====================================================================
-- Insert Test Patient
-- ====================================================================
INSERT INTO users (reference_number, email, password, first_name, last_name, phone, role)
VALUES (
  'JD20260426001-0900',
  'patient@carenexus.com',
  '$2a$10$dXJ3SW6G7P50eS3B.lR/Ye4v.YXkQlZKqfP6RW.7Hx6KMvnwEFvdu',
  'John',
  'Patient',
  '+263712345678',
  'PATIENT'
) ON CONFLICT DO NOTHING;

-- ====================================================================
-- Insert Test Doctor
-- ====================================================================
INSERT INTO users (reference_number, email, password, first_name, last_name, phone, role)
VALUES (
  'SM20260426002-0915',
  'doctor@carenexus.com',
  '$2a$10$85R3IG4PB7O3MYA9H8t3OuQvGLzJqLxGJCu.KrKzFJDXFxBvPDZ0m',
  'Sarah',
  'Doctor',
  '+263787654321',
  'DOCTOR'
) ON CONFLICT DO NOTHING;

-- ====================================================================
-- Insert Test Admin
-- ====================================================================
INSERT INTO users (reference_number, email, password, first_name, last_name, phone, role)
VALUES (
  'AM20260426003-0930',
  'admin@carenexus.com',
  '$2a$10$qPZFAuQ1sRn7ETRM4Cf7Mu4r8U8WdYqz0I7KZp8IxD5B2Z9rT7K0O',
  'Admin',
  'User',
  '+263799999999',
  'ADMIN'
) ON CONFLICT DO NOTHING;
