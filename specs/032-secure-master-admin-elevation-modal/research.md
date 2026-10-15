# Technical Research & Architecture Decisions: Secure Master Admin Elevation Modal

**Feature**: `032-secure-master-admin-elevation-modal`  
**Jira Ticket**: [SIAA-32](https://the-three-devsketeers.atlassian.net/browse/SIAA-32)  

---

## 1. Architectural Context & Current Implementation Analysis

### 1.1 Existing Elevation Action (`lib/staff/actions.ts`)
The codebase currently contains `verifyAdminElevationAction(pin: string)` introduced in SIAA-64. However:
- It previously validated only 4-digit PINs (`8888`, `1234`), rejecting string passwords like `admin123` specified in the UI mockup (`mockup/staff.html` line 409: `admin123`) and Jira Acceptance Criteria.
- It did not log failed elevation attempts (`ELEVATION_FAILED`) to `audit_logs`.
- It did not support custom password configuration via `ADMIN_ELEVATION_PASSWORD`.

### 1.2 Existing UI Component (`components/staff/admin-switch-modal.tsx`)
The existing component rendered a generic PIN-only box with `max-w-md`:
- Missing the Target Account readonly input (`#switchUsernameInput` with `admin@swift.local`).
- Missing the Demo Credentials helper box with the 1-click "Autofill Admin Password" button.
- Did not bind the canonical IDs `#switchPortalModal`, `#switchUsernameInput`, `#switchPasswordInput`, `#switchAuthError`.
- Lacked `Escape` key dismissal listener for keyboard accessibility.

### 1.3 Route & Session Guard Integration (`lib/auth/session-guards.ts`)
The application already contains route classification and session resolution:
- `resolveSession()` currently checks for `swift_admin_elevated` cookie and promotes `staff` to `admin`.
- When elevated, accessing `/admin` routes succeeds without redirection back to `/staff/pos`.
- This ensures full harmony between the elevation modal and route guard protection.

---

## 2. Technical Decisions & Tradeoffs

### Decision 1: Flexible Password Verification (Password + PIN + Demo Fallbacks)
- **Problem**: Staff terminals require high security in production, while demo and automated integration environments need predictable, zero-friction verification.
- **Decision**:
  - Accept `process.env.ADMIN_ELEVATION_PASSWORD` or `process.env.ADMIN_ELEVATION_PIN` when defined.
  - In development / demo environments, accept `admin123` (canonical mockup credential), `admin`, `8888`, and `1234`.
  - Trim input before evaluation to avoid accidental whitespace errors.

### Decision 2: Forensic Security Audit Trail Dispatch
- **Problem**: Administrative elevations on shared shop-floor terminals are high-security events that require non-repudiation.
- **Decision**:
  - Log `MASTER_ADMIN_ELEVATION` on success, capturing client terminal metadata (`Terminal #01 (Shop Floor)`).
  - Log `ELEVATION_FAILED` on invalid submissions to track potential brute-force attempts.
  - Non-blocking error handling ensures offline terminals still operate if the remote Supabase database is unreachable.

### Decision 3: Design Tokens & Accessibility
- **Styling**:
  - Backdrop: `bg-black/60 backdrop-blur-xs`
  - Modal Window: `bg-bg-card border border-border rounded-xl shadow-2xl`
  - Header: `bg-bg-surface border-b border-border`
  - Inputs: `bg-bg-input border border-border focus:border-primary text-text-primary`
  - Readonly Target: `bg-bg-surface text-text-secondary`
  - Error: `bg-danger-light text-danger border border-danger/30 rounded-lg`
  - Buttons: Primary `bg-primary hover:bg-primary-hover text-white`, Secondary `bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border`
- **Accessibility**:
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby="switchPortalLabel"`.
  - `Escape` key event listener attached to `window`.
  - Autofocus on `#switchPasswordInput`.
