# 🔐 CareNexus Auth Service

A standalone microservice for user authentication, JWT token management, and identity validation in the CareNexus healthcare platform.

**Status**: Phase 7 - Stage 3 Complete ✅
**Technology**: Spring Boot 3.2.0 + MySQL + Kafka + JWT

---

## 📋 What is the Auth Service?

The Auth Service is a dedicated microservice extracted from the monolithic Nexus Direct backend. It handles:

- **User Registration**: Create accounts with role selection (DOCTOR/PATIENT)
- **User Login**: Issue JWT access tokens (24 hours) and refresh tokens (7 days)
- **Token Management**: Validate, refresh, and revoke JWT tokens
- **Password Security**: BCrypt hashing with 10 salt rounds
- **Event Publishing**: Publish auth events to Kafka event bus for other services
- **Multi-tenancy**: Isolate user data by email address

---

## 🏗️ Architecture

```
Auth Service (8082)
├── API Layer
│   ├── /api/auth/register   - Create new user
│   ├── /api/auth/login      - User login (get JWT)
│   ├── /api/auth/refresh    - Refresh JWT token
│   ├── /api/auth/logout     - User logout
│   ├── /api/auth/validate   - Validate JWT token
│   └── /api/auth/me         - Get current user info
│
├── Service Layer
│   ├── AuthService          - Core auth business logic
│   ├── JwtService           - JWT generation & validation
│   ├── UserService          - User management
│   └── EventPublisher       - Kafka event publishing
│
├── Repository Layer
│   ├── UserRepository       - User persistence
│   └── RefreshTokenRepository - Refresh token storage
│
├── Security Layer
│   ├── JwtAuthenticationFilter - JWT validation filter
│   ├── SecurityConfig       - Spring Security configuration
│   └── PasswordConfig       - BCrypt password encoder
│
└── Database
    └── carenexus_auth (MySQL)
        ├── users table
        └── refresh_tokens table
```

---

## 🛠️ Stack & Dependencies

### Core Framework
- **Spring Boot 3.2.0**: Java framework for building microservices
- **Spring Web**: REST API support
- **Spring Security**: Authentication & authorization

### Database & Persistence
- **Spring Data JPA**: ORM framework
- **MySQL Connector 8.0.33**: Database driver
- **Hibernate**: JPA implementation

### Authentication & Security
- **JJWT 0.12.3**: JWT library for token generation/validation
  - `jjwt-api`: JWT API
  - `jjwt-impl`: Implementation
  - `jjwt-jackson`: JSON serialization
- **Spring Security**: Password encoding & validation
- **BCrypt**: One-way password hashing (10 rounds)

### Event-Driven Architecture
- **Spring Kafka**: Publish auth events to message bus
- **Kafka Bootstrap**: localhost:9092
- **Topics**: user.registered, user.loggedIn, user.loggedOut, token.refreshed

### Caching (Foundation for future use)
- **Spring Data Redis**: Cache layer
- **Redis**: In-memory data store (localhost:6379)

### Code Generation & Utilities
- **Lombok**: Reduce boilerplate (getters, setters, constructors)
- **Spring Validation**: Input validation

### Observability
- **Spring Boot Actuator**: Health checks, metrics, info endpoints
- **Health endpoints**: /api/actuator/health/liveness, readiness

---

## 📦 Project Structure

```
auth-service/
├── pom.xml                  # Maven dependencies & build config
├── Dockerfile              # Docker image definition
├── .env                    # Environment variables
├── README.md               # This file
│
└── src/
    ├── main/
    │   ├── java/com/carenexus/auth/
    │   │   ├── AuthApplication.java           # Main Spring Boot class
    │   │   ├── controller/                     # REST API endpoints
    │   │   ├── service/                        # Business logic
    │   │   ├── repository/                     # Database access
    │   │   ├── model/                          # Entity models (User, RefreshToken)
    │   │   ├── dto/                            # Data Transfer Objects
    │   │   ├── security/                       # JWT & Security config
    │   │   ├── exception/                      # Custom exceptions
    │   │   └── config/                         # Bean configurations
    │   │
    │   └── resources/
    │       ├── application.yml                 # Spring Boot configuration
    │       └── application-dev.yml             # Development profile
    │
    └── test/
        └── java/com/carenexus/auth/           # Unit tests (coming soon)
```

---

## 🚀 Quick Start

### Prerequisites
- Java 21 JDK
- Maven 3.8+
- MySQL Server (running on port 3307)
- Kafka (running on port 9092)
- Redis (running on port 6379) - optional

### 1. Build the Service

```bash
cd /Users/cosy/Documents/CareNexus/auth-service

# Build with Maven
mvn clean install -DskipTests

# Or build Docker image
docker build -t carenexus-auth-service:latest .
```

### 2. Run with Maven

```bash
# Using Maven
mvn spring-boot:run

# Or run the JAR directly
java -jar target/auth-service-1.0.0.jar
```

### 3. Run with Docker

```bash
# Build image
docker build -t carenexus-auth-service:latest .

# Run container
docker run -p 8082:8082 \
  -e SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3307/carenexus_auth \
  -e SPRING_DATASOURCE_USERNAME=root \
  -e SPRING_DATASOURCE_PASSWORD=root \
  -e SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092 \
  -e JWT_SECRET=your-secret-key \
  carenexus-auth-service:latest
```

---

## 🔌 API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "DOCTOR"
}

Response (201):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "DOCTOR"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response (200):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Validate Token
```http
GET /api/auth/validate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response (200):
{
  "valid": true,
  "userId": 1,
  "email": "john@example.com"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response (200):
{
  "id": 1,
  "email": "john@example.com",
  "fullName": "John Doe",
  "role": "DOCTOR"
}
```

---

## 📨 Kafka Events Published

The Auth Service publishes the following events to the Kafka event bus:

### 1. user.registered
```json
{
  "userId": 1,
  "email": "john@example.com",
  "fullName": "John Doe",
  "role": "DOCTOR",
  "timestamp": "2025-11-29T12:34:56Z"
}
```
**Consumed by**: Nexus Direct Service (create doctor/patient record)

### 2. user.loggedIn
```json
{
  "userId": 1,
  "email": "john@example.com",
  "loginTime": "2025-11-29T12:34:56Z",
  "ipAddress": "192.168.1.1"
}
```
**Consumed by**: Notification Service, Analytics Service

### 3. user.loggedOut
```json
{
  "userId": 1,
  "email": "john@example.com",
  "logoutTime": "2025-11-29T12:34:56Z"
}
```

### 4. token.refreshed
```json
{
  "userId": 1,
  "email": "john@example.com",
  "refreshTime": "2025-11-29T12:34:56Z"
}
```

---

## 🔐 Security Features

### JWT Token Format
```
Header: { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub": "user@example.com",
  "userId": 1,
  "role": "DOCTOR",
  "iat": 1701262496,
  "exp": 1701348896
}
Signature: HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

### Token Expiration
- **Access Token**: 24 hours (86400 seconds)
- **Refresh Token**: 7 days (604800 seconds)
- **Max Refresh**: 7 days (then user must login again)

### Password Hashing
- **Algorithm**: BCrypt
- **Salt Rounds**: 10 (security/performance balance)
- **Time to hash**: ~100ms per password

### Multi-tenancy
- Users are isolated by email address
- Database queries include `WHERE userEmail = :userEmail`
- Users cannot access other users' data

---

## 🧪 Testing

### Manual Testing with curl

```bash
# 1. Register
curl -X POST http://localhost:8082/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName":"Test User",
    "email":"test@test.com",
    "password":"password123",
    "role":"DOCTOR"
  }'

# 2. Login
curl -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"password123"
  }'

# 3. Get current user (copy token from above)
curl -X GET http://localhost:8082/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. Validate token
curl -X GET http://localhost:8082/api/auth/validate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Health Check
```bash
# Check if service is running
curl http://localhost:8082/api/actuator/health/liveness

# Get service info
curl http://localhost:8082/api/actuator/info

# Get metrics
curl http://localhost:8082/api/actuator/metrics
```

---

## 📊 Configuration

All configuration is in `src/main/resources/application.yml` and can be overridden via `.env` file or environment variables.

Key configurations:
- **JWT Secret**: Must be changed in production (use 32+ character random string)
- **Database URL**: Points to `carenexus_auth` database
- **Kafka Bootstrap**: Connects to Kafka at `localhost:9092`
- **Redis Host**: Optional caching layer at `localhost:6379`

---

## 🐛 Troubleshooting

### Port 8082 Already in Use
```bash
# Find what's using port 8082
lsof -i :8082

# Kill the process
kill -9 <PID>

# Or change port in application.yml: server.port=8083
```

### Database Connection Error
```bash
# Check MySQL is running
docker compose ps

# Verify credentials in .env or application.yml
# Default: root/root on localhost:3307
```

### Kafka Connection Error
```bash
# Check Kafka is running
docker compose ps

# Verify Kafka is on localhost:9092
# Check if zookeeper is also running (depends on)
```

---

## 📚 Next Steps (Stage 4+)

1. **Stage 4**: Extract existing auth code from Nexus Direct service
   - Copy 15 auth-related files to auth-service
   - Update package references

2. **Stage 5**: Setup inter-service communication
   - Create RestTemplate for Direct Service to call Auth Service
   - Update JwtAuthenticationFilter to validate with Auth Service

3. **Stage 6**: Configure Kafka event bus
   - Add event publisher in Auth Service
   - Add event listeners in Direct Service

4. **Stage 7**: Docker multi-service orchestration
   - Update docker-compose.yml with auth-service

---

## 🤝 Contributing

This is part of the CareNexus healthcare platform. When making changes:

1. Keep code in `com.carenexus.auth.*` package structure
2. Follow Spring Boot conventions
3. Add proper exception handling
4. Document Kafka events clearly
5. Test with the Direct Service integration

---

## 📝 License

Part of CareNexus Healthcare Platform

---

## 🔗 Related Services

- **Nexus Direct Service**: `/Users/cosy/Documents/CareNexus/direct`
- **Frontend**: `/Users/cosy/Documents/CareNexus-Frontend/frontend`
- **Documentation**: `PHASE_7_MICROSERVICE_EXTRACTION.md`

---

**Auth Service** | **Port**: 8082 | **Database**: carenexus_auth | **Status**: Ready for Stage 4