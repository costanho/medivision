package com.carenexus.auth.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ====================================================================
 * User Registered Event
 * ====================================================================
 *
 * Published to Kafka topic: user.registered
 *
 * Triggered when:
 * - A new user creates an account via /api/auth/register
 *
 * Consumers:
 * - Nexus Direct Service (create doctor/patient record)
 * - Notification Service (send welcome email)
 * - Analytics Service (track new registrations)
 *
 * Schema:
 * {
 *   "userId": 1,
 *   "email": "john@example.com",
 *   "fullName": "John Doe",
 *   "role": "ROLE_DOCTOR",
 *   "timestamp": "2025-11-29T12:34:56"
 * }
 *
 * ====================================================================
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRegisteredEvent {

    private Long userId;
    private String email;
    private String fullName;
    private String role;  // ROLE_DOCTOR, ROLE_PATIENT, ROLE_ADMIN
    private LocalDateTime timestamp;

    /**
     * Static factory method for creating events.
     */
    public static UserRegisteredEvent of(Long userId, String email, String fullName, String role) {
        return UserRegisteredEvent.builder()
                .userId(userId)
                .email(email)
                .fullName(fullName)
                .role(role)
                .timestamp(LocalDateTime.now())
                .build();
    }
}