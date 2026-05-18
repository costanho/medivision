package com.carenexus.auth.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import java.util.HashMap;
import java.util.Map;

/**
 * ====================================================================
 * Kafka Configuration for Auth Service
 * ====================================================================
 *
 * Configures:
 * - Kafka Producer (for publishing events)
 * - KafkaTemplate bean
 * - Topic creation
 * - Serialization settings
 *
 * Topics Created:
 * - user.registered     (3 partitions, 1 replica)
 * - user.loggedIn       (3 partitions, 1 replica)
 * - user.loggedOut      (3 partitions, 1 replica)
 * - token.refreshed     (3 partitions, 1 replica)
 *
 * Broker Settings:
 * - Connection: localhost:9092 (dev) or kafka:9092 (docker)
 * - Acks: all (wait for all replicas to acknowledge)
 * - Retries: 3 (retry failed sends)
 * - Batch size: 16KB
 * - Compression: snappy (reduces message size)
 *
 * ====================================================================
 */
@Slf4j
@Configuration
@EnableKafka
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    /**
     * Create Kafka Admin for topic management.
     *
     * This bean automatically creates topics on startup if they don't exist.
     *
     * @return KafkaAdmin configured with bootstrap servers
     */
    @Bean
    @ConditionalOnProperty(name = "kafka.enabled", havingValue = "true", matchIfMissing = false)
    public KafkaAdmin kafkaAdmin() {
        log.info("[KafkaConfig] Creating KafkaAdmin with bootstrap servers: {}", bootstrapServers);

        Map<String, Object> configs = new HashMap<>();
        configs.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        return new KafkaAdmin(configs);
    }

    /**
     * Create topics automatically on startup.
     *
     * Topics:
     * - user.registered: New user registrations
     * - user.loggedIn: User login events
     * - user.loggedOut: User logout events
     * - token.refreshed: Token refresh events
     *
     * @return NewTopic bean for user.registered
     */
    @Bean
    public NewTopic userRegisteredTopic() {
        log.info("[KafkaConfig] Creating topic: user.registered");
        return new NewTopic("user.registered", 3, (short) 1);
    }

    @Bean
    public NewTopic userLoggedInTopic() {
        log.info("[KafkaConfig] Creating topic: user.loggedIn");
        return new NewTopic("user.loggedIn", 3, (short) 1);
    }

    @Bean
    public NewTopic userLoggedOutTopic() {
        log.info("[KafkaConfig] Creating topic: user.loggedOut");
        return new NewTopic("user.loggedOut", 3, (short) 1);
    }

    @Bean
    public NewTopic tokenRefreshedTopic() {
        log.info("[KafkaConfig] Creating topic: token.refreshed");
        return new NewTopic("token.refreshed", 3, (short) 1);
    }

    /**
     * Configure Kafka producer factory.
     *
     * Settings:
     * - Key serializer: StringSerializer
     * - Value serializer: StringSerializer (for JSON messages)
     * - Acks: all (wait for all in-sync replicas)
     * - Retries: 3
     * - Batch size: 16KB
     * - Compression: snappy
     *
     * @return ProducerFactory<String, String>
     */
    @Bean
    public ProducerFactory<String, String> producerFactory() {
        log.info("[KafkaConfig] Configuring Kafka producer factory");

        Map<String, Object> configProps = new HashMap<>();

        // Bootstrap servers
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);

        // Serialization
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

        // Producer behavior
        configProps.put(ProducerConfig.ACKS_CONFIG, "all");              // Wait for all replicas
        configProps.put(ProducerConfig.RETRIES_CONFIG, 3);               // Retry failed sends
        configProps.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);        // 16KB batch
        configProps.put(ProducerConfig.LINGER_MS_CONFIG, 10);            // Wait 10ms for batches
        configProps.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy"); // Compress messages

        // Performance tuning
        configProps.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);  // 32MB buffer
        configProps.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

        log.debug("[KafkaConfig] Producer config: acks=all, retries=3, compression=snappy");
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    /**
     * Create KafkaTemplate bean for sending messages.
     *
     * This bean is used by EventPublisher to send messages to Kafka topics.
     *
     * Usage:
     *   kafkaTemplate.send("topic-name", messageJson);
     *
     * @param producerFactory ProducerFactory
     * @return KafkaTemplate<String, String>
     */
    @Bean
    public KafkaTemplate<String, String> kafkaTemplate(ProducerFactory<String, String> producerFactory) {
        log.info("[KafkaConfig] Creating KafkaTemplate bean");
        return new KafkaTemplate<>(producerFactory);
    }
}