"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getScannerChannelName } from "@/lib/pos/scanner-session";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  ScannerConnectionState,
  ScannerChannelTelemetry,
  BarcodeScannedPayload,
  ClientJoinedPayload,
  HeartbeatPayload
} from "@/specs/111-pos-terminal-qr-session-pairing/contracts/pos-scanner-channel.contract";
import type { PosScanValidationResponse } from "@/specs/112-pos-realtime-availability-validation/contracts/pos-scan-validation.contract";

export interface UsePosScannerChannelOptions {
  sessionKey?: string | null;
  terminalId?: string;
  onBarcodeScanned?: (code: string, rawPayload: BarcodeScannedPayload) => void;
  onDeviceConnected?: (payload: ClientJoinedPayload) => void;
  onDeviceDisconnected?: () => void;
}

export interface UsePosScannerChannelResult {
  connectionState: ScannerConnectionState;
  telemetry: ScannerChannelTelemetry;
  broadcastValidationResult: (payload: PosScanValidationResponse) => Promise<void>;
  disconnectSession: () => void;
  reconnectSession: () => void;
}

/**
 * Timeout in ms after which missing heartbeat transitions state to DISCONNECTED
 */
const HEARTBEAT_TIMEOUT_MS = 10000;

/**
 * Supabase Realtime Broadcast hook for POS session pairing and focus-agnostic scan ingestion.
 */
export function usePosScannerChannel({
  sessionKey,
  terminalId = "T1",
  onBarcodeScanned,
  onDeviceConnected,
  onDeviceDisconnected
}: UsePosScannerChannelOptions): UsePosScannerChannelResult {
  const [connectionState, setConnectionState] = useState<ScannerConnectionState>("DISCONNECTED");
  const [telemetry, setTelemetry] = useState<ScannerChannelTelemetry>({
    state: "DISCONNECTED"
  });
  const [reconnectCounter, setReconnectCounter] = useState(0);

  // Keep callback refs stable across renders
  const onBarcodeScannedRef = useRef(onBarcodeScanned);
  const onDeviceConnectedRef = useRef(onDeviceConnected);
  const onDeviceDisconnectedRef = useRef(onDeviceDisconnected);

  useEffect(() => {
    onBarcodeScannedRef.current = onBarcodeScanned;
    onDeviceConnectedRef.current = onDeviceConnected;
    onDeviceDisconnectedRef.current = onDeviceDisconnected;
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastHeartbeatTimeRef = useRef<number>(0);

  const broadcastValidationResult = useCallback(
    async (payload: PosScanValidationResponse): Promise<void> => {
      try {
        if (!channelRef.current || !sessionKey) return;
        await channelRef.current.send({
          type: "broadcast",
          event: "SCAN_VALIDATION_RESULT",
          payload
        });
      } catch (err) {
        console.warn("[usePosScannerChannel] Validation broadcast failed:", err);
      }
    },
    [sessionKey]
  );

  const disconnectSession = useCallback(() => {
    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
      } catch {}
      channelRef.current = null;
    }
    setConnectionState("DISCONNECTED");
    setTelemetry({ state: "DISCONNECTED" });
  }, []);

  const reconnectSession = useCallback(() => {
    disconnectSession();
    setReconnectCounter((c) => c + 1);
  }, [disconnectSession]);

  useEffect(() => {
    if (!sessionKey || typeof window === "undefined") {
      return;
    }

    const supabase = createClient();
    const channelName = getScannerChannelName(sessionKey);

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true }
      }
    });

    channelRef.current = channel;

    // Handle initial client joined event
    channel.on(
      "broadcast",
      { event: "CLIENT_JOINED" },
      (message: { payload: ClientJoinedPayload }) => {
        const payload = message.payload;
        const now = Date.now();
        lastHeartbeatTimeRef.current = now;

        setConnectionState("CONNECTED");
        setTelemetry({
          state: "CONNECTED",
          pairedDeviceName: payload.device || "Mobile Device",
          connectedAt: now,
          lastHeartbeatReceivedAt: now,
          lastPingLatencyMs: 15
        });

        // Send terminal acknowledgement back to phone
        channel
          .send({
            type: "broadcast",
            event: "TERMINAL_ACK",
            payload: {
              terminalId,
              timestamp: now
            }
          })
          .catch((err) => {
            console.warn("[usePosScannerChannel] Failed to send TERMINAL_ACK:", err);
          });

        onDeviceConnectedRef.current?.(payload);
      }
    );

    // Handle periodic heartbeat from companion phone
    channel.on(
      "broadcast",
      { event: "HEARTBEAT" },
      (message: { payload: HeartbeatPayload }) => {
        const now = Date.now();
        lastHeartbeatTimeRef.current = now;
        const pingTime = message.payload?.timestamp || now;
        const latencyMs = Math.max(1, now - pingTime);

        setTelemetry((prev) => ({
          ...prev,
          state: "CONNECTED",
          lastHeartbeatReceivedAt: now,
          lastPingLatencyMs: latencyMs < 500 ? latencyMs : prev.lastPingLatencyMs || 25
        }));

        // Send heartbeat ACK back to companion phone
        channel
          .send({
            type: "broadcast",
            event: "HEARTBEAT_ACK",
            payload: {
              sender: "terminal",
              pingTimestamp: pingTime,
              ackTimestamp: now,
              latencyMs
            }
          })
          .catch(() => {});
      }
    );

    // Handle barcode scans emitted by companion phone
    channel.on(
      "broadcast",
      { event: "BARCODE_SCANNED" },
      (message: { payload: BarcodeScannedPayload }) => {
        const payload = message.payload;
        const now = Date.now();
        lastHeartbeatTimeRef.current = now;

        setTelemetry((prev) => ({
          ...prev,
          lastHeartbeatReceivedAt: now
        }));

        if (payload?.code) {
          onBarcodeScannedRef.current?.(payload.code, payload);
        }
      }
    );

    // Handle companion graceful disconnection
    channel.on(
      "broadcast",
      { event: "CLIENT_DISCONNECTED" },
      () => {
        setConnectionState("DISCONNECTED");
        setTelemetry({ state: "DISCONNECTED" });
        onDeviceDisconnectedRef.current?.();
      }
    );

    // Subscribe to channel
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        setConnectionState((curr) => (curr === "CONNECTED" ? "CONNECTED" : "WAITING_FOR_DEVICE"));
        setTelemetry((prev) => ({
          ...prev,
          state: prev.state === "CONNECTED" ? "CONNECTED" : "WAITING_FOR_DEVICE"
        }));
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setConnectionState("DISCONNECTED");
        setTelemetry({ state: "DISCONNECTED" });
      }
    });

    // Heartbeat timeout watchdog interval
    const watchdogInterval = setInterval(() => {
      if (lastHeartbeatTimeRef.current > 0) {
        const timeSinceLastHeartbeat = Date.now() - lastHeartbeatTimeRef.current;
        if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
          setConnectionState((curr) => {
            if (curr === "CONNECTED") {
              onDeviceDisconnectedRef.current?.();
              return "DISCONNECTED";
            }
            return curr;
          });
          setTelemetry((prev) =>
            prev.state === "CONNECTED" ? { ...prev, state: "DISCONNECTED" } : prev
          );
        }
      }
    }, 2500);

    return () => {
      clearInterval(watchdogInterval);
      try {
        channel.unsubscribe();
      } catch {}
      channelRef.current = null;
    };
  }, [sessionKey, terminalId, reconnectCounter]);

  return {
    connectionState,
    telemetry,
    broadcastValidationResult,
    disconnectSession,
    reconnectSession
  };
}
