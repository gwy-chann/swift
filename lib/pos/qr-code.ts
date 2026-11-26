/**
 * Standard ISO/IEC 18004 Compliant QR Code Generator
 * Uses battle-tested QRCode engine to produce validated matrices and optimized SVG paths.
 */

import QRCode from "qrcode";

export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

/**
 * Encodes text into a standard QR code boolean matrix (ECC Level M).
 * Guaranteed standard compliance for iOS Camera, Android Google Lens, and ZXing readers.
 */
export function generateQrMatrix(text: string): QrMatrix {
  if (!text || typeof text !== "string") {
    return { size: 0, modules: [] };
  }

  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const modules: boolean[][] = [];

  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(Boolean(qr.modules.get(r, c)));
    }
    modules.push(row);
  }

  return { size, modules };
}

/**
 * Converts a QR matrix into an optimized SVG path data string.
 */
export function qrMatrixToSvgPath(matrix: QrMatrix): string {
  const { size, modules } = matrix;
  if (!size || !modules || modules.length === 0) return "";

  let d = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        d += `M${c},${r}h1v1h-1z `;
      }
    }
  }
  return d.trim();
}
