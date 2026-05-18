package com.carenexus.auth.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ====================================================================
 * User Logged Out Event
 * ====================================================================
 *
 * Published to Kafka topic: user.loggedOut
 *
 * Triggered when:
 * - User logs out via /api/auth/logout (if implemented)
 * - Session expires
 *
 * Consumers:
 * - Activity Logging Service
 * - Session Management Service
 * - Analytics Service
 *
 * Schema:
 * {
 *   "userId": 1,
 *   "email": "john@example.com",
 *   "timestamp": "2025-11-29T12:34:56"
 * }
 *
 * ====================================================================
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserLoggedOutEvent {

    private Long userId;
    private String email;
    private LocalDateTime timestamp;

    /**
     * Static factory method.
     */
    public static UserLoggedOutEvent of(Long userId, String email) {
        return UserLoggedOutEvent.builder()
                .userId(userId)
                .email(email)
                .timestamp(LocalDateTime.now())
                .build();
    }
}