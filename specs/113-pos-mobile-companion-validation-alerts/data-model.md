# Domain Data Models: POS Mobile Companion Validation Alerts & Screen Feedback

**Feature**: `113-pos-mobile-companion-validation-alerts`  
**Jira Ticket**: [SIAA-113](https://the-three-devsketeers.atlassian.net/browse/SIAA-113) (STORY-109.4)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109)  

---

## 1. Domain Entities & Type Architecture

```mermaid
classDiagram
    class ScanValidationStatus {
        <<enumeration>>
        SUCCESS
        OUT_OF_STOCK
        EXCEEDS_STOCK
        NOT_FOUND
    }

    class ScanValidationPayload {
        +ScanValidationStatus status
        +string sku
        +string? productName
        +number? unitPrice
        +number? remainingStock
        +string? reason
        +number? timestamp
    }

    class MobileCartSummary {
        +number itemCount
        +number subtotal
    }

    class ViewfinderPulseState {
        <<enumeration>>
        idle
        success
        danger
    }

    class ScannerFeedbackOptions {
        +boolean enableAudio
        +boolean enableHaptics
    }

    ScanValidationPayload --> ScanValidationStatus : has
```

---

## 2. State Machine: Validation Card & Screen Alerts

```mermaid
stateDiagram-v2
    [*] --> Idle: Viewfinder active & ready

    Idle --> ValidatingScan: Barcode transmitted to POS

    ValidatingScan --> SuccessState: Response { status: 'SUCCESS' }
    ValidatingScan --> RejectionState: Response { status: 'OUT_OF_STOCK' | 'EXCEEDS_STOCK' | 'NOT_FOUND' }

    state SuccessState {
        [*] --> TriggerSuccessFeedback
        TriggerSuccessFeedback --> PerimeterPulseGreen: 400ms CSS pulse
        TriggerSuccessFeedback --> Play1200HzChime: AudioContext 1200Hz
        TriggerSuccessFeedback --> Trigger80msHaptic: navigator.vibrate(80)
        TriggerSuccessFeedback --> RenderFloatingCard: Slide in from top
        RenderFloatingCard --> AwaitDismiss: 3.5s timer armed
        AwaitDismiss --> DismissCard: 3.5s elapsed OR user taps screen
    }

    state RejectionState {
        [*] --> TriggerRejectionFeedback
        TriggerRejectionFeedback --> PerimeterPulseRed: 400ms CSS pulse + shake
        TriggerRejectionFeedback --> Play250HzDoubleBuzz: AudioContext 250Hz (x2)
        TriggerRejectionFeedback --> TriggerDoubleHaptic: navigator.vibrate([200, 100, 200])
        TriggerRejectionFeedback --> RenderRejectionBanner: 'SOLD OUT / UNAVAILABLE'
        RenderRejectionBanner --> AwaitDismissRejection: 3.5s timer armed
        AwaitDismissRejection --> DismissRejection: 3.5s elapsed OR user taps screen
    }

    DismissCard --> Idle: Card slides/fades out
    DismissRejection --> Idle: Banner fades out
```

---

## 3. Storage & Realtime Message Structure

When a mobile companion scans an item, the POS terminal verifies availability and broadcasts a payload over the Supabase Realtime channel `pos-session:{pairingCode}`:

```json
{
  "event": "SCAN_VALIDATION_RESULT",
  "payload": {
    "status": "SUCCESS",
    "sku": "YAM-NMAX-BL01",
    "productName": "Yamaha NMAX Brake Pad Set",
    "unitPrice": 480.00,
    "remainingStock": 11,
    "timestamp": 1732628400000
  }
}
```

Or upon rejection:

```json
{
  "event": "SCAN_VALIDATION_RESULT",
  "payload": {
    "status": "OUT_OF_STOCK",
    "sku": "HON-CLK-DRV01",
    "reason": "Requested item has 0 units in stock",
    "remainingStock": 0,
    "timestamp": 1732628400000
  }
}
```

And running cart summary broadcast:

```json
{
  "event": "CART_UPDATED",
  "payload": {
    "itemCount": 4,
    "subtotal": 1420.00
  }
}
```
