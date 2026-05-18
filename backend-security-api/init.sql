-- ====================================================================
-- CareNexus Auth Service - PostgreSQL Database Initialization
-- ====================================================================
-- This script initializes the PostgreSQL database schema for the auth service
-- Tables: users, refresh_token
-- ====================================================================

-- ================================================================
-- Create USERS table
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    reference_number VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- Create REFRESH_TOKEN table (related to users)
-- ================================================================
CREATE TABLE IF NOT EXISTS refresh_token (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(500) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expiry_date TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- Create Indexes for better query performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_reference_number ON users(reference_number);
CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id ON refresh_token(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_token ON refresh_token(token);

-- ================================================================
-- Comments for documentation
-- ================================================================
COMMENT ON TABLE users IS 'Stores user authentication data (patients, doctors, admins)';
COMMENT ON COLUMN users.reference_number IS 'Business reference number (e.g., JEPA130326456-1430)';
COMMENT ON COLUMN users.role IS 'User role: PATIENT, DOCTOR, or ADMIN';

COMMENT ON TABLE refresh_token IS 'Stores JWT refresh tokens with expiry and revocation status';
COMMENT ON COLUMN refresh_token.revoked IS 'TRUE if token has been revoked/logged out';
