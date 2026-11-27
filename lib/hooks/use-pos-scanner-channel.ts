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
  const [connectionState, setConnectionState] = useState<ScannerConnectionState>(
    sessionKey ? "WAITING_FOR_DEVICE" : "DISCONNECTED"
  );
  const [telemetry, setTelemetry] = useState<ScannerChannelTelemetry>({
    state: sessionKey ? "WAITING_FOR_DEVICE" : "DISCONNECTED"
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
  const processedScansRef = useRef<Map<string, number>>(new Map());
  const lastProcessedScanRef = useRef<{ code: string; timestamp: number } | null>(null);

  const handleIncomingBarcode = useCallback((payload: BarcodeScannedPayload) => {
    if (!payload?.code) return;

    const now = Date.now();
    lastHeartbeatTimeRef.current = now;

    // Deduplication key across dual-transport (SSE + Supabase Realtime)
    const scanId = payload.scanId || `${payload.code}-${payload.timestamp || ''}`;

    // Clean up expired scan records older than 10 seconds
    const expiry = now - 10000;
    for (const [id, time] of processedScansRef.current.entries()) {
      if (time < expiry) {
        processedScansRef.current.delete(id);
      }
    }

    // 1. Suppress exact duplicate scanId or code+timestamp payload
    if (processedScansRef.current.has(scanId)) {
      return;
    }

    // 2. Suppress rapid duplicate scans of identical SKU within 600ms
    if (
      lastProcessedScanRef.current &&
      lastProcessedScanRef.current.code === payload.code &&
      now - lastProcessedScanRef.current.timestamp < 600
    ) {
      return;
    }

    processedScansRef.current.set(scanId, now);
    lastProcessedScanRef.current = { code: payload.code, timestamp: now };

    setTelemetry((prev) => ({
      ...prev,
      lastHeartbeatReceivedAt: now
    }));

    onBarcodeScannedRef.current?.(payload.code, payload);
  }, []);

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

    // Initialize waiting status asynchronously to prevent synchronous state mutation within effect
    void Promise.resolve().then(() => {
      setConnectionState((curr) => (curr === "CONNECTED" ? "CONNECTED" : "WAITING_FOR_DEVICE"));
      setTelemetry((prev) => ({
        ...prev,
        state: prev.state === "CONNECTED" ? "CONNECTED" : "WAITING_FOR_DEVICE"
      }));
    });

    // 1. Establish resilient Server-Sent Events bridge
    const streamUrl = `/api/pos/scanner/stream?sessionKey=${encodeURIComponent(sessionKey)}`;
    const eventSource = typeof EventSource !== "undefined" ? new EventSource(streamUrl) : null;

    if (eventSource) {
      eventSource.addEventListener("READY", () => {
        setConnectionState((curr) => (curr === "CONNECTED" ? "CONNECTED" : "WAITING_FOR_DEVICE"));
        setTelemetry((prev) => ({
          ...prev,
          state: prev.state === "CONNECTED" ? "CONNECTED" : "WAITING_FOR_DEVICE"
        }));
      });

      eventSource.addEventListener("CLIENT_JOINED", (e: MessageEvent) => {
        const now = Date.now();
        lastHeartbeatTimeRef.current = now;
        let payload: ClientJoinedPayload = { device: "Mobile Companion", timestamp: now };
        try {
          payload = JSON.parse(e.data);
        } catch {}

        setConnectionState("CONNECTED");
        setTelemetry({
          state: "CONNECTED",
          pairedDeviceName: payload.device || "Mobile Companion",
          connectedAt: now,
          lastHeartbeatReceivedAt: now,
          lastPingLatencyMs: 15
        });

        onDeviceConnectedRef.current?.(payload);
      });

      eventSource.addEventListener("HEARTBEAT", (e: MessageEvent) => {
        const now = Date.now();
        lastHeartbeatTimeRef.current = now;
        let payload: HeartbeatPayload = { sender: "companion", timestamp: now };
        try {
          payload = JSON.parse(e.data);
        } catch {}
        const pingTime = payload?.timestamp || now;
        const latencyMs = Math.max(1, now - pingTime);

        setConnectionState("CONNECTED");
        setTelemetry((prev) => ({
          ...prev,
          state: "CONNECTED",
          lastHeartbeatReceivedAt: now,
          lastPingLatencyMs: latencyMs < 500 ? latencyMs : prev.lastPingLatencyMs || 25
        }));
      });

      eventSource.addEventListener("BARCODE_SCANNED", (e: MessageEvent) => {
        try {
          const payload: BarcodeScannedPayload = JSON.parse(e.data);
          if (payload?.code) {
            handleIncomingBarcode(payload);
          }
        } catch {}
      });

      eventSource.addEventListener("CLIENT_DISCONNECTED", () => {
        setConnectionState("DISCONNECTED");
        setTelemetry({ state: "DISCONNECTED" });
        onDeviceDisconnectedRef.current?.();
      });
    }

    // 2. Also subscribe to Supabase Realtime channel
    const supabase = createClient();
    const channelName = getScannerChannelName(sessionKey);

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true }
      }
    });

    channelRef.current = channel;

    // Handle initial client joined event via Supabase
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

        channel
          .send({
            type: "broadcast",
            event: "TERMINAL_ACK",
            payload: {
              terminalId,
              timestamp: now
            }
          })
          .catch(() => {});

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
      }
    );

    // Handle barcode scans emitted by companion phone
    channel.on(
      "broadcast",
      { event: "BARCODE_SCANNED" },
      (message: { payload: BarcodeScannedPayload }) => {
        const payload = message.payload;
        if (payload?.code) {
          handleIncomingBarcode(payload);
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
    try {
      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setConnectionState((curr) => (curr === "CONNECTED" ? "CONNECTED" : "WAITING_FOR_DEVICE"));
        }
      });
    } catch {}

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
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
      }
      try {
        channel.unsubscribe();
      } catch {}
      channelRef.current = null;
      setConnectionState("DISCONNECTED");
      setTelemetry({ state: "DISCONNECTED" });
    };
  }, [sessionKey, terminalId, reconnectCounter, handleIncomingBarcode]);

  return {
    connectionState,
    telemetry,
    broadcastValidationResult,
    disconnectSession,
    reconnectSession
  };
}
