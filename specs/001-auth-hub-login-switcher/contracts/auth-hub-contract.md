# Interface & Action Contracts: Role-Based Authentication Hub

**Feature**: Role-Based Authentication Hub & Login Switcher ([SIAA-8](https://the-three-devsketeers.atlassian.net/browse/SIAA-8))
**Status**: Completed

## 1. Authentication Action Contract (`authenticateUserAction`)

### Server Action Signature
```typescript
export async function authenticateUserAction(
  credentials: LoginCredentials
): Promise<AuthResult>;
```

### Request Payload
```json
{
  "email": "admin@swift.local",
  "password": "••••••••",
  "selectedRole": "admin",
  "rememberTerminal": true
}
```

### Success Response (`200 OK` Equivalent)
```json
{
  "success": true,
  "redirectTo": "/admin",
  "session": {
    "id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "email": "admin@swift.local",
    "name": "Shop Administrator",
    "role": "admin",
    "expiresAt": 1791234567
  }
}
```

### Failure Response
```json
{
  "success": false,
  "error": "Invalid email or password combination. Please check your credentials.",
  "code": "INVALID_CREDENTIALS"
}
```

---

## 2. UI Component Contracts

### `RoleTabSwitcher` Component
```typescript
export interface RoleTabSwitcherProps {
  selectedRole: PortalRole;
  onRoleChange: (role: PortalRole) => void;
  disabled?: boolean;
}
```

### `DemoCredentialsBox` Component
```typescript
export interface DemoCredentialsBoxProps {
  onSelectDemo: (account: DemoAccount) => void;
  disabled?: boolean;
}
```

### `LoginForm` Component
```typescript
export interface LoginFormProps {
  selectedRole: PortalRole;
  onRoleChange: (role: PortalRole) => void;
}
```

---

## 3. UI Dynamic Copy & Behavior Matrix

| Active Role | Active Tab Style | Form Action Button Label | Button Token Class | Default Destination |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | `bg-primary text-white` | `"Access Admin Portal"` | `bg-primary hover:bg-primary-hover text-white` | `/admin` |
| **`staff`** | `bg-secondary text-white` | `"Access Staff Fast-Lane POS"` | `bg-secondary hover:bg-secondary-hover text-white` | `/staff/pos` |
