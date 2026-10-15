# Technical Implementation Plan: Secure Master Admin Elevation Modal & Shop Floor Session Guard

**Feature**: `032-secure-master-admin-elevation-modal`  
**Feature Branch**: `feat/SIAA-32-secure-master-admin-elevation-modal`  
**Jira Ticket**: [SIAA-32](https://the-three-devsketeers.atlassian.net/browse/SIAA-32)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5)  

---

## 1. Architectural Overview & Component Hierarchy

```text
app/(staff)/layout.tsx
  └── StaffLayoutShell
        ├── StaffTopbar
        │     └── button#btnAdminPortalAccess ("Admin Portal Access")
        │           └── onClick: setIsAdminSwitchOpen(true)
        ├── StaffSidebar
        ├── <PageContent> (/staff/pos, /staff/motomatcher, etc.)
        └── AdminSwitchModal (id="switchPortalModal", isOpen={isAdminSwitchOpen})
              ├── Modal Header & Close Button (✕)
              ├── Body Copy & Description
              ├── Target Account Input (id="switchUsernameInput", readonly)
              ├── Password Input (id="switchPasswordInput", autofocus)
              ├── Error Pill (id="switchAuthError", conditional)
              ├── Demo Credentials Box
              │     └── Button (id="btnAutofillAdminPassword", "Autofill Admin Password")
              └── Footer Buttons
                    ├── Button#btnCancelElevation ("Cancel")
                    └── Button#btnVerifyElevation ("Verify & Access Admin Portal")
                          └── calls verifyAdminElevationAction(password)
                                ├── Valid: sets cookie 'swift_admin_elevated', logs audit, router.push('/admin')
                                └── Invalid: displays 'Invalid administrator password.', keeps modal focused
```

---

## 2. File Modification & Creation Boundaries

| File Path | Nature | Description of Responsibilities |
| :--- | :--- | :--- |
| `specs/032-secure-master-admin-elevation-modal/*` | Artifacts | Canonical 8-artifact SpecKit documentation suite. |
| `lib/staff/types.ts` | Refactor | Ensure `AdminElevationResult` and input types are aligned with the new schema. |
| `lib/staff/actions.ts` | Refactor | Enhance `verifyAdminElevationAction` to accept password strings (`admin123`, `admin`, `1234`, `8888`), trim inputs, set HTTP-only cookie, and log both successful and failed attempts to audit logs. |
| `components/staff/admin-switch-modal.tsx` | Refactor | Rebuild modal UI according to `mockup/staff.html` (lines 382–420) using SWIFT design tokens, autofocus, demo autofill, keyboard escape dismissal, and exact element IDs. |
| `lib/staff/__tests__/admin-elevation-modal.test.ts` | New | Comprehensive automated test suite verifying password validation, error rejection, audit logging, and contract compliance. |

---

## 3. Design Token Mapping & Styling Matrix

| UI Component / State | Token Class / Variable | Fallback Color Rule |
| :--- | :--- | :--- |
| Modal Backdrop | `bg-black/60 backdrop-blur-xs` | High contrast overlay |
| Modal Surface | `bg-bg-card border-border` | Strict semantic token |
| Header Bar | `bg-bg-surface border-border` | Semantic header surface |
| Text Primary (Title, Input) | `text-text-primary` | Semantic primary text |
| Text Secondary (Body Copy) | `text-text-secondary` | Semantic secondary text |
| Text Muted (Labels, Subtitles) | `text-text-muted` | Semantic muted text |
| Readonly Target Input | `bg-bg-surface text-text-secondary border-border` | Non-editable input token |
| Password Input | `bg-bg-input border-border focus:border-primary` | Active input token |
| Error Pill Container | `bg-danger-light text-danger border-danger/30` | Semantic danger token |
| Demo Credentials Box | `bg-bg-surface border-border text-text-secondary` | Highlight box token |
| Submit Button | `bg-primary hover:bg-primary-hover text-white` | Semantic action button |
| Cancel & Secondary Buttons | `bg-bg-surface hover:bg-bg-hover text-text-secondary border-border` | Secondary button token |

---

## 4. Test Strategy & Verification Gates

1. **Unit & Server Action Testing** (`lib/staff/__tests__/admin-elevation-modal.test.ts`):
   - Accepts canonical demo password `admin123`.
   - Accepts alternative demo aliases (`admin`, `1234`, `8888`).
   - Rejects empty and whitespace-only submissions (`EMPTY_PASSWORD`).
   - Rejects invalid passwords with human-readable error (`"Invalid administrator password."`).
   - Logs `MASTER_ADMIN_ELEVATION` on success and `ELEVATION_FAILED` on rejection.
2. **Static Analysis & Typecheck**:
   - `npx tsc --noEmit` exits with code 0.
   - `npm run lint` passes without warnings.
   - `npm test` passes suite.
