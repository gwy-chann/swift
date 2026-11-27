/**
 * POS Terminal QR Code Session Pairing & Supabase Realtime Broadcast Contracts (SIAA-111)
 */

export type ScannerConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "WAITING_FOR_DEVICE"
  | "CONNECTED";

export interface ScannerSessionInfo {
  sessionKey: string;
  terminalId: string;
  createdAt: number;
  expiresAt: number;
  pairingUrl: string;
}

export interface ClientJoinedPayload {
  device: string;
  timestamp: number;
  companionSessionId?: string;
}

export interface TerminalAckPayload {
  terminalId: string;
  timestamp: number;
}

export interface HeartbeatPayload {
  sender: "companion" | "terminal";
  timestamp: number;
}

export interface HeartbeatAckPayload {
  sender: "terminal" | "companion";
  pingTimestamp: number;
  ackTimestamp: number;
  latencyMs?: number;
}

export interface BarcodeScannedPayload {
  code: string;
  timestamp: number;
  format?: string;
  scanId?: string;
}

export interface ClientDisconnectedPayload {
  reason?: string;
  timestamp: number;
}

export type ScannerBroadcastEvent =
  | { type: "broadcast"; event: "CLIENT_JOINED"; payload: ClientJoinedPayload }
  | { type: "broadcast"; event: "TERMINAL_ACK"; payload: TerminalAckPayload }
  | { type: "broadcast"; event: "HEARTBEAT"; payload: HeartbeatPayload }
  | { type: "broadcast"; event: "HEARTBEAT_ACK"; payload: HeartbeatAckPayload }
  | { type: "broadcast"; event: "BARCODE_SCANNED"; payload: BarcodeScannedPayload }
  | { type: "broadcast"; event: "CLIENT_DISCONNECTED"; payload: ClientDisconnectedPayload };

export interface ScannerChannelTelemetry {
  state: ScannerConnectionState;
  pairedDeviceName?: string;
  lastPingLatencyMs?: number;
  connectedAt?: number;
  lastHeartbeatReceivedAt?: number;
}
