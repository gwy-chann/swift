import { describe, it } from "node:test";
import assert from "node:assert";
import QRCode from "qrcode";
import { generateQrMatrix, qrMatrixToSvgPath } from "../qr-code.ts";

describe("QR Code Generation & Matrix Integrity (SIAA-111)", () => {
  it("generates a valid QR matrix matching QRCode standard specification", () => {
    const url = "http://localhost:3000/staff/pos/scanner?session=pos-T1-test1234";
    const matrix = generateQrMatrix(url);
    const expected = QRCode.create(url, { errorCorrectionLevel: "M" });

    assert.ok(matrix.size > 0, "Matrix size must be greater than zero");
    assert.strictEqual(matrix.size, expected.modules.size);
    assert.strictEqual(matrix.modules.length, matrix.size);
    assert.strictEqual(matrix.modules[0].length, matrix.size);

    // Verify 100% module equality with official QRCode engine
    for (let r = 0; r < matrix.size; r++) {
      for (let c = 0; c < matrix.size; c++) {
        assert.strictEqual(
          matrix.modules[r][c],
          Boolean(expected.modules.get(r, c)),
          `Module mismatch at row ${r}, col ${c}`
        );
      }
    }
  });

  it("converts QR matrix to non-empty SVG path data", () => {
    const url = "http://localhost:3000/staff/pos/scanner?session=pos-ADMIN-01-a1b2c3d4";
    const matrix = generateQrMatrix(url);
    const svgPath = qrMatrixToSvgPath(matrix);

    assert.ok(svgPath.length > 0, "SVG path must not be empty");
    assert.ok(svgPath.startsWith("M"), "SVG path must start with M command");
  });

  it("verifies finder patterns in three corners", () => {
    const url = "http://localhost:3000/staff/pos/scanner?session=pos-T1-corner-check";
    const matrix = generateQrMatrix(url);
    const size = matrix.size;

    // Top-left center module must be black (row 3, col 3)
    assert.strictEqual(matrix.modules[3][3], true);
    // Top-right center module must be black (row 3, col size - 4)
    assert.strictEqual(matrix.modules[3][size - 4], true);
    // Bottom-left center module must be black (row size - 4, col 3)
    assert.strictEqual(matrix.modules[size - 4][3], true);
  });

  it("gracefully handles empty input string", () => {
    const matrix = generateQrMatrix("");
    assert.strictEqual(matrix.size, 0);
    assert.strictEqual(matrix.modules.length, 0);
    assert.strictEqual(qrMatrixToSvgPath(matrix), "");
  });
});
