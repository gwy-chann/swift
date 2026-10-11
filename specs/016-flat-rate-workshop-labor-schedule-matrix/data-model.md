# Data Model: Flat-Rate Workshop Labor Schedule & Service Duration Matrix

**Feature**: Flat-Rate Workshop Labor Schedule & Service Duration Matrix  
**Jira Issue**: [SIAA-40](https://the-three-devsketeers.atlassian.net/browse/SIAA-40)  
**Date**: 2026-10-11  

---

## 1. Entity Definitions

### 1.1 `LaborService` (Workshop Labor Matrix Item)
The individual workshop repair service item within the Flat-Rate Schedule Matrix.

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` (UUID) | Optional | Unique database identifier | `"f47ac10b-58cc-4372-a567-0e02b2c3d479"` |
| `code` | `string` | Yes | Human-readable service SKU | `"SRV-OIL-01"` |
| `name` | `string` | Yes | Standard workshop service name | `"Oil & Gear Oil Change"` |
| `bay` | `string` | Yes | Assigned repair bay work zone | `"Bay 1 / Quick Bay"` |
| `rate` | `number` | Yes | Standard flat-rate price in PHP | `100.00` |
| `duration` | `string` | Yes | Estimated completion duration | `"15m"` or `"15 mins"` |
| `description` | `string` | No | Scope of work / service inclusion | `"Drain and refill engine and gear oil"` |
| `active` | `boolean` | No | Flag indicating if visible on POS | `true` |
| `createdAt` | `string \| Date` | No | Timestamp of registration | ISO string |
| `updatedAt` | `string \| Date` | No | Timestamp of last rate change | ISO string |

### 1.2 `PricingRules` & Shop Benchmark Rates
Shop-wide pricing configuration governing markup rates and benchmark hourly labor charges.

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `retailMarkup` | `number` | Yes | Standard retail parts markup (%) | `35` |
| `wholesaleMarkup` | `number` | Yes | Wholesale/reseller parts markup (%) | `18` |
| `aftermarketMarkup`| `number` | Yes | Performance aftermarket markup (%) | `40` |
| `hourlyLaborRate` | `number` | Yes | Benchmark hourly shop labor rate in PHP | `450.00` |

### 1.3 `ProRatedLaborEstimate`
Dynamic DTO for calculating time-pro-rated labor charges for diagnostic and custom fabrication bay jobs.

| Field | Type | Description |
| :--- | :--- | :--- |
| `durationMinutes` | `number` | Duration of technician bay time in minutes (e.g., `90`) |
| `durationHours` | `number` | Computed duration in decimal hours (e.g., `1.5`) |
| `hourlyLaborRate` | `number` | Applied base hourly rate in PHP (e.g., `450.00`) |
| `estimatedCharge` | `number` | Calculated charge: `round(durationHours * hourlyLaborRate, 2)` |
| `formattedCharge` | `string` | Formatted Philippine Peso string: `"₱675.00"` |

---

## 2. Canonical Baseline Flat-Rate Schedule Data

| Code | Service Name | Assigned Bay | Duration | Flat Rate | Scope / Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SRV-OIL-01` | Oil & Gear Oil Change | Bay 1 / Quick Bay | 15m | ₱100.00 | Standard engine & transmission oil drain/fill |
| `SRV-CVT-01` | CVT Cleaning & Regrease | Bay 2 / Scooter Bay | 45m | ₱350.00 | Variator, clutch bell, pulley degrease & regrease |
| `SRV-TIRE-01` | Tire Mounting & Sealing | Bay 1 / Quick Bay | 20m | ₱150.00 | Rim bead cleaning, tire mount & bead seal |
| `SRV-BRK-01` | Brake Caliper Flush & Bleed | Bay 3 / Mechanical Bay | 30m | ₱250.00 | Hydraulic fluid flush & bleed |
| `SRV-TUNE-01`| FI Throttle Body Reset | Bay 3 / Mechanical Bay | 60m | ₱650.00 | Throttle body ultrasonic cleaning & TPS reset |
| `SRV-FORK-01`| Front Shock Re-oil | Bay 4 / Heavy Repair | 90m | ₱800.00 | Telescopic fork disassembly, oil & seal replace |

---

## 3. State Invariants

1. `rate > 0` for all flat-rate workshop services.
2. `hourlyLaborRate > 0` for shop benchmark pricing.
3. Duration must contain a non-empty string format or positive numeric minutes.
4. Calculations must round to 2 decimal places to avoid fractional centavo errors.
