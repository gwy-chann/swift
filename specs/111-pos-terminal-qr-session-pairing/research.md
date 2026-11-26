# Technical Research & Architecture Decisions: POS Terminal QR Code Session Pairing & Supabase Realtime Broadcast

**Spec Directory**: `specs/111-pos-terminal-qr-session-pairing`  
**Jira Issue**: [SIAA-111](https://the-three-devsketeers.atlassian.net/browse/SIAA-111)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109)  

---

## 1. Technical Context & Subsystem Boundaries

The QR Code Session Pairing and Realtime Scanner Ingestion pipeline spans:
1. **Session Lifecycle Manager (`lib/pos/scanner-session.ts`)**:
   - Generates cryptographically secure, URL-safe session tokens with timestamps and terminal identity.
   - Computes expiration (e.g. 8 hours or shift boundary) and validates token formats.
2. **SVG QR Code Generator (`components/pos/qr-code-svg.tsx`)**:
   - Zero-dependency, lightweight vector QR code component producing crisp SVG markup.
   - Encodes `{origin}/staff/pos/scanner?session={sessionKey}`.
3. **Supabase Realtime Broadcast Hook (`lib/hooks/use-pos-scanner-channel.ts`)**:
   - Connects to `pos-channel:${sessionKey}` using Supabase broadcast mode (no DB table writes required).
   - Manages connection states: `DISCONNECTED`, `CONNECTING`, `WAITING_FOR_DEVICE`, `CONNECTED`.
   - Listens for `CLIENT_JOINED`, `HEARTBEAT`, `BARCODE_SCANNED`, `CLIENT_DISCONNECTED`.
   - Sends `TERMINAL_ACK` and `HEARTBEAT_ACK`.
4. **Desktop POS Integration (`app/staff/pos/page.tsx`)**:
   - Triggers the pairing modal from the top action bar.
   - Forwards ingested `BARCODE_SCANNED` events directly to `handleSelectProduct` / `resolveBarcodeScanQuery` + availability validation pipeline.
   - Updates header connection status indicator.

---

## 2. Key Architecture Decisions

### ADR 1: Supabase Realtime Broadcast vs Database Presence / Table Replication
- **Decision**: Use Supabase Realtime **Broadcast channels** (`supabase.channel(channelName, { config: { broadcast: { self: false, ack: true } } })`) rather than writing ephemeral pairing tokens to a PostgreSQL table.
- **Rationale**: 
  - Sub-50ms latency across devices.
  - Zero database bloat or migration overhead for transient pairing sessions.
  - Free from database connection pool constraints during high-frequency barcode bursts.

### ADR 2: Session Key Entropy and Isolation
- **Decision**: Structure session tokens as `pos-${terminalId}-${randomHex}-${timestamp}`.
- **Rationale**:
  - Uniquely scopes broadcast channels so multiple cashier terminals operating in the same workshop never cross-contaminate carts.
  - Provides cryptographic unguessability to prevent accidental or malicious remote scans.

### ADR 3: Zero-Dependency SVG QR Code Rendering
- **Decision**: Implement a native TypeScript QR matrix encoder rendering directly as standard `<svg>` tags.
- **Rationale**:
  - Avoids adding heavy external npm packages or canvas dependencies.
  - Perfectly scales at any resolution, supports dark/light themes, and is SSR-safe in Next.js App Router.

### ADR 4: Focus-Agnostic Event Binding
- **Decision**: The broadcast listener in `usePosScannerChannel` directly invokes the cart resolution callback without touching document focus or synthetic keyboard events.
- **Rationale**:
  - Cashiers frequently click across customer name inputs, discount selectors, or payment calculators. Background broadcast ingestion ensures parts are never dropped even if focus is outside the search bar.

---

## 3. Latency & Network Disconnection Guarantees

- **Handshake latency**: <100ms over local Wi-Fi / standard 4G/5G mobile connection.
- **Scan ingestion throughput**: Handles up to 10 scans/second without dropped messages.
- **Heartbeat frequency**: Companion phone pings every 3s; terminal flags timeout if ping is missing for >10s.
- **Graceful recovery**: Re-pair button allows refreshing session or re-broadcasting without clearing cart state.
