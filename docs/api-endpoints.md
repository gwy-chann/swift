# SWIFT API Endpoints Reference

This document provides a comprehensive catalog of all API endpoints, Server Actions, Supabase PostgREST RPC functions, and App Router HTTP routes within the SWIFT repository.

> **Note on Architecture:**  
> This application is built with **Next.js 16 (App Router)** and **Supabase (PostgreSQL)**. Rather than traditional custom Next.js REST API routes (`app/**/route.ts` or `pages/api/**`), the system utilizes:
> 1. **Next.js Server Actions** (`"use server"`) as RPC endpoints over HTTP `POST` for internal client-server mutations and data queries.
> 2. **Supabase PostgREST Stored Procedure RPCs** (`POST /rest/v1/rpc/*`) for atomic database operations.
> 3. **Next.js App Router Page Endpoints** (HTTP `GET`) serving protected application views.
> 4. **Middleware Route Interceptor** (`proxy.ts` / `lib/supabase/middleware.ts`) guarding all inbound HTTP requests.

---

## 1. Next.js Server Action API Endpoints (RPC over HTTP POST)

All Server Actions are invoked by the client via HTTP `POST` requests to Next.js action endpoints.

| HTTP Method (GET, POST, etc.) | URL Path | Description of what it does | File Location where it is defined |
| :--- | :--- | :--- | :--- |
| **POST** | `/_server_action` (`authenticateUserAction`) | Authenticates user against Supabase Auth with demo account fallback; sets session role and user cookies. | [`lib/auth/actions.ts:55`](../lib/auth/actions.ts#L55-L135) |
| **POST** | `/_server_action` (`logoutAction`) | Terminates user session, signs out from Supabase Auth, and clears session cookies. | [`lib/auth/actions.ts:140`](../lib/auth/actions.ts#L140-L156) |
| **POST** | `/_server_action` (`verifyStaffPinAction`) | Authenticates staff terminal kiosk session via 4-digit PIN; sets staff session cookie and permissions. | [`lib/staff/actions.ts:249`](../lib/staff/actions.ts#L249-L272) |
| **POST** | `/_server_action` (`fetchStaffShiftAction`) | Retrieves the active work shift and permissions for a staff member. | [`lib/staff/actions.ts:274`](../lib/staff/actions.ts#L274-L404) |
| **POST** | `/_server_action` (`clockInShiftAction`) | Clocks in a staff member for a work shift via atomic PostgreSQL stored procedure. | [`lib/staff/actions.ts:406`](../lib/staff/actions.ts#L406-L439) |
| **POST** | `/_server_action` (`clockOutShiftAction`) | Clocks out a staff member and calculates duration and shift summary. | [`lib/staff/actions.ts:441`](../lib/staff/actions.ts#L441-L510) |
| **POST** | `/_server_action` (`toggleShiftBreakAction`) | Toggles break status (start or end break) for an active staff shift. | [`lib/staff/actions.ts:512`](../lib/staff/actions.ts#L512-L572) |
| **POST** | `/_server_action` (`getStaffAttendanceHistoryAction`) | Retrieves historical staff shift attendance logs with search, status, and date range filters. | [`lib/staff/actions.ts:574`](../lib/staff/actions.ts#L574-L627) |
| **POST** | `/_server_action` (`lookupProductPriceAction`) | Looks up product details, dual-tier pricing, profit margins, stock levels, and physical shelf location by SKU or barcode. | [`lib/staff/actions.ts:629`](../lib/staff/actions.ts#L629-L750) |
| **POST** | `/_server_action` (`verifyAdminElevationAction`) | Verifies admin PIN or password to elevate permissions for sensitive actions in the staff terminal. | [`lib/staff/actions.ts:752`](../lib/staff/actions.ts#L752-L800) |
| **POST** | `/_server_action` (`getLaborServicesAction`) | Retrieves the catalog of active workshop labor and repair services with flat rates. | [`lib/pos/actions.ts:16`](../lib/pos/actions.ts#L16-L72) |
| **POST** | `/_server_action` (`processCheckoutAction`) | Executes atomic POS transaction: validates inventory, applies discounts, records sale, and generates receipt. | [`lib/pos/actions.ts:409`](../lib/pos/actions.ts#L409-L505) |
| **POST** | `/_server_action` (`getTransactionsAction`) | Fetches recent POS transactions with itemized line items. | [`lib/pos/transaction-actions.ts:74`](../lib/pos/transaction-actions.ts#L74-L184) |
| **POST** | `/_server_action` (`getTransactionByReceiptAction`) | Looks up a single POS transaction record by receipt number. | [`lib/pos/transaction-actions.ts:186`](../lib/pos/transaction-actions.ts#L186-L243) |
| **POST** | `/_server_action` (`getThermalReceiptByReceiptAction`) | Generates printable thermal receipt payload with store header, line items, and cashier info. | [`lib/pos/transaction-actions.ts:245`](../lib/pos/transaction-actions.ts#L245-L315) |
| **POST** | `/_server_action` (`getMotorcycleModelsAction`) | Retrieves motorcycle models partitioned by brand and displacement with cache invalidation tags. | [`lib/motomatcher/actions.ts:71`](../lib/motomatcher/actions.ts#L71-L80) |
| **POST** | `/_server_action` (`getFitmentMatrixAction`) | Queries OEM vs. aftermarket parts compatibility matrix for a specific motorcycle model and category. | [`lib/motomatcher/actions.ts:108`](../lib/motomatcher/actions.ts#L108-L166) |
| **POST** | `/_server_action` (`addFitmentRuleAction`) | Creates a new motorcycle-to-product compatibility rule and invalidates matrix cache tags. | [`lib/motomatcher/actions.ts:172`](../lib/motomatcher/actions.ts#L172-L238) |
| **POST** | `/_server_action` (`getProductsAction`) | Retrieves the master motorcycle parts catalog sorted by product name. | [`lib/admin/product-actions.ts:30`](../lib/admin/product-actions.ts#L30-L270) |
| **POST** | `/_server_action` (`adjustProductStockAction`) | Adjusts physical stock quantity (restock, damaged, shrinkage, correction) and writes an audit log. | [`lib/admin/product-actions.ts:272`](../lib/admin/product-actions.ts#L272-L300) |
| **POST** | `/_server_action` (`createProductAction`) | Validates and registers a new product SKU into the catalog with wholesale/retail pricing and markup calculation. | [`lib/admin/product-actions.ts:682`](../lib/admin/product-actions.ts#L682-L754) |
| **POST** | `/_server_action` (`getPricingRulesAction`) | Retrieves global markup percentage rules across categories and tiers (retail vs. wholesale). | [`lib/admin/pricing-actions.ts:34`](../lib/admin/pricing-actions.ts#L34-L190) |
| **POST** | `/_server_action` (`updatePricingRulesAction`) | Updates global pricing markup rules and creates an audit entry. | [`lib/admin/pricing-actions.ts:192`](../lib/admin/pricing-actions.ts#L192-L275) |
| **POST** | `/_server_action` (`getAdminLaborServicesAction`) | Retrieves all workshop labor services with pricing and duration for admin rate management. | [`lib/admin/service-actions.ts:43`](../lib/admin/service-actions.ts#L43-L213) |
| **POST** | `/_server_action` (`createLaborServiceAction`) | Creates a new labor/repair service in the system catalog. | [`lib/admin/service-actions.ts:215`](../lib/admin/service-actions.ts#L215-L397) |
| **POST** | `/_server_action` (`updateLaborServiceAction`) | Updates an existing labor service's rate or description and records an audit log. | [`lib/admin/service-actions.ts:399`](../lib/admin/service-actions.ts#L399-L468) |
| **POST** | `/_server_action` (`toggleServiceStatusAction`) | Toggles the active status of a workshop service. | [`lib/admin/service-actions.ts:470`](../lib/admin/service-actions.ts#L470-L475) |
| **POST** | `/_server_action` (`deleteLaborServiceAction`) | Deactivates/removes a labor service from active availability. | [`lib/admin/service-actions.ts:477`](../lib/admin/service-actions.ts#L477-L534) |
| **POST** | `/_server_action` (`getServiceRateAuditLogsAction`) | Fetches audit logs tracking changes made to labor rates and service configurations. | [`lib/admin/service-actions.ts:536`](../lib/admin/service-actions.ts#L536-L596) |
| **POST** | `/_server_action` (`getStockAdjustmentLogsAction`) | Retrieves the immutable stock adjustment ledger with shrinkage, variance, and user filters. | [`lib/admin/stock-audit-actions.ts:81`](../lib/admin/stock-audit-actions.ts#L81-L205) |
| **POST** | `/_server_action` (`exportStockAdjustmentLogsAction`) | Exports stock adjustment audit logs into downloadable CSV format. | [`lib/admin/stock-audit-actions.ts:207`](../lib/admin/stock-audit-actions.ts#L207-L255) |
| **POST** | `/_server_action` (`listStaffUsersAction`) | Lists staff user profiles along with their assigned roles and granular permissions. | [`lib/admin/user-actions.ts:122`](../lib/admin/user-actions.ts#L122-L156) |
| **POST** | `/_server_action` (`provisionStaffUserAction`) | Provisions a new staff/cashier account with credentials, PIN, and granular RBAC permissions. | [`lib/admin/user-actions.ts:158`](../lib/admin/user-actions.ts#L158-L311) |
| **POST** | `/_server_action` (`updateUserPermissionsAction`) | Updates specific RBAC permission flags (e.g. override discount, adjust stock, refund) for a user. | [`lib/admin/user-actions.ts:313`](../lib/admin/user-actions.ts#L313-L381) |
| **POST** | `/_server_action` (`updateStaffUserAction`) | Updates staff account metadata, PIN, or role assignments. | [`lib/admin/user-actions.ts:383`](../lib/admin/user-actions.ts#L383-L497) |
| **POST** | `/_server_action` (`toggleUserStatusAction`) | Activates or disables a user account from accessing the portals. | [`lib/admin/user-actions.ts:499`](../lib/admin/user-actions.ts#L499-L555) |
| **POST** | `/_server_action` (`getCategoryPnlBreakdownAction`) | Computes financial P&L breakdown (Revenue, COGS, Gross Profit, Margin %) by product category. | [`lib/admin/pnl-actions.ts:25`](../lib/admin/pnl-actions.ts#L25-L65) |
| **POST** | `/_server_action` (`getSecurityAuditLogsAction`) | Retrieves forensic security logs (logins, session elevations, permission changes). | [`lib/admin/audit-actions.ts:141`](../lib/admin/audit-actions.ts#L141-L207) |
| **POST** | `/_server_action` (`logSecurityEventAction`) | Writes an immutable forensic security log entry into the database. | [`lib/admin/audit-actions.ts:209`](../lib/admin/audit-actions.ts#L209-L285) |
| **POST** | `/_server_action` (`exportSecurityAuditLogsAction`) | Generates a downloadable CSV export of the security audit trail. | [`lib/admin/audit-actions.ts:287`](../lib/admin/audit-actions.ts#L287-L320) |
| **POST** | `/_server_action` (`getExecutiveKpisAction`) | Fetches executive KPIs (daily gross sales, net profit, margin %, active bay utilization). | [`lib/analytics/actions.ts:69`](../lib/analytics/actions.ts#L69-L91) |
| **POST** | `/_server_action` (`getRevenueTrendAction`) | Retrieves 7-day revenue comparison against the prior week. | [`lib/analytics/actions.ts:93`](../lib/analytics/actions.ts#L93-L116) |
| **POST** | `/_server_action` (`getCategoryPnlAction`) | Fetches categorized P&L metrics with timeframe options (today, weekly, monthly, quarterly). | [`lib/analytics/actions.ts:118`](../lib/analytics/actions.ts#L118-L218) |
| **POST** | `/_server_action` (`getServiceBayStatusAction`) | Fetches real-time status, active work orders, and mechanic utilization for all workshop bays. | [`lib/analytics/actions.ts:220`](../lib/analytics/actions.ts#L220-L243) |
| **POST** | `/_server_action` (`updateWorkOrderStatusAction`) | Updates the progress status of a service bay work order. | [`lib/analytics/actions.ts:245`](../lib/analytics/actions.ts#L245-L270) |
| **POST** | `/_server_action` (`exportAccountingCsvAction`) | Dispatches multi-period sales and COGS report formatted as CSV for bookkeeping. | [`lib/analytics/export.ts:33`](../lib/analytics/export.ts#L33-L100) |

---

## 2. Supabase PostgREST Stored Procedure Endpoints (RPC over HTTP POST)

Supabase maps PostgreSQL functions to PostgREST HTTP RPC endpoints:

| HTTP Method (GET, POST, etc.) | URL Path | Description of what it does | File Location where it is defined |
| :--- | :--- | :--- | :--- |
| **POST** | `/rest/v1/rpc/adjust_product_stock` | Atomically increments/decrements inventory stock with constraint checks and generates audit log. | [`supabase/migrations/20261011000000_stock_adjustment_rpc.sql:77`](../supabase/migrations/20261011000000_stock_adjustment_rpc.sql#L77) |
| **POST** | `/rest/v1/rpc/process_pos_checkout` | Performs atomic checkout transaction (deducts stock, inserts transaction, saves line items). | [`supabase/migrations/20261014010000_process_pos_checkout_rpc.sql:8`](../supabase/migrations/20261014010000_process_pos_checkout_rpc.sql#L8) |
| **POST** | `/rest/v1/rpc/get_moto_matcher_matrix` | Fetches partitioned OEM and aftermarket compatible parts for a target motorcycle model. | [`supabase/migrations/20261016000000_moto_matcher_matrix_rpc.sql:11`](../supabase/migrations/20261016000000_moto_matcher_matrix_rpc.sql#L11) |
| **POST** | `/rest/v1/rpc/clock_in_shift` | Validates active shift constraints and clocks in a staff member. | [`supabase/migrations/20261021000000_staff_kiosk_auth_rpcs.sql:32`](../supabase/migrations/20261021000000_staff_kiosk_auth_rpcs.sql#L32) |
| **POST** | `/rest/v1/rpc/clock_out_shift` | Clocks out a staff member, records shift end time, and finalizes total duration. | [`supabase/migrations/20261021000000_staff_kiosk_auth_rpcs.sql:137`](../supabase/migrations/20261021000000_staff_kiosk_auth_rpcs.sql#L137) |
| **POST** | `/rest/v1/rpc/toggle_shift_break` | Updates break status (`on_break`) and logs timestamps for meal/rest intervals. | [`supabase/migrations/20261021000000_staff_kiosk_auth_rpcs.sql:235`](../supabase/migrations/20261021000000_staff_kiosk_auth_rpcs.sql#L235) |
| **POST** | `/rest/v1/rpc/get_executive_kpis` | Computes high-level KPI aggregations (gross revenue, net profit, margin, active service bays). | [`supabase/migrations/20261021000000_executive_analytics_rpcs.sql:13`](../supabase/migrations/20261021000000_executive_analytics_rpcs.sql#L13) |
| **POST** | `/rest/v1/rpc/get_revenue_trend_7d` | Returns 7-day revenue performance grouped by date against previous 7-day period. | [`supabase/migrations/20261021000000_executive_analytics_rpcs.sql:118`](../supabase/migrations/20261021000000_executive_analytics_rpcs.sql#L118) |
| **POST** | `/rest/v1/rpc/get_category_pnl` | Returns revenue, cost of goods sold, and gross margins grouped by part category. | [`supabase/migrations/20261021000000_executive_analytics_rpcs.sql:191`](../supabase/migrations/20261021000000_executive_analytics_rpcs.sql#L191) |
| **POST** | `/rest/v1/rpc/log_security_event` | Inserts an immutable audit event into `security_audit_logs`. | [`supabase/migrations/20261012000003_security_audit_logs.sql:71`](../supabase/migrations/20261012000003_security_audit_logs.sql#L71) |

---

## 3. Next.js App Router Page & Navigation Endpoints (HTTP GET)

These are the web endpoints handled by Next.js App Router, protected and routed through the session middleware:

| HTTP Method (GET, POST, etc.) | URL Path | Description of what it does | File Location where it is defined |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Root portal switcher & authentication hub landing page. | [`app/page.tsx`](../app/page.tsx) |
| **GET** | `/login` | Authentication Hub login view for Admin and Staff credentials. | [`app/(auth)/login/page.tsx`](../app/(auth)/login/page.tsx) |
| **GET** | `/admin` | Admin Portal Executive Dashboard (KPIs, operational alerts, bay status). | [`app/admin/page.tsx`](../app/admin/page.tsx) |
| **GET** | `/admin/inventory` | Inventory management, parts catalog search, stock adjustments, and shelf locator. | [`app/admin/inventory/page.tsx`](../app/admin/inventory/page.tsx) |
| **GET** | `/admin/pos` | Admin Point of Sale checkout terminal. | [`app/admin/pos/page.tsx`](../app/admin/pos/page.tsx) |
| **GET** | `/admin/motomatcher` | Motorcycle fitment compatibility matrix administration & rule editor. | [`app/admin/motomatcher/page.tsx`](../app/admin/motomatcher/page.tsx) |
| **GET** | `/admin/rates` | Pricing rules, category markup settings, and flat-rate labor services editor. | [`app/admin/rates/page.tsx`](../app/admin/rates/page.tsx) |
| **GET** | `/admin/reports` | Sales analytics, revenue trends, P&L breakdown, and accounting CSV export. | [`app/admin/reports/page.tsx`](../app/admin/reports/page.tsx) |
| **GET** | `/admin/users` | User management, staff account provisioning, and RBAC permission toggles. | [`app/admin/users/page.tsx`](../app/admin/users/page.tsx) |
| **GET** | `/admin/logs` | Security audit trail and stock adjustment ledger. | [`app/admin/logs/page.tsx`](../app/admin/logs/page.tsx) |
| **GET** | `/staff` | Staff Terminal home dashboard and quick actions. | [`app/staff/page.tsx`](../app/staff/page.tsx) |
| **GET** | `/staff/pos` | Fast-Lane POS terminal with cart, dual-tier pricing, cash tender, and thermal receipts. | [`app/staff/pos/page.tsx`](../app/staff/pos/page.tsx) |
| **GET** | `/staff/search` | Master stock lookup with real-time physical rack and shelf locator badges. | [`app/staff/search/page.tsx`](../app/staff/search/page.tsx) |
| **GET** | `/staff/pricecheck` | Instant SKU & barcode scanner for retail/wholesale price and margin verification. | [`app/staff/pricecheck/page.tsx`](../app/staff/pricecheck/page.tsx) |
| **GET** | `/staff/compat` | MotoMatcher parts compatibility search for motorcycle models. | [`app/staff/compat/page.tsx`](../app/staff/compat/page.tsx) |
| **GET** | `/staff/clock` | Digital shift punch clock (Time In, Time Out, Break toggle, attendance log). | [`app/staff/clock/page.tsx`](../app/staff/clock/page.tsx) |
| **GET** | `/staff/history` | Purchase history and thermal receipt reprint modal for staff. | [`app/staff/history/page.tsx`](../app/staff/history/page.tsx) |

---

## 4. Middleware Route Interceptor

| HTTP Method (GET, POST, etc.) | URL Path | Description of what it does | File Location where it is defined |
| :--- | :--- | :--- | :--- |
| **ALL** (`GET`, `POST`, etc.) | `/*` (excluding `_next/static`, `_next/image`, `favicon.ico`, static assets) | Validates Supabase authentication sessions and role cookies (`swift-session-role`); performs route guards and redirects between `/admin`, `/staff`, and `/`. | [`proxy.ts:4`](../proxy.ts#L4-L20) & [`lib/supabase/middleware.ts:4`](../lib/supabase/middleware.ts#L4-L54) |
