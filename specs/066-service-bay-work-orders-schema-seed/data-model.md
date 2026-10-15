# Data Model: Service Bay Work Orders Schema & Seed Data

**Feature**: `066-service-bay-work-orders-schema-seed`  
**Jira Issue**: [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66)  

---

## 1. Entity Relationship Diagram

```
┌─────────────────────────────────────────┐
│             public.profiles             │  (pre-existing, SIAA-43)
├─────────────────────────────────────────┤
│ PK  id           UUID                   │◄────────────────┐
│     email        TEXT                   │                 │
│     full_name    TEXT                   │                 │
│     role         public.user_role       │                 │
└─────────────────────────────────────────┘                 │
                                                            │ ON DELETE SET NULL
┌─────────────────────────────────────────┐                 │
│           public.service_bays           │                 │
├─────────────────────────────────────────┤                 │
│ PK  id            UUID  gen_random_uuid │◄──────┐         │
│     name          TEXT  UNIQUE          │       │         │
│     bay_type      TEXT                  │       │         │
│     status        TEXT  'AVAILABLE'     │       │         │
│     display_order INT   0               │       │         │
│     created_at    TIMESTAMPTZ           │       │         │
│     updated_at    TIMESTAMPTZ           │       │         │
└─────────────────────────────────────────┘       │         │
                                                  │         │
┌─────────────────────────────────────────────────┴─────────┴─────┐
│                      public.work_orders                         │
├─────────────────────────────────────────────────────────────────┤
│ PK  id                         UUID     gen_random_uuid         │
│     order_number               TEXT     UNIQUE                  │
│ FK  bay_id                     UUID     NULL (service_bays)     │
│     customer_name              TEXT     NOT NULL                │
│     vehicle_model              TEXT     NOT NULL                │
│     plate_number               TEXT     NOT NULL                │
│     service_code               TEXT     NOT NULL                │
│     service_name               TEXT     NOT NULL                │
│ FK  mechanic_id                UUID     NULL (profiles)         │
│     status                     TEXT     CHECK (status IN (...)) │
│     estimated_duration_minutes INT      NOT NULL DEFAULT 30     │
│     started_at                 TIMESTAMPTZ NULL                 │
│     completed_at               TIMESTAMPTZ NULL                 │
│     notes                      TEXT     NULL                    │
│     created_at                 TIMESTAMPTZ NOT NULL             │
│     updated_at                 TIMESTAMPTZ NOT NULL             │
└─────────────────────────────────────────────────────────────────┘
           ▲                                          ▲
           │ (bay_id)                                 │ (status, created_at DESC)
   idx_work_orders_bay_id                    idx_work_orders_status_created_at
```

---

## 2. Table Definitions

### 2.1 Table: `public.service_bays`

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `TEXT` | NO | — | UNIQUE |
| `bay_type` | `TEXT` | NO | — | Express, Specialist, Diagnostic, Overhaul |
| `status` | `TEXT` | NO | `'AVAILABLE'` | CHECK (`status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'QUEUED')`) |
| `display_order` | `INTEGER` | NO | `0` | Ordered physical bay rank |
| `created_at` | `TIMESTAMPTZ` | NO | `timezone('utc'::text, now())` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `timezone('utc'::text, now())` | — |

### 2.2 Table: `public.work_orders`

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY |
| `order_number` | `TEXT` | NO | — | UNIQUE (e.g., `WO-2026-0001`) |
| `bay_id` | `UUID` | YES | `NULL` | FK → `public.service_bays(id)` ON DELETE SET NULL |
| `customer_name` | `TEXT` | NO | — | Non-empty customer identifier |
| `vehicle_model` | `TEXT` | NO | — | e.g. "Yamaha NMAX 155" |
| `plate_number` | `TEXT` | NO | — | Vehicle plate / chassis reference |
| `service_code` | `TEXT` | NO | — | Reference to `labor_services.code` |
| `service_name` | `TEXT` | NO | — | Display service name |
| `mechanic_id` | `UUID` | YES | `NULL` | FK → `public.profiles(id)` ON DELETE SET NULL |
| `status` | `TEXT` | NO | `'QUEUED'` | CHECK (`status IN ('QUEUED', 'IN PROGRESS', 'PENDING_PARTS', 'COMPLETED', 'CANCELLED')`) |
| `estimated_duration_minutes` | `INTEGER` | NO | `30` | Expected job completion time |
| `started_at` | `TIMESTAMPTZ` | YES | `NULL` | Timestamp work began |
| `completed_at` | `TIMESTAMPTZ` | YES | `NULL` | Timestamp work concluded |
| `notes` | `TEXT` | YES | `NULL` | Workshop notes / customer instructions |
| `created_at` | `TIMESTAMPTZ` | NO | `timezone('utc'::text, now())` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `timezone('utc'::text, now())` | — |

---

## 3. Query Optimization B-Tree Indexes

```sql
-- Service Bays
CREATE INDEX IF NOT EXISTS idx_service_bays_status ON public.service_bays(status);
CREATE INDEX IF NOT EXISTS idx_service_bays_display_order ON public.service_bays(display_order ASC);

-- Work Orders
CREATE INDEX IF NOT EXISTS idx_work_orders_bay_id ON public.work_orders(bay_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_mechanic_id ON public.work_orders(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_status_created_at ON public.work_orders(status, created_at DESC);
```

---

## 4. Prisma Schema Representation

```prisma
model ServiceBay {
  id           String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String      @unique
  bayType      String      @map("bay_type")
  status       String      @default("AVAILABLE")
  displayOrder Int         @default(0) @map("display_order")
  createdAt    DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime    @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  workOrders   WorkOrder[]

  @@index([status])
  @@index([displayOrder])
  @@map("service_bays")
}

model WorkOrder {
  id                       String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderNumber              String      @unique @map("order_number")
  bayId                    String?     @map("bay_id") @db.Uuid
  customerName             String      @map("customer_name")
  vehicleModel             String      @map("vehicle_model")
  plateNumber              String      @map("plate_number")
  serviceCode              String      @map("service_code")
  serviceName              String      @map("service_name")
  mechanicId               String?     @map("mechanic_id") @db.Uuid
  status                   String      @default("QUEUED")
  estimatedDurationMinutes Int         @default(30) @map("estimated_duration_minutes")
  startedAt                DateTime?   @map("started_at") @db.Timestamptz(6)
  completedAt              DateTime?   @map("completed_at") @db.Timestamptz(6)
  notes                    String?
  createdAt                DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt                DateTime    @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  bay                      ServiceBay? @relation(fields: [bayId], references: [id], onDelete: SetNull)
  mechanic                 Profile?    @relation(fields: [mechanicId], references: [id], onDelete: SetNull)

  @@index([bayId])
  @@index([mechanicId])
  @@index([status])
  @@index([status, createdAt(sort: Desc)])
  @@map("work_orders")
}
```
