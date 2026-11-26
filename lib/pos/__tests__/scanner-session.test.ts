import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateScannerSessionKey,
  validateScannerSessionKey,
  buildCompanionPairingUrl,
  createScannerSessionInfo,
  isSessionExpired,
  getScannerChannelName,
  DEFAULT_SESSION_TTL_MS
} from "../scanner-session.ts";
import { generateQrMatrix, qrMatrixToSvgPath } from "../qr-code.ts";

describe("SIAA-111: POS Scanner Session Lifecycle Engine", () => {
  describe("Scenario 1: Terminal generates dynamic session pairing key", () => {
    it("generates a session key with default terminal T1 and valid parts", () => {
      const key = generateScannerSessionKey();
      assert.ok(key.startsWith("pos-T1-"));
      const parts = key.split("-");
      assert.strictEqual(parts.length, 4);
      assert.strictEqual(parts[0], "pos");
      assert.strictEqual(parts[1], "T1");
      assert.ok(parts[2].length >= 6);
    });

    it("respects custom terminal IDs and sanitizes special characters", () => {
      const key = generateScannerSessionKey("Terminal#3!");
      assert.ok(key.startsWith("pos-Terminal3-"));
    });

    it("generates distinct random session keys across sequential calls", () => {
      const key1 = generateScannerSessionKey("T1");
      const key2 = generateScannerSessionKey("T1");
      assert.notStrictEqual(key1, key2);
    });

    it("validates valid session keys and extracts metadata", () => {
      const key = generateScannerSessionKey("T2");
      const validation = validateScannerSessionKey(key);
      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.terminalId, "T2");
      assert.ok(typeof validation.timestamp === "number");
      assert.ok(validation.timestamp! > 0);
    });

    it("rejects invalid, malformed, or empty session keys", () => {
      assert.strictEqual(validateScannerSessionKey("").valid, false);
      assert.strictEqual(validateScannerSessionKey(null as any).valid, false);
      assert.strictEqual(validateScannerSessionKey("invalid-key").valid, false);
      assert.strictEqual(validateScannerSessionKey("pos-T1-onlytwo").valid, false);
    });

    it("builds the fully qualified companion pairing URL", () => {
      const key = "pos-T1-abc12345-lx3920";
      const url = buildCompanionPairingUrl(key, "https://swift.example.com");
      assert.strictEqual(
        url,
        "https://swift.example.com/staff/pos/scanner?session=pos-T1-abc12345-lx3920"
      );
    });

    it("creates complete session info and verifies expiration calculations", () => {
      const info = createScannerSessionInfo("T1", "http://localhost:3000", 3600000);
      assert.strictEqual(info.terminalId, "T1");
      assert.ok(info.sessionKey.startsWith("pos-T1-"));
      assert.strictEqual(info.expiresAt, info.createdAt + 3600000);
      assert.strictEqual(isSessionExpired(info, info.createdAt + 1000), false);
      assert.strictEqual(isSessionExpired(info, info.createdAt + 4000000), true);
    });

    it("derives the correct isolated Supabase broadcast channel name", () => {
      const channel = getScannerChannelName("pos-T1-abc12345-lx3920");
      assert.strictEqual(channel, "pos-channel:pos-T1-abc12345-lx3920");
    });
  });

  describe("Scenario 2: Native Vector SVG QR Code Generator", () => {
    it("generates a valid QR matrix with correct dimensions", () => {
      const testUrl = "http://localhost:3000/staff/pos/scanner?session=pos-T1-a1b2c3d4-test";
      const matrix = generateQrMatrix(testUrl);
      assert.ok(matrix.size >= 21);
      assert.strictEqual(matrix.modules.length, matrix.size);
      assert.strictEqual(matrix.modules[0].length, matrix.size);

      // Verify Top-Left Finder Pattern (7x7 black border, white inner, black center)
      assert.strictEqual(matrix.modules[0][0], true);
      assert.strictEqual(matrix.modules[0][6], true);
      assert.strictEqual(matrix.modules[6][0], true);
      assert.strictEqual(matrix.modules[6][6], true);
      assert.strictEqual(matrix.modules[1][1], false);
      assert.strictEqual(matrix.modules[3][3], true);
    });

    it("converts QR matrix to an optimized SVG path string", () => {
      const testUrl = "https://swift.pos/test";
      const matrix = generateQrMatrix(testUrl);
      const svgPath = qrMatrixToSvgPath(matrix);
      assert.ok(svgPath.length > 50);
      assert.ok(svgPath.startsWith("M"));
      assert.ok(svgPath.includes("h1v1h-1z"));
    });
  });
});
