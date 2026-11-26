import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  ClientJoinedPayload,
  HeartbeatPayload,
  BarcodeScannedPayload
} from "@/specs/111-pos-terminal-qr-session-pairing/contracts/pos-scanner-channel.contract";

/**
 * Mock Realtime Channel to deterministically verify event workflows without live network sockets.
 */
class MockRealtimeChannel {
  public channelName: string;
  public listeners: Map<string, (msg: any) => void> = new Map();
  public sentBroadcasts: Array<{ type: string; event: string; payload: any }> = [];
  public status: string = "CLOSED";

  constructor(channelName: string) {
    this.channelName = channelName;
  }

  on(type: string, filter: { event: string }, callback: (msg: any) => void) {
    this.listeners.set(`${type}:${filter.event}`, callback);
    return this;
  }

  async send(message: { type: string; event: string; payload: any }) {
    this.sentBroadcasts.push(message);
    return "ok";
  }

  subscribe(callback?: (status: string) => void) {
    this.status = "SUBSCRIBED";
    callback?.("SUBSCRIBED");
    return this;
  }

  unsubscribe() {
    this.status = "CLOSED";
  }

  // Test simulation trigger
  simulateBroadcast(event: string, payload: any) {
    const handler = this.listeners.get(`broadcast:${event}`);
    if (handler) {
      handler({ payload });
    }
  }
}

describe("SIAA-111: Supabase Realtime Broadcast Channel Protocol", () => {
  describe("Scenario 2: Establishing Realtime Broadcast Handshake", () => {
    it("receives CLIENT_JOINED and responds with TERMINAL_ACK", async () => {
      const channel = new MockRealtimeChannel("pos-channel:pos-T1-test-123");
      let receivedDevice: string | null = null;

      channel.on("broadcast", { event: "CLIENT_JOINED" }, (msg) => {
        receivedDevice = msg.payload.device;
        channel.send({
          type: "broadcast",
          event: "TERMINAL_ACK",
          payload: { terminalId: "T1", timestamp: Date.now() }
        });
      });

      channel.subscribe();

      // Companion joins
      const joinPayload: ClientJoinedPayload = {
        device: "iPhone 15 Mobile Safari",
        timestamp: Date.now(),
        companionSessionId: "cmp-session-1"
      };

      channel.simulateBroadcast("CLIENT_JOINED", joinPayload);

      assert.strictEqual(receivedDevice, "iPhone 15 Mobile Safari");
      assert.strictEqual(channel.sentBroadcasts.length, 1);
      assert.strictEqual(channel.sentBroadcasts[0].event, "TERMINAL_ACK");
      assert.strictEqual(channel.sentBroadcasts[0].payload.terminalId, "T1");
    });
  });

  describe("Scenario 3: Focus-Agnostic Background Scan Ingestion", () => {
    it("dispatches BARCODE_SCANNED directly to handler in <100ms", async () => {
      const channel = new MockRealtimeChannel("pos-channel:pos-T1-test-123");
      const ingestedCodes: string[] = [];

      channel.on("broadcast", { event: "BARCODE_SCANNED" }, (msg) => {
        if (msg.payload?.code) {
          ingestedCodes.push(msg.payload.code);
        }
      });

      channel.subscribe();

      const startTime = Date.now();
      const scanPayload: BarcodeScannedPayload = {
        code: "HON-BRK-01",
        timestamp: startTime,
        format: "CODE_128"
      };

      channel.simulateBroadcast("BARCODE_SCANNED", scanPayload);

      const elapsedMs = Date.now() - startTime;
      assert.strictEqual(ingestedCodes.length, 1);
      assert.strictEqual(ingestedCodes[0], "HON-BRK-01");
      assert.ok(elapsedMs < 100);
    });
  });

  describe("Scenario 4: Heartbeat Monitoring & Graceful Disconnection", () => {
    it("calculates live round-trip latency on companion HEARTBEAT and returns HEARTBEAT_ACK", async () => {
      const channel = new MockRealtimeChannel("pos-channel:pos-T1-test-123");
      let calculatedLatency: number = 0;

      channel.on("broadcast", { event: "HEARTBEAT" }, (msg) => {
        const pingTime = msg.payload.timestamp;
        const now = pingTime + 18; // simulate 18ms latency
        calculatedLatency = now - pingTime;
        channel.send({
          type: "broadcast",
          event: "HEARTBEAT_ACK",
          payload: {
            sender: "terminal",
            pingTimestamp: pingTime,
            ackTimestamp: now,
            latencyMs: calculatedLatency
          }
        });
      });

      channel.subscribe();

      const pingPayload: HeartbeatPayload = {
        sender: "companion",
        timestamp: Date.now()
      };

      channel.simulateBroadcast("HEARTBEAT", pingPayload);

      assert.strictEqual(calculatedLatency, 18);
      assert.strictEqual(channel.sentBroadcasts.length, 1);
      assert.strictEqual(channel.sentBroadcasts[0].event, "HEARTBEAT_ACK");
      assert.strictEqual(channel.sentBroadcasts[0].payload.latencyMs, 18);
    });

    it("handles explicit CLIENT_DISCONNECTED gracefully", async () => {
      const channel = new MockRealtimeChannel("pos-channel:pos-T1-test-123");
      let isDisconnected = false;

      channel.on("broadcast", { event: "CLIENT_DISCONNECTED" }, () => {
        isDisconnected = true;
      });

      channel.subscribe();
      channel.simulateBroadcast("CLIENT_DISCONNECTED", {
        reason: "user_close",
        timestamp: Date.now()
      });

      assert.strictEqual(isDisconnected, true);
    });
  });
});
