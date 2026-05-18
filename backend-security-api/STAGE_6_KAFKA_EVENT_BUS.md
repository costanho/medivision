# 📨 Stage 6: Configure Event Bus Foundation (Kafka)

**Status**: Complete ✅
**Completion Date**: 2025-11-29
**Architecture**: Event-driven asynchronous communication

---

## 🎯 Overview

Stage 6 implements Kafka as the event bus for asynchronous communication between microservices. Auth Service publishes authentication events, which are consumed by Direct Service and other microservices.

This enables:
- **Loose coupling**: Services don't directly call each other for all interactions
- **Scalability**: New services can consume events without changing existing ones
- **Resilience**: Events persist even if consumer services are temporarily down
- **Audit trail**: All authentication events logged for security compliance

---

## 🏗️ Architecture

```
┌──────────────────────────────────────┐
│        Auth Service (8082)           │
├──────────────────────────────────────┤
│                                      │
│  AuthService.register()              │
│        ↓                              │
│  EventPublisher.publishUserRegistered()
│        ↓                              │
│  KafkaTemplate.send()                │
│        ↓                              │
│  [Event JSON sent to Kafka]          │
│                                      │
└──────────────────┬───────────────────┘
                   │
                   │ Kafka Broker (localhost:9092)
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│Topic 1:  │ │Topic 2:  │ │Topic 3:  │
│user.     │ │user.     │ │token.    │
│registered│ │loggedIn  │ │refreshed │
└──────────┘ └──────────┘ └──────────┘
    │
    ▼
┌──────────────────────────────────────┐
│   Direct Service Consumer Group       │
├──────────────────────────────────────┤
│                                      │
│  AuthEventListener                   │
│    ├── @KafkaListener(user.registered)
│    ├── @KafkaListener(user.loggedIn) │
│    ├── @KafkaListener(user.loggedOut)
│    └── @KafkaListener(token.refreshed)
│        ↓                              │
│  Process Event (create records)      │
│        ↓                              │
│  ack.acknowledge()  [Manual Commit]  │
│                                      │
└──────────────────────────────────────┘
```

---

## 📦 Components Created

### Auth Service (Event Publisher)

#### 1. Event Classes (4 files)
**Location**: `src/main/java/com/carenexus/auth/event/`

**UserRegisteredEvent.java**
```java
{
  "userId": 1,
  "email": "john@example.com",
  "fullName": "John Doe",
  "role": "ROLE_DOCTOR",
  "timestamp": "2025-11-29T12:34:56"
}
```
- Published when user registers
- Triggers creation of doctor/patient record in Direct Service

**UserLoggedInEvent.java**
```java
{
  "userId": 1,
  "email": "john@example.com",
  "timestamp": "2025-11-29T12:34:56",
  "ipAddress": "192.168.1.100"
}
```
- Published on successful login
- Used for activity logging and security monitoring

**UserLoggedOutEvent.java**
```java
{
  "userId": 1,
  "email": "john@example.com",
  "timestamp": "2025-11-29T12:34:56"
}
```
- Published when user logs out
- Triggers session cleanup

**TokenRefreshedEvent.java**
```java
{
  "userId": 1,
  "email": "john@example.com",
  "timestamp": "2025-11-29T12:34:56"
}
```
- Published when token is refreshed
- For audit and security tracking

#### 2. EventPublisher Service
**Location**: `src/main/java/com/carenexus/auth/event/EventPublisher.java`

Core service for publishing events to Kafka:

```java
@Service
@RequiredArgsConstructor
public class EventPublisher {
    private final KafkaTemplate<String, String> kafkaTemplate;

    public void publishUserRegistered(UserRegisteredEvent event) { ... }
    public void publishUserLoggedIn(UserLoggedInEvent event) { ... }
    public void publishUserLoggedOut(UserLoggedOutEvent event) { ... }
    public void publishTokenRefreshed(TokenRefreshedEvent event) { ... }
}
```

**Features**:
- JSON serialization using Jackson ObjectMapper
- Error handling with fallback logging
- Asynchronous publishing (non-blocking)
- Partition and offset logging

#### 3. Kafka Configuration
**Location**: `src/main/java/com/carenexus/auth/config/KafkaConfig.java`

Configures Kafka producer for Auth Service:

**Topics Created** (auto-created on startup):
- `user.registered` (3 partitions, 1 replica)
- `user.loggedIn` (3 partitions, 1 replica)
- `user.loggedOut` (3 partitions, 1 replica)
- `token.refreshed` (3 partitions, 1 replica)

**Producer Settings**:
- Acks: `all` (wait for all replicas)
- Retries: `3` (automatic retry on failure)
- Compression: `snappy` (reduce message size ~50%)
- Batch size: `16KB` (accumulate before sending)
- Buffer: `32MB` (total memory for pending batches)

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: StringSerializer
      value-serializer: StringSerializer
```

---

### Direct Service (Event Consumer)

#### 1. Kafka Consumer Configuration
**Location**: `src/main/java/com/carenexus/direct/config/KafkaConsumerConfig.java`

Configures Kafka consumer for Direct Service:

**Consumer Settings**:
- Group ID: `direct-service-group`
- Auto offset reset: `earliest` (start from beginning if new group)
- Max poll records: `500` (fetch up to 500 records per poll)
- Session timeout: `30s` (detect consumer failures)
- Acknowledgment: `MANUAL` (explicit commit after processing)
- Concurrency: `3` threads (parallel processing)

#### 2. Event Listener
**Location**: `src/main/java/com/carenexus/direct/event/AuthEventListener.java`

Consumes events from Kafka and processes them:

```java
@Service
public class AuthEventListener {

    @KafkaListener(topics = "user.registered", groupId = "direct-service-group")
    public void onUserRegistered(String eventJson, Acknowledgment ack) {
        // 1. Deserialize event
        UserRegisteredEvent event = objectMapper.readValue(eventJson, ...);

        // 2. Create Doctor/Patient record
        // TODO: Implement business logic

        // 3. Acknowledge (commit offset)
        ack.acknowledge();
    }

    @KafkaListener(topics = "user.loggedIn", groupId = "direct-service-group")
    public void onUserLoggedIn(String eventJson, Acknowledgment ack) {
        // Update last login timestamp, clear lockout, etc
    }

    @KafkaListener(topics = "user.loggedOut", groupId = "direct-service-group")
    public void onUserLoggedOut(String eventJson, Acknowledgment ack) {
        // Clear sessions, invalidate temporary data
    }

    @KafkaListener(topics = "token.refreshed", groupId = "direct-service-group")
    public void onTokenRefreshed(String eventJson, Acknowledgment ack) {
        // Log for audit trail
    }
}
```

---

## 🔄 Event Flow Examples

### Example 1: User Registration Flow

```
1. Client sends POST /api/auth/register
        ↓
2. AuthService.register(user)
   - Save user to database
   - Encode password
   - Generate JWT tokens
        ↓
3. EventPublisher.publishUserRegistered(event)
   - Create UserRegisteredEvent object
   - Serialize to JSON
        ↓
4. KafkaTemplate.send("user.registered", eventJson)
   - Send to Kafka broker
   - Wait for acknowledgment
        ↓
5. Response: Return AuthResponse with tokens
   (Event publishing is async, doesn't block response)

[Meanwhile, in Direct Service...]

6. AuthEventListener receives event from Kafka
        ↓
7. Deserialize: eventJson → UserRegisteredEvent
        ↓
8. Check role:
   - If ROLE_DOCTOR: Create Doctor record
   - If ROLE_PATIENT: Create Patient record
        ↓
9. ack.acknowledge()
   - Commit offset to Kafka
   - Message won't be reprocessed
```

### Example 2: User Login with Activity Logging

```
1. Client sends POST /api/auth/login
        ↓
2. AuthService.login(email, password)
   - Validate credentials
   - Generate tokens
        ↓
3. EventPublisher.publishUserLoggedIn(event)
   - Include optional: IP address, user agent, etc
        ↓
4. Kafka receives event in topic "user.loggedIn"

[Direct Service processes...]

5. AuthEventListener.onUserLoggedIn()
   - Update user's last_login_time
   - Clear any account lockout
   - Update user status
        ↓
6. ack.acknowledge()
```

---

## ⚙️ Configuration

### Auth Service (application.yml)

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.StringSerializer
      acks: all
      retries: 3
      batch-size: 16384
      compression-type: snappy
```

### Direct Service (application.yml)

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: direct-service-group
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      auto-offset-reset: earliest
      max-poll-records: 500
```

### Environment Variables

```bash
# Development
SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Docker
SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Kubernetes
SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka.kafka.svc.cluster.local:9092
```

---

## 🧪 Testing Kafka Events

### 1. Check Kafka is Running

```bash
# Using docker
docker ps | grep kafka

# Or check locally
lsof -i :9092
```

### 2. Check Topics Exist

```bash
# Connect to Kafka container or local Kafka
kafka-topics.sh --bootstrap-server localhost:9092 --list

# Should show:
# user.registered
# user.loggedIn
# user.loggedOut
# token.refreshed
```

### 3. Monitor Events in Real-Time

```bash
# Terminal 1: Listen to user.registered events
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic user.registered \
  --from-beginning

# Terminal 2: Register a new user
curl -X POST http://localhost:8082/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName":"Test User",
    "email":"test@test.com",
    "password":"password123",
    "role":"DOCTOR"
  }'

# Terminal 1 should show:
# {
#   "userId": 1,
#   "email": "test@test.com",
#   "fullName": "Test User",
#   "role": "ROLE_DOCTOR",
#   "timestamp": "2025-11-29T12:34:56.789"
# }
```

### 4. Check Consumer Group Status

```bash
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group direct-service-group \
  --describe

# Shows:
# - Consumer members
# - Lag (unprocessed messages)
# - Current offset
```

---

## 🔐 Error Handling & Retry Logic

### Processing Failures

When an event listener encounters an error:

1. **Exception is caught and logged**
2. **Offset is NOT committed** (manual ack not called)
3. **Message stays in Kafka** (due to offset not advancing)
4. **Message is reprocessed** after `session.timeout.ms` (30 seconds)

### Dead Letter Queue Pattern (Future Enhancement)

```java
// For persistent failures, send to DLQ
@KafkaListener(topics = "user.registered")
public void onUserRegistered(@Payload String eventJson, Acknowledgment ack) {
    try {
        // Process event
        ack.acknowledge();
    } catch (Exception e) {
        log.error("Failed to process, sending to DLQ", e);
        kafkaTemplate.send("user.registered.dlq", eventJson);
        ack.acknowledge();  // Acknowledge to remove from main topic
    }
}
```

---

## 📊 File Summary

### Auth Service Files Created (8)
1. `event/UserRegisteredEvent.java` - Event class
2. `event/UserLoggedInEvent.java` - Event class
3. `event/UserLoggedOutEvent.java` - Event class
4. `event/TokenRefreshedEvent.java` - Event class
5. `event/EventPublisher.java` - Event publisher service
6. `config/KafkaConfig.java` - Kafka producer configuration

### Direct Service Files Created (2)
1. `config/KafkaConsumerConfig.java` - Kafka consumer configuration
2. `event/AuthEventListener.java` - Event listener service

---

## 🚀 Integration with Previous Stages

**Stage 5** (Inter-Service Communication):
- Synchronous: Direct Service calls Auth Service via REST
- Used for: Token validation, user info fetching

**Stage 6** (Event Bus):
- Asynchronous: Auth Service publishes events to Kafka
- Used for: Creating records, logging activities, triggering workflows

**Together they create a hybrid communication pattern**:
- REST for request-response (sync)
- Kafka for notifications (async)

---

## 📋 Checklist for Stage 6 Completion

- [x] Created 4 event classes (UserRegistered, UserLoggedIn, UserLoggedOut, TokenRefreshed)
- [x] Created EventPublisher service in Auth Service
- [x] Created KafkaConfig with topic definitions
- [x] Created KafkaConsumerConfig in Direct Service
- [x] Created AuthEventListener with 4 @KafkaListener methods
- [x] Added comprehensive documentation
- [ ] (Stage 7) Integrate into docker-compose.yml
- [ ] (Stage 8) Test end-to-end Kafka flow

---

## 🔗 Related Files

**Auth Service**:
- `src/main/java/com/carenexus/auth/event/` - Event classes
- `src/main/java/com/carenexus/auth/config/KafkaConfig.java` - Kafka config
- `src/main/resources/application.yml` - Configuration

**Direct Service**:
- `src/main/java/com/carenexus/direct/event/AuthEventListener.java` - Event listener
- `src/main/java/com/carenexus/direct/config/KafkaConsumerConfig.java` - Consumer config

---

## 🎓 What's Next

### Stage 7: Docker Multi-Service Setup
- Update docker-compose.yml
- Add Kafka broker container
- Add Zookeeper container (Kafka dependency)
- Configure all services to use Kafka

### Stage 8: End-to-End Testing
- Test user registration (triggering Kafka event)
- Verify doctor/patient record creation
- Check consumer group status
- Monitor Kafka topics

### Stage 9: Documentation & Deployment
- Create deployment guide
- Document all Kafka topics
- Create monitoring dashboard
- Push to GitHub

---

## 📞 Troubleshooting

### Kafka broker not responding

**Symptom**: "Cannot connect to Kafka broker"

**Solution**:
1. Verify Kafka is running: `docker ps | grep kafka`
2. Check bootstrap servers config: `http://localhost:9092` (dev) or `kafka:9092` (docker)
3. Verify network connectivity: `telnet localhost 9092`

### Events not being published

**Symptom**: EventPublisher logs success but events don't appear in topic

**Solution**:
1. Check Kafka logs: `docker logs <kafka-container>`
2. Verify producer configuration in KafkaConfig
3. Check ObjectMapper serialization
4. Verify EventPublisher is being injected (dependency injection)

### Consumer lag increasing

**Symptom**: Consumer group shows lag > 0, events not being processed

**Solution**:
1. Check listener method for exceptions
2. Verify @KafkaListener annotations are present
3. Check if acknowledgment is being called
4. Monitor listener thread count (concurrency = 3)

### Topics not auto-creating

**Symptom**: Topics don't exist when checking `kafka-topics.sh`

**Solution**:
1. Verify KafkaAdmin bean is created: `KafkaAdmin kafkaAdmin()`
2. Verify NewTopic beans are defined
3. Check Kafka broker configuration (auto.create.topics.enable)
4. Manually create topics if needed: `kafka-topics.sh --create --topic user.registered ...`

---

**Status**: Ready for Stage 7 (Docker Multi-Service Setup) ✅