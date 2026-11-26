# Technical Research & Architecture Decisions: POS Availability Validation & Sold-Out Rejection

**Spec Directory**: `specs/112-pos-realtime-availability-validation`  
**Jira Issue**: [SIAA-112](https://the-three-devsketeers.atlassian.net/browse/SIAA-112)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109)  

---

## 1. Technical Context & Subsystem Boundaries

The availability validation and sold-out rejection engine sits at the intersection of:
1. **Catalog Resolution**: `lib/pos/barcode-scanner.ts` receives raw scanned barcodes or manually entered SKUs and resolves them against active in-memory inventory products and labor services.
2. **Cart Mutation Guard**: `lib/store/cart-store.ts` (`addPart`) enforces inventory ceilings against current basket quantities.
3. **Staff POS Terminal Orchestrator**: `app/staff/pos/page.tsx` connects the catalog UI (`HybridCatalogPane`), scanner events, user toasts, and session state.
4. **Supabase Realtime Channel**: `broadcastPosScanValidation` pushes telemetry over `pos-session:{pairingCode}` or `operational-intelligence` channels to mobile companions running `SIAA-113` validation cards.

---

## 2. Key Architecture Decisions

### ADR 1: Pure Function Availability Evaluation vs In-Store Mutation
- **Decision**: Encapsulate scan availability validation logic into pure evaluation functions in `lib/pos/barcode-scanner.ts` (e.g. `evaluateProductAvailability`), and enforce the guard in `useCartStore.addPart`.
- **Rationale**: Keeps business rules easily unit-testable without requiring a mounted React tree or localStorage mocks.

### ADR 2: Unified Telemetry Contract (`PosScanValidationResponse`)
- **Decision**: Define a single TypeScript and Zod-backed contract `PosScanValidationResponse` in `contracts/pos-scan-validation.contract.ts` that fulfills both SIAA-112 acceptance criteria and SIAA-113 mobile companion expectations:
  - `status`: `'SUCCESS' | 'OUT_OF_STOCK' | 'EXCEEDS_STOCK' | 'NOT_FOUND'`
  - `sku`, `name`, `price`, `stockRemaining`, `availableStock`, `currentCartQty`, `cartItemCount`, `cartTotal`, `message`, `timestamp`.
- **Rationale**: Avoids schema drift between desktop POS terminal broadcasters and mobile companion receivers.

### ADR 3: Graceful Broadcast Failure Handling
- **Decision**: Wrap all Realtime broadcast dispatches in `try/catch` and fire-and-forget patterns.
- **Rationale**: A network blip or disconnected companion phone must never freeze or crash the desktop POS checkout flow.

---

## 3. Performance & Memory Invariants

- Barcode resolution and stock comparison must execute synchronously in `< 5ms` for a 10,000-item catalog.
- Broadcast dispatches are non-blocking async calls that do not delay user interface rendering or sound playback.
