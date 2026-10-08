# Feature Specification: Centralized Domain Models & Reactive Mock Data Engine

**Feature Branch**: `feat/SIAA-12-domain-models-mock-engine`

**Created**: 2026-10-07

**Updated**: 2026-10-08

**Status**: Ready for Implementation

**Input**: User description: "STORY-1.5: Centralized Domain Models & Reactive Mock Data Engine (Jira: SIAA-12). As a developer implementing SWIFT portal features, I want a centralized TypeScript domain model and reactive mock store derived from mockup/app.js, so that all components access strongly typed product catalogs, motorcycle compatibility matrices, and active cart state."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Type-Safe Domain Entity Contracts (Priority: P1)

Developers building features across Admin, Staff, POS, Inventory, and Settings modules need a single source of truth for all domain entities in `@/lib/types` with zero reliance on `any` types, ensuring consistency and type safety across components and APIs.

**Why this priority**: Foundational prerequisite for all downstream features (Inventory [SIAA-2], POS [SIAA-3], MotoMatcher [SIAA-4], Staff Shift tracking [SIAA-5], Settings [SIAA-7], and Analytics [SIAA-6]).

**Independent Test**: Can be tested independently by importing `@/lib/types` across any component or unit test and verifying that TypeScript static analysis (`tsc --noEmit`) passes with zero type errors.

**Acceptance Scenarios**:

1. **Given** the `@/lib/types` module, **When** imported by any component or API, **Then** it provides complete, strictly typed interfaces for `Product`, `MotorcycleModel`, `CompatibilityRule`, `LaborService`, `CartItem`, `CartTotals`, `PricingMode`, `Transaction`, `UserSession`, `PricingRules`, `StockAdjustmentLog`, `AuditLog`, and `PunchLog`.
2. **Given** a `Product` entity, **When** inspected, **Then** it contains all essential properties: `sku`, `name`, `category`, `stock`, `minThreshold`, `location` (aisle/rack/shelf locator), `cost`, `wholesale`, `retail`, `oem`, `model`, and `brand`.
3. **Given** a `LaborService` entity, **When** inspected, **Then** it contains `code`, `name`, `bay`, `rate`, and `duration`.
4. **Given** a `Transaction` entity, **When** inspected, **Then** it contains `id` (e.g. `TX-1041`), `timestamp`, `cashier`, `items` (array of `CartItem`), `pricingMode` (`retail` | `wholesale`), `subtotal`, `discountRate`, `discountAmount`, `total`, `cashTendered`, `change`, and `paymentMethod`.
5. **Given** a `CompatibilityRule` entity, **When** inspected, **Then** it correlates part SKUs with compatible motorcycle models and optional year ranges or fitment notes.

---

### User Story 2 - Canonical Seed Data Initialization (Priority: P1)

The application requires a centralized, immutable seed database in `@/lib/mock-data` that accurately mirrors the motorcycle workshop inventory, flat-rate labor services, motorcycle models, user accounts, markup rules, and sample logs defined in `mockup/app.js`.

**Why this priority**: Guarantees that interactive mockups, testing environments, and baseline database seeders operate on realistic motorcycle shop data with exact pricing, fitments, and shelf locator coordinates.

**Independent Test**: Can be tested independently by inspecting `@/lib/mock-data` and asserting that all 12 initial motorcycle parts, 6 flat-rate labor services, 5 motorcycle models, 4 user personas, default markup rules, and sample logs match `mockup/app.js` specifications.

**Acceptance Scenarios**:

1. **Given** the mock data catalog, **When** loaded, **Then** it contains the complete initial inventory of motorcycle parts across Brakes, Drivetrain, Fluids, Ignition, Engine, and Tires categories.
2. **Given** any seed product in the catalog, **When** inspected, **Then** it includes a valid physical shelf locator string (e.g. `Rack A-01 / Shelf 2`, `Aisle 1 / Shelf 1`, `Tire Rack 1 / Floor`).
3. **Given** the flat-rate labor services list, **When** loaded, **Then** it contains all 6 workshop services with bay assignments, standard flat rates, and estimated durations.
4. **Given** the user personas list, **When** loaded, **Then** it provides 4 user accounts with designated roles (`Admin`, `Cashier`, `Mechanic`, `Inventory Clerk`) and role-based permissions.

---

### User Story 3 - Reactive Mock Store & State Management Engine (Priority: P1)

Interactive components across the application (such as the Fast-Lane POS cart, stock search, shelf locator, and shift punch clock) require a reactive, client-side store (or React custom hooks) in `@/lib/store` to manage shared state, perform live cart computations (line item subtotals, tax/discount adjustments, retail vs. wholesale pricing toggles), and execute mock inventory updates and transactions.

**Why this priority**: Enables immediate, realistic client-side interactivity across the Admin and Staff portals prior to full backend database integration.

**Independent Test**: Can be tested independently by simulating adding/removing items from the POS cart, toggling between retail and wholesale pricing modes, applying discounts, executing checkout to create a `Transaction`, and verifying that calculations and state subscribers update synchronously.

**Acceptance Scenarios**:

1. **Given** the reactive POS cart store (`useCartStore`), **When** initialized, **Then** it provides access to the active cart state (`items`, `pricingMode`, `discountRate`, `totals`) with helper actions to add parts, add services, remove items, update quantities, clear cart, set discount rate, and toggle pricing tier.
2. **Given** items in the cart, **When** toggling `pricingMode` from `"retail"` to `"wholesale"`, **Then** line items dynamically update their unit price to the product's wholesale price and recalculate totals instantly.
3. **Given** items in the cart, **When** checkout is triggered with payment details, **Then** a completed `Transaction` object is produced, stock is decremented in inventory, and the cart is reset.
4. **Given** the reactive inventory store (`useInventoryStore`), **When** performing a stock adjustment, **Then** the product stock count updates reactively and records a `StockAdjustmentLog` entry.
5. **Given** the shift punch clock store (`usePunchStore`), **When** staff clocks in or out, **Then** active shift status toggles, shift duration accumulates, and an entry is logged in `punchLogs`.

---

### Edge Cases

- **Missing or Partial Product Data**: The type system enforces non-null constraints on mandatory fields (`sku`, `name`, `category`, `stock`, `retail`, `wholesale`, `location`).
- **Zero or Negative Cart Quantities**: Store mutation handlers gracefully clamp quantities to minimum 1 or remove the line item upon reaching 0.
- **Cart Hybrid Items**: Store accurately distinguishes between physical part line items (`type: "part"`) and labor line items (`type: "service"`), applying correct tax and discount rules without attempting wholesale price lookups for labor.
- **Stock Depletion on Checkout**: If stock is insufficient, cart checkout either warns or adjusts available quantity without crashing the state engine.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide strict TypeScript interfaces in `@/lib/types` for all core domain entities: `Product`, `ProductCategory`, `LaborService`, `MotorcycleModel`, `CompatibilityRule`, `CartItem`, `CartTotals`, `PricingMode`, `Transaction`, `PricingRules`, `UserSession`, `UserRole`, `StockAdjustmentLog`, `AuditLog`, and `PunchLog`.
- **FR-002**: System MUST export canonical seed data in `@/lib/mock-data` containing complete records for parts inventory, workshop labor services, motorcycle models, user accounts, and markup rules extracted from `mockup/app.js`.
- **FR-003**: Every product in the seed catalog MUST feature a valid warehouse/store shelf locator string (e.g. `Rack A-01 / Shelf 2`).
- **FR-004**: System MUST implement a reactive store engine (`@/lib/store`) managing global POS cart state, pricing mode (`retail` | `wholesale`), discount rates (0%, 5%, 20%), and order totals calculation.
- **FR-005**: The reactive store MUST support hybrid cart line items comprising both physical motorcycle parts and flat-rate labor services.
- **FR-006**: The store MUST compute cart subtotal, discount amount, net total, and item count deterministically based on active pricing tier and discount rate.
- **FR-007**: The store checkout workflow MUST generate a formatted `Transaction` object and support thermal receipt metadata (cashier, items, totals, cash tendered, change).
- **FR-008**: The mock store MUST provide helper methods for simulated inventory lookups, model fitment filtering, stock level decrements, and shift punch recording.

### Key Entities *(include if feature involves data)*

- **Product**: `sku`, `name`, `category`, `stock`, `minThreshold`, `location`, `cost`, `wholesale`, `retail`, `oem`, `model`, `brand`, `description?`, `imageUrl?`
- **MotorcycleModel**: String literal union representing supported makes and models (`Yamaha NMAX 155`, `Yamaha Aerox 155`, `Honda Click 125i/150i`, `Honda ADV 160`, `Suzuki Raider 150 Fi`, `Universal`).
- **CompatibilityRule**: `sku`, `model`, `yearRange?`, `notes?`
- **LaborService**: `code`, `name`, `bay`, `rate`, `duration`, `description?`
- **CartItem**: `id`, `type` (`"part"` | `"service"`), `sku?`, `code?`, `name`, `price`, `qty`, `location?`, `bay?`, `retailPrice?`, `wholesalePrice?`
- **CartTotals**: `subtotal`, `discountRate`, `discountAmount`, `total`, `itemCount`
- **Transaction**: `id`, `timestamp`, `cashier`, `items`, `pricingMode`, `subtotal`, `discountRate`, `discountAmount`, `total`, `cashTendered?`, `change?`, `paymentMethod?`
- **PricingRules**: `retailMarkup`, `wholesaleMarkup`, `aftermarketMarkup`, `hourlyLaborRate`
- **UserSession**: `id`, `name`, `email`, `role` (`"Admin"` | `"Cashier"` | `"Mechanic"` | `"Inventory Clerk"`), `status`, `permissions`
- **StockAdjustmentLog**: `id`, `timestamp`, `sku`, `type`, `change`, `reason`, `user`
- **AuditLog**: `id`, `timestamp`, `user`, `action`, `ip`
- **PunchLog**: `id?`, `date`, `staff`, `timeIn`, `timeOut`, `duration`, `status` (`"On Shift"` | `"Completed"` | `"Break"`)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% TypeScript compilation success (`tsc --noEmit`) with zero `any` types across `@/lib/types`, `@/lib/mock-data`, and `@/lib/store`.
- **SC-002**: 12/12 seed inventory products, 6/6 labor services, 5/5 motorcycle models, and 4/4 user accounts accurately represented from `mockup/app.js`.
- **SC-003**: 100% shelf locator coverage across all physical inventory items.
- **SC-004**: Cart calculation accuracy matches expected mathematical totals (subtotal, wholesale/retail pricing, discounts, change calculation) across 100% of test scenarios.
- **SC-005**: Store mutations (add to cart, quantity change, toggle pricing tier, clock in/out) execute in < 5ms with synchronous state reactivity.

## Assumptions

- Mock data and client-side reactive store serve as the authoritative bridge during frontend development until full Supabase/PostgreSQL RPC and endpoints are wired up.
- All pricing values are stored in Philippine Peso (PHP / ₱) represented as numeric values.
- Cashier and mechanic interactions in mock state use default logged-in personas (`Mike Morales` for Cashier/Punch, `Carlos Rodriguez` for Admin).
