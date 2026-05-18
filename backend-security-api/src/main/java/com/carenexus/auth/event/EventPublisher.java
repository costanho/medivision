package com.carenexus.auth.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

/**
 * ====================================================================
 * Event Publisher - Kafka Event Bus
 * ====================================================================
 *
 * Publishes authentication events to Kafka topics for consumption
 * by other microservices.
 *
 * Topics:
 * - user.registered        → New user registration
 * - user.loggedIn          → User login event
 * - user.loggedOut         → User logout event
 * - token.refreshed        → Token refresh event
 *
 * Consumers (Other Services):
 * - Nexus Direct Service   → Create doctor/patient records
 * - Activity Service       → Log user activities
 * - Analytics Service      → Track metrics
 * - Security Service       → Monitor suspicious activities
 *
 * Configuration:
 * - Broker: localhost:9092 (development)
 * - Broker: kafka:9092 (Docker)
 * - Format: JSON serialization via Jackson
 *
 * Usage:
 *   @Autowired
 *   private EventPublisher eventPublisher;
 *
 *   eventPublisher.publishUserRegistered(user);
 *   eventPublisher.publishUserLoggedIn(user);
 *
 * ====================================================================
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    // Topic names (match Kafka configuration)
    private static final String TOPIC_USER_REGISTERED = "user.registered";
    private static final String TOPIC_USER_LOGGED_IN = "user.loggedIn";
    private static final String TOPIC_USER_LOGGED_OUT = "user.loggedOut";
    private static final String TOPIC_TOKEN_REFRESHED = "token.refreshed";

    /**
     * Publish user registration event.
     *
     * Called in: AuthService.register()
     *
     * @param event UserRegisteredEvent containing user details
     */
    public void publishUserRegistered(UserRegisteredEvent event) {
        log.info("[EventPublisher] Publishing user.registered event for user: {}", event.getEmail());
        publishEvent(TOPIC_USER_REGISTERED, event);
    }

    /**
     * Publish user login event.
     *
     * Called in: AuthService.login()
     *
     * @param event UserLoggedInEvent containing login details
     */
    public void publishUserLoggedIn(UserLoggedInEvent event) {
        log.info("[EventPublisher] Publishing user.loggedIn event for user: {}", event.getEmail());
        publishEvent(TOPIC_USER_LOGGED_IN, event);
    }

    /**
     * Publish user logout event.
     *
     * Called in: AuthService.logout() or AuthController.logout()
     *
     * @param event UserLoggedOutEvent containing logout details
     */
    public void publishUserLoggedOut(UserLoggedOutEvent event) {
        log.info("[EventPublisher] Publishing user.loggedOut event for user: {}", event.getEmail());
        publishEvent(TOPIC_USER_LOGGED_OUT, event);
    }

    /**
     * Publish token refresh event.
     *
     * Called in: AuthService.refreshToken()
     *
     * @param event TokenRefreshedEvent containing refresh details
     */
    public void publishTokenRefreshed(TokenRefreshedEvent event) {
        log.info("[EventPublisher] Publishing token.refreshed event for user: {}", event.getEmail());
        publishEvent(TOPIC_TOKEN_REFRESHED, event);
    }

    /**
     * Generic method to publish any event to Kafka.
     *
     * Internal helper method.
     *
     * @param topic   Kafka topic name
     * @param event   Event object to serialize and publish
     */
    private void publishEvent(String topic, Object event) {
        try {
            // Serialize event to JSON
            String eventJson = objectMapper.writeValueAsString(event);
            log.debug("[EventPublisher] Event JSON: {}", eventJson);

            // Publish to Kafka
            kafkaTemplate.send(topic, eventJson)
                    .thenAccept(result -> {
                        log.info("[EventPublisher] ✓ Event published to topic '{}': partition={}, offset={}",
                                topic,
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    })
                    .exceptionally(ex -> {
                        log.error("[EventPublisher] ✗ Failed to publish event to topic '{}': {}",
                                topic, ex.getMessage(), ex);
                        return null;
                    });

        } catch (Exception e) {
            log.error("[EventPublisher] ✗ Error serializing event: {}", e.getMessage(), e);
        }
    }
}