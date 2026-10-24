# Quickstart & Verification Guide: Baseline Foundation & Strangler Proxy

**Feature**: `088-modular-monolith-strangler-proxy`  
**Jira Ticket**: [SIAA-88](https://the-three-devsketeers.atlassian.net/browse/SIAA-88)  

---

## 1. Prerequisites

- **Docker & Docker Compose**: Docker 20.10+ (Docker 29+ installed)
- **Node.js**: Node 20+ (for Next.js frontend dev server)
- *(Optional)* Java 21 LTS + Maven 3.9+ (if running Spring Boot directly on host)

---

## 2. Running with Docker Compose (Recommended)

To run the entire strangler architecture locally:

```bash
# 1. Build and start the Spring Boot backend and NGINX Strangler Gateway
docker compose up --build -d

# 2. Check running services
docker compose ps
```

The services will be mapped to:
- **Strangler Gateway (NGINX)**: `http://localhost:80`
- **Spring Boot Backend**: `http://localhost:8080`
- **Next.js Frontend (Host)**: `http://localhost:3000`

---

## 3. Verification Scenarios

### Scenario A: Actuator Health Probe

Request the Actuator health endpoint directly or through the gateway:

```bash
# Direct to Spring Boot
curl -i http://localhost:8080/actuator/health

# Or via Strangler Gateway
curl -i http://localhost/actuator/health
```

**Expected Response**:
```json
HTTP/1.1 200 OK
Content-Type: application/vnd.spring-boot.actuator.v3+json

{
  "status": "UP"
}
```

---

### Scenario B: Strangler Gateway Fallback Routing

When an endpoint targeted for Spring Boot (e.g. `/api/v1/motomatcher/models`) is called while Spring Boot is offline or unhealthy:

```bash
# Stop Spring Boot container
docker compose stop swift-backend

# Make request via gateway
curl -i http://localhost/api/v1/motomatcher/models
```

**Expected Behavior**:
- Gateway intercepts the connection error or 502/503 from Spring Boot.
- Gateway reroutes within milliseconds to Next.js (`http://127.0.0.1:3000`).
- Response contains header: `X-Swift-Fallback: true`.

---

### Scenario C: Maven Build & Unit Tests (Containerized or Local)

```bash
# Using Maven wrapper (if Java 21 installed on host)
cd swift-backend
./mvnw clean test

# Or via Docker build
docker build -t swift-backend:latest ./swift-backend
```
