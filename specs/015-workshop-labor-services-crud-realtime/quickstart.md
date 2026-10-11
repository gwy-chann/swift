# Quickstart Guide: Workshop Labor Services Admin CRUD & POS Realtime Verification

**Feature**: `015-workshop-labor-services-crud-realtime`  
**Jira Issue**: [SIAA-59](https://the-three-devsketeers.atlassian.net/browse/SIAA-59)  
**Date**: 2026-10-11  

---

## 1. Quick Verification Scenarios

### Scenario 1: Edit Labor Service Rate & Verify Audit Log
1. Navigate to `/admin/rates` in the browser or run automated test:
   ```bash
   npm test -- lib/admin/__tests__/service-actions.test.ts
   ```
2. Locate "CVT Cleaning & Regreasing" (`SRV-CVT-01`) currently priced at ₱350.
3. Click **Edit Rate** to open the rate editor modal.
4. Update the rate to `400.00`, enter reason: "Adjusted for higher shop consumable costs", and click **Save Changes**.
5. Verify that:
   - The table reflects ₱400.00 immediately.
   - An audit record is created in `service_rate_audit_logs`.
   - Both `/admin/rates` and `/staff/pos` routes are revalidated.

### Scenario 2: Instant POS Terminal Live Price Broadcast (<500ms)
1. Open two browser windows side by side:
   - Window A: `/admin/rates` (Admin Portal)
   - Window B: `/staff/pos` (Staff POS Fast-Lane)
2. On Window B, observe the "SERVICES" tab showing "CVT Cleaning & Regreasing" at ₱400.00.
3. On Window A, edit the rate to `420.00`.
4. Observe Window B: Within <500ms without page reload, the price badge updates to `₱420.00`.
5. Add the service to the cart in Window B: verify the line item calculates at ₱420.00.

### Scenario 3: Create New Workshop Service
1. In `/admin/rates`, click **+ Add New Service**.
2. Enter:
   - Code: `SRV-TIRE-02`
   - Name: `Heavy Tire Balancing & Lead Weights`
   - Bay: `Bay 1 / Quick Bay`
   - Rate: `220.00`
   - Duration: `25 mins`
3. Click **Register Service**.
4. Observe it appearing in `/admin/rates` and dynamically showing in `/staff/pos`.

### Scenario 4: Soft-Delete / Deactivate Service
1. In `/admin/rates`, locate a service and click the active status toggle to switch it to "Inactive".
2. Switch to `/staff/pos`: verify the service is immediately removed from the customer service catalog.
