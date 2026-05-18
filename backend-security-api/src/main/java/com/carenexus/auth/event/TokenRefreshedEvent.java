package com.carenexus.auth.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ====================================================================
 * Token Refreshed Event
 * ====================================================================
 *
 * Published to Kafka topic: token.refreshed
 *
 * Triggered when:
 * - User refreshes JWT token via /api/auth/refresh-token
 *
 * Consumers:
 * - Security Service (track token refreshes)
 * - Analytics Service (monitor token usage)
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
public class TokenRefreshedEvent {

    private Long userId;
    private String email;
    private LocalDateTime timestamp;

    /**
     * Static factory method.
     */
    public static TokenRefreshedEvent of(Long userId, String email) {
        return TokenRefreshedEvent.builder()
                .userId(userId)
                .email(email)
                .timestamp(LocalDateTime.now())
                .build();
    }
}