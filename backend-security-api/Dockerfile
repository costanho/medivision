# ====================================================================
# CareNexus Auth Service - Multi-stage Docker Build
# ====================================================================
# This Dockerfile builds the Auth Service microservice with Maven
# and packages it as a standalone Docker image.
#
# Build: docker build -t carenexus-auth-service:latest .
# Run:   docker run -p 8082:8082 carenexus-auth-service:latest
# ====================================================================

# Stage 1: Build stage using Maven and JDK 17
# ====================================================================
FROM maven:3.9-eclipse-temurin-17 AS builder

# Set working directory
WORKDIR /build

# Copy the entire auth-service project
COPY . .

# Build the application
# - Skip tests for faster builds (tests run separately in CI/CD)
# - Clean install ensures fresh build
RUN mvn clean package -DskipTests

# ====================================================================
# Stage 2: Runtime stage using JDK 17 (lightweight)
# ====================================================================
FROM eclipse-temurin:17-jre

# Install dumb-init to handle signals properly (using apt for non-alpine)
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the built JAR from builder stage
# Maven builds to target/auth-service-1.0.0.jar
COPY --from=builder /build/target/auth-service-1.0.0.jar /app/auth-service.jar

# Create non-root user for security (good practice)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

# Health check to help Docker/Kubernetes detect if service is healthy
# Checks the actuator health endpoint every 30 seconds
# Allows 3 failures before marking as unhealthy
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8082/api/actuator/health/liveness || exit 1

# Expose the port the service listens on
EXPOSE 8082

# Health check to help Docker/Kubernetes detect if service is healthy
# Checks the actuator health endpoint every 30 seconds
# Allows 3 failures before marking as unhealthy
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8082/api/actuator/health/liveness || exit 1

# Use dumb-init to properly handle signals and process management
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run the application
# Java flags explained:
# -Xms128m    : Initial heap size (128MB)
# -Xmx512m    : Maximum heap size (512MB)
# -XX:+UseG1GC : Use G1 garbage collector (better for containers)
# -XX:+UnlockExperimentalVMOptions : Enable experimental features
# -XX:G1NewSizePercent=30 : G1 new generation size percentage
# -XX:G1MaxNewSizePercent=40 : G1 max new generation size percentage
# -XX:InitiatingHeapOccupancyPercent=35 : Trigger GC earlier to avoid long pauses
# -XX:+ParallelRefProcEnabled : Parallel reference processing
# -XX:+AlwaysPreTouch : Pre-allocate memory (helps with latency)
# Spring Boot automatically picks up SPRING_* environment variables
# SPRING_PROFILES_ACTIVE=docker will load application-docker.yml
CMD ["java", \
     "-Xms128m", \
     "-Xmx512m", \
     "-XX:+UseG1GC", \
     "-XX:+UnlockExperimentalVMOptions", \
     "-XX:G1NewSizePercent=30", \
     "-XX:G1MaxNewSizePercent=40", \
     "-XX:InitiatingHeapOccupancyPercent=35", \
     "-XX:+ParallelRefProcEnabled", \
     "-XX:+AlwaysPreTouch", \
     "-jar", \
     "auth-service.jar"]

# ====================================================================
# Build Information
# ====================================================================
# Image Size: ~400-450MB (with JDK 21)
# Build Time: ~2-3 minutes (Maven build from scratch)
# Multi-stage build reduces final image size by ~200MB
#
# Environment Variables (pass at runtime):
# -e SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/carenexus_auth
# -e SPRING_DATASOURCE_USERNAME=root
# -e SPRING_DATASOURCE_PASSWORD=root
# -e SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092
# -e JWT_SECRET=your-secret-key-here
# ====================================================================