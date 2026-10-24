# Data Model & Entity Specifications: Dual-Platform Identity Bridge

**Feature**: `specs/089-identity-bridge-session-interop`  
**Jira Issue**: [SIAA-89](https://the-three-devsketeers.atlassian.net/browse/SIAA-89)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved  

---

## 1. Domain Entities & Database Mapping

### 1.1 `StaffProfile` (Read-Only Mapping against Supabase `public.profiles` / `staff_profiles`)

In the existing Supabase PostgreSQL schema, staff accounts and permissions are stored in `public.profiles`. The JPA entity is configured for strict validation (`ddl-auto: validate`).

```java
package com.swift.modules.auth.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "profiles", schema = "public")
public class StaffProfile {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "role", nullable = false)
    private String role; // "admin" | "staff" | "manager" | "cashier" | "mechanic"

    @Column(name = "pin_code")
    private String pinCode; // BCrypt hash of 4-digit PIN

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "permissions", columnDefinition = "jsonb")
    private StaffPermissions permissions;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    // Getters, Setters, Constructors
}
```

---

### 1.2 `StaffPermissions` (JSONB Value Object)

Matches the exact TypeScript `StaffPermissions` structure in `lib/staff/actions.ts` & `specs/086-kiosk-session-granular-permissions`:

```java
package com.swift.modules.auth.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;

public class StaffPermissions implements Serializable {

    @JsonProperty("can_discount")
    private boolean canDiscount = false;

    @JsonProperty("can_override_discount")
    private boolean canOverrideDiscount = false;

    @JsonProperty("can_void_transaction")
    private boolean canVoidTransaction = false;

    @JsonProperty("can_adjust_stock")
    private boolean canAdjustStock = false;

    @JsonProperty("can_access_admin")
    private boolean canAccessAdmin = false;

    @JsonProperty("can_view_reports")
    private boolean canViewReports = false;

    // Getters, Setters, Constructors, Builders
}
```

---

### 1.3 `SecurityAuditLog` (Mapping against `public.security_audit_logs`)

Records forensic logs for administrative elevations and authentication failures matching `logSecurityEventAction`.

```java
package com.swift.modules.auth.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "security_audit_logs", schema = "public")
public class SecurityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "severity", nullable = false)
    private String severity; // "info" | "warning" | "security_alert"

    @Column(name = "terminal_ip")
    private String terminalIp;

    @Column(name = "user_email")
    private String userEmail;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    // Getters, Setters, Constructors
}
```

---

## 2. Security Principals & Authentication Tokens

### 2.1 `SwiftUserPrincipal`

Implements Spring Security `UserDetails` & `Principal`, encapsulating identity from both Supabase JWTs and dual session cookies.

```java
package com.swift.modules.auth.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class SwiftUserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String name;
    private final String role; // "admin" or "staff"
    private final AuthSource source; // JWT, COOKIE, KIOSK_PIN, ELEVATION
    private final boolean elevated;
    private final Collection<? extends GrantedAuthority> authorities;

    public enum AuthSource {
        SUPABASE_JWT,
        SESSION_COOKIE,
        KIOSK_PIN,
        DEMO_BYPASS
    }

    public SwiftUserPrincipal(UUID id, String email, String name, String role, AuthSource source, boolean elevated) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.role = role;
        this.source = source;
        this.elevated = elevated;
        this.authorities = List.of(
            new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()),
            elevated ? new SimpleGrantedAuthority("ROLE_ELEVATED") : null
        ).stream().filter(java.util.Objects::nonNull).toList();
    }

    // Standard UserDetails methods
    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public String getRole() { return role; }
    public AuthSource getSource() { return source; }
    public boolean isElevated() { return elevated; }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return null; }
    @Override public String getUsername() { return email != null ? email : id.toString(); }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
```

---

## 3. Data Transfer Objects (DTOs) & Contracts

### 3.1 Login Flow (`/api/v1/auth/login`)

```java
// Request
public record LoginRequest(
    @NotBlank(message = "Username or email is required")
    String email,
    String password,
    @NotNull
    String selectedRole, // "admin" | "staff"
    boolean rememberTerminal
) {}

// Response
public record AuthResponse(
    boolean success,
    String redirectTo,
    UserSessionDto session,
    String error,
    String code
) {
    public static AuthResponse ok(String redirectTo, UserSessionDto session) {
        return new AuthResponse(true, redirectTo, session, null, null);
    }
    public static AuthResponse failure(String error, String code) {
        return new AuthResponse(false, null, null, error, code);
    }
}

public record UserSessionDto(
    String id,
    String email,
    String name,
    String role,
    String terminalId,
    long expiresAt
) {}
```

---

### 3.2 Staff Kiosk Flow (`/api/v1/staff/kiosk-auth`)

```java
// Request
public record KioskAuthRequest(
    @NotBlank(message = "Profile ID is required")
    String profileId,
    @Pattern(regexp = "^\\d{4}$", message = "PIN must be exactly 4 numeric digits")
    String pin
) {}

// Response
public record KioskAuthResponse(
    boolean success,
    StaffProfileDto profile,
    String error,
    String code
) {
    public static KioskAuthResponse ok(StaffProfileDto profile) {
        return new KioskAuthResponse(true, profile, null, null);
    }
    public static KioskAuthResponse failure(String error, String code) {
        return new KioskAuthResponse(false, null, error, code);
    }
}

public record StaffProfileDto(
    String id,
    String fullName,
    String email,
    String role,
    StaffPermissions permissions,
    boolean isActive
) {}
```

---

### 3.3 Admin Elevation Flow (`/api/v1/staff/admin-elevation`)

```java
// Request
public record ElevationRequest(
    String pinOrPassword
) {}

// Response
public record ElevationResponse(
    boolean success,
    boolean elevated,
    Long expiresAt,
    String error,
    String code
) {
    public static ElevationResponse ok(long expiresAt) {
        return new ElevationResponse(true, true, expiresAt, null, null);
    }
    public static ElevationResponse failure(String error, String code) {
        return new ElevationResponse(false, false, null, error, code);
    }
}
```
