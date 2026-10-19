# Quickstart: SIAA-73 Staff Purchase History & Thermal Receipt Modal

**Feature Branch**: `feat/SIAA-73-staff-purchase-history-receipt-modal`  
**Jira Issue**: [SIAA-73](https://the-three-devsketeers.atlassian.net/browse/SIAA-73)  

---

## 1. Quick Verification Steps

### Verification Scenario 1: Staff Sidebar Navigation
1. Run `npm run dev` and open `http://localhost:3000/staff/pos`.
2. Observe the desktop sidebar and mobile menu.
3. Confirm "Purchase History" is listed with the `History` icon under "Shop Floor Operations".
4. Click "Purchase History" and confirm navigation to `/staff/history`.

### Verification Scenario 2: Search & Filter History
1. On `/staff/history`, verify the list of recent sales transactions.
2. In the search bar, type `TX-1041` (or barcode scan). Confirm the list instantly filters down to that specific transaction.
3. Clear search and select the "Warranty Eligible (≤ 7 Days)" filter pill. Confirm transactions within 7 days display a green "Warranty Valid" badge.
4. Verify older transactions show "Warranty Expired".

### Verification Scenario 3: Clean 80mm Thermal Receipt Modal & Reprint
1. Click the "Reprint" or "View Receipt" button on any transaction.
2. Verify that the `ThermalReceiptModal` opens:
   - Formatted strictly for 80mm paper roll width.
   - Zero search bar / lookup form in the modal header.
   - Zero 58mm / 80mm toggle buttons.
   - Footer contains clean store info and warranty notice, without simulated barcode or duplicate `*TX-...*` string.
3. Click "Print Only" or "Print Receipt & Finish" and confirm standard print triggers.
