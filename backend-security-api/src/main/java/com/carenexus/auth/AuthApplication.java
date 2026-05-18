package com.carenexus.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.kafka.annotation.EnableKafka;

/**
 * ====================================================================
 * CareNexus Auth Service - Main Application Class
 * ====================================================================
 *
 * This is the entry point for the CareNexus Auth Service microservice.
 *
 * Responsibilities:
 * - Handle user authentication and authorization
 * - Manage JWT token generation and validation
 * - Manage refresh tokens
 * - Publish auth events to Kafka event bus
 * - Provide user credential validation
 *
 * Dependencies:
 * - MySQL (carenexus_auth database)
 * - Kafka (for publishing auth events)
 * - Redis (for optional token caching)
 *
 * Port: 8082
 * API Base: http://localhost:8082/api
 *
 * ====================================================================
 */
@SpringBootApplication
@EnableKafka
@EnableJpaAuditing
public class AuthApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthApplication.class, args);

        System.out.println("\n");
        System.out.println("╔════════════════════════════════════════════════════════════════╗");
        System.out.println("║                                                                ║");
        System.out.println("║         🔐 CareNexus Auth Service Started Successfully 🔐       ║");
        System.out.println("║                                                                ║");
        System.out.println("║  Service Port: 8082                                            ║");
        System.out.println("║  API Endpoint: http://localhost:8082/api                       ║");
        System.out.println("║  Database: carenexus_auth (MySQL)                              ║");
        System.out.println("║  Event Bus: Kafka (localhost:9092)                             ║");
        System.out.println("║                                                                ║");
        System.out.println("║  Key Endpoints:                                                ║");
        System.out.println("║  - POST   /api/auth/register    - Create new user             ║");
        System.out.println("║  - POST   /api/auth/login       - User login                  ║");
        System.out.println("║  - POST   /api/auth/refresh     - Refresh JWT token           ║");
        System.out.println("║  - POST   /api/auth/logout      - User logout                 ║");
        System.out.println("║  - GET    /api/auth/validate    - Validate JWT token          ║");
        System.out.println("║  - GET    /api/auth/me          - Get current user info       ║");
        System.out.println("║                                                                ║");
        System.out.println("║  Kafka Topics Published:                                       ║");
        System.out.println("║  - user.registered     - Published when user creates account  ║");
        System.out.println("║  - user.loggedIn       - Published when user logs in          ║");
        System.out.println("║  - user.loggedOut      - Published when user logs out         ║");
        System.out.println("║  - token.refreshed     - Published when token is refreshed    ║");
        System.out.println("║                                                                ║");
        System.out.println("╚════════════════════════════════════════════════════════════════╝");
        System.out.println("\n");
    }
}