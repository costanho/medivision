package com.carenexus.auth.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ====================================================================
 * User Logged In Event
 * ====================================================================
 *
 * Published to Kafka topic: user.loggedIn
 *
 * Triggered when:
 * - User successfully logs in via /api/auth/login
 *
 * Consumers:
 * - Activity Logging Service (track login events)
 * - Security Service (monitor suspicious logins)
 * - Analytics Service (user activity tracking)
 *
 * Schema:
 * {
 *   "userId": 1,
 *   "email": "john@example.com",
 *   "timestamp": "2025-11-29T12:34:56",
 *   "ipAddress": "192.168.1.100"
 * }
 *
 * ====================================================================
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserLoggedInEvent {

    private Long userId;
    private String email;
    private LocalDateTime timestamp;
    private String ipAddress;  // Optional: IP address for security tracking

    /**
     * Static factory method.
     */
    public static UserLoggedInEvent of(Long userId, String email) {
        return UserLoggedInEvent.builder()
                .userId(userId)
                .email(email)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static UserLoggedInEvent of(Long userId, String email, String ipAddress) {
        return UserLoggedInEvent.builder()
                .userId(userId)
                .email(email)
                .timestamp(LocalDateTime.now())
                .ipAddress(ipAddress)
                .build();
    }
}