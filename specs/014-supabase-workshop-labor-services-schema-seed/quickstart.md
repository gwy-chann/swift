# Quickstart & Verification Guide: Supabase Workshop Labor Services

**Feature Branch**: `feat/SIAA-49-supabase-labor-services-schema-rates`  
**Jira Issue**: [SIAA-49](https://the-three-devsketeers.atlassian.net/browse/SIAA-49)  

---

## 1. Migration & Seed Verification

### Step 1: Validate Prisma Schema
```bash
npx prisma validate
```
Expected output: `The schema at prisma/schema.prisma is valid`

### Step 2: Database Schema Inspection (if local Supabase running)
```bash
npx supabase db reset
# or apply migration directly
```

### Step 3: Run Unit & Integration Tests
```bash
npm test -- lib/pos/__tests__/labor-services.test.ts
```
Expected output: All test cases pass covering schema validation, fallback hydration, and data mapping.

---

## 2. Interactive POS Terminal Verification

1. Start development server:
   ```bash
   npm run dev
   ```
2. Navigate to Fast-Lane POS terminal: `http://localhost:3000/staff/pos`.
3. Click on the **SERVICES** category filter pill.
4. Verify that all 6 workshop labor services are rendered with:
   - Service Code (e.g., `SRV-OIL-01`, `SRV-CVT-01`)
   - Service Name (e.g., `Standard Oil & Gear Oil Change`)
   - Bay Assignment (e.g., `Bay 1 / Quick Bay`)
   - Estimated Duration (e.g., `15 mins`)
   - Flat Rate (e.g., `₱100.00`)
5. Click **Add** on any service:
   - Verify it appears in the active cart with the exact flat rate.
   - Toggle pricing mode between **Retail (Walk-in)** and **Wholesale (B2B)**:
     - Verify physical parts adjust according to wholesale markup, while the labor service flat rate remains constant.
