# Quickstart & Verification Guide: Dual-Platform Identity Bridge

**Feature**: `specs/089-identity-bridge-session-interop`  
**Jira Issue**: [SIAA-89](https://the-three-devsketeers.atlassian.net/browse/SIAA-89)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  

---

## 1. Running Automated Verification Suite

Execute the Maven test suite using Docker:

```powershell
docker run --rm -v "${PWD}/swift-backend:/workspace" -w /workspace maven:3.9.9-eclipse-temurin-21-alpine mvn test "-Dspring.profiles.active=test"
```

---

## 2. Walkthrough & Manual Verification Scenarios

### Scenario 1: User Login via REST (`POST /api/v1/auth/login`)

Authenticate with demo staff credentials:

```bash
curl -i -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cashier@swift.local",
    "password": "demo",
    "selectedRole": "staff",
    "rememberTerminal": false
  }'
```

**Expected Response**:
- HTTP 200 OK
- Headers: `Set-Cookie: swift-session-role=staff; Path=/; HttpOnly` and `Set-Cookie: swift-user-name=Shop Floor Cashier; Path=/`
- Body:
  ```json
  {
    "success": true,
    "redirectTo": "/staff/pos",
    "session": {
      "id": "00000000-0000-0000-0000-000000000002",
      "email": "cashier@swift.local",
      "name": "Shop Floor Cashier",
      "role": "staff",
      "expiresAt": 1730000000
    }
  }
  ```

---

### Scenario 2: Floor Terminal Kiosk 4-digit PIN Authentication (`POST /api/v1/staff/kiosk-auth`)

Submit cashier PIN at the shared counter:

```bash
curl -i -X POST http://localhost:8080/api/v1/staff/kiosk-auth \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "00000000-0000-0000-0000-000000000002",
    "pin": "1234"
  }'
```

**Expected Response**:
- HTTP 200 OK
- Headers: `Set-Cookie: swift-staff-session=00000000-0000-0000-0000-000000000002; Path=/; HttpOnly`
- Body:
  ```json
  {
    "success": true,
    "profile": {
      "id": "00000000-0000-0000-0000-000000000002",
      "fullName": "Mike Morales",
      "email": "cashier@swift.local",
      "role": "cashier",
      "permissions": {
        "can_discount": true,
        "can_override_discount": false,
        "can_void_transaction": false,
        "can_adjust_stock": false,
        "can_access_admin": false,
        "can_view_reports": false
      },
      "isActive": true
    }
  }
  ```

---

### Scenario 3: Manager Elevation (`POST /api/v1/staff/admin-elevation`)

Request manager discount override authorization:

```bash
curl -i -X POST http://localhost:8080/api/v1/staff/admin-elevation \
  -H "Content-Type: application/json" \
  -d '{
    "pinOrPassword": "admin"
  }'
```

**Expected Response**:
- HTTP 200 OK
- Headers: `Set-Cookie: swift_admin_elevated=true; Max-Age=3600; Path=/; HttpOnly`
- Body:
  ```json
  {
    "success": true,
    "elevated": true,
    "expiresAt": 1730003600
  }
  ```

---

### Scenario 4: Protected Route Access & Rejection

1. **Unauthenticated access rejected**:
   ```bash
   curl -i -X GET http://localhost:8080/api/v1/admin/users
   ```
   **Expected**: HTTP 401 Unauthorized (`{"success":false,"error":"Full authentication is required to access this resource"}`)

2. **Access with Dual Session Cookies permitted**:
   ```bash
   curl -i -X GET http://localhost:8080/api/v1/catalog/products \
     -H "Cookie: swift-session-role=staff; swift-staff-session=00000000-0000-0000-0000-000000000002"
   ```
   **Expected**: HTTP 200 OK.
