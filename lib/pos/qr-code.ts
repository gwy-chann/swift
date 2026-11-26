/**
 * Native Zero-Dependency QR Code Generator (Model 2, Byte Mode)
 * Produces boolean 2D matrices and optimized SVG paths for crisp vector QR rendering.
 */

// GF(256) Math for Reed-Solomon Error Correction (Galois Field with primitive polynomial 0x11D / 285)
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], factor);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCompute(data: Uint8Array, eccLen: number): Uint8Array {
  const gen = rsGeneratorPoly(eccLen);
  const remainder = new Uint8Array(eccLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    for (let j = 0; j < eccLen - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gfMul(gen[eccLen - 1 - j], factor);
    }
    remainder[eccLen - 1] = gfMul(gen[0], factor);
  }
  return remainder;
}

// Version table parameters for Byte Mode at ECC Level M
// version, size, dataCodewords, eccCodewordsPerBlock, numBlocks
interface VersionSpec {
  version: number;
  size: number;
  dataCapacity: number;
  totalCodewords: number;
  eccPerBlock: number;
  blocks: number;
  alignmentPatterns: number[];
}

const VERSION_SPECS: VersionSpec[] = [
  { version: 1, size: 21, dataCapacity: 14, totalCodewords: 26, eccPerBlock: 10, blocks: 1, alignmentPatterns: [] },
  { version: 2, size: 25, dataCapacity: 26, totalCodewords: 44, eccPerBlock: 16, blocks: 1, alignmentPatterns: [6, 18] },
  { version: 3, size: 29, dataCapacity: 42, totalCodewords: 70, eccPerBlock: 26, blocks: 1, alignmentPatterns: [6, 22] },
  { version: 4, size: 33, dataCapacity: 62, totalCodewords: 100, eccPerBlock: 18, blocks: 2, alignmentPatterns: [6, 26] },
  { version: 5, size: 37, dataCapacity: 84, totalCodewords: 134, eccPerBlock: 24, blocks: 2, alignmentPatterns: [6, 30] },
  { version: 6, size: 41, dataCapacity: 106, totalCodewords: 172, eccPerBlock: 16, blocks: 4, alignmentPatterns: [6, 34] }
];

export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

/**
 * Encodes text into a QR code boolean matrix (ECC Level M).
 */
export function generateQrMatrix(text: string): QrMatrix {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const textLen = textBytes.length;

  // Find lowest version that can hold textLen bytes
  const spec = VERSION_SPECS.find((s) => s.dataCapacity >= textLen + 3);
  if (!spec) {
    throw new Error(`Text too long for QR encoder (${textLen} bytes)`);
  }

  const { size, dataCapacity, totalCodewords, eccPerBlock, blocks, alignmentPatterns } = spec;

  // 1. Bit buffer construction (Byte Mode: indicator 0100, 8-bit length, data, terminator)
  const bitArray: number[] = [];
  function pushBits(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      bitArray.push((val >>> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(textLen, spec.version >= 10 ? 16 : 8); // Character count indicator
  for (let i = 0; i < textLen; i++) {
    pushBits(textBytes[i], 8);
  }

  // Terminator (up to 4 zeroes)
  const maxBits = dataCapacity * 8;
  const termLen = Math.min(4, maxBits - bitArray.length);
  for (let i = 0; i < termLen; i++) bitArray.push(0);

  // Pad to byte boundary
  while (bitArray.length % 8 !== 0) bitArray.push(0);

  // Convert bits to data bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < bitArray.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bitArray[i + j];
    }
    dataBytes.push(byte);
  }

  // Pad with 0xEC, 0x11 up to dataCapacity
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataBytes.length < dataCapacity) {
    dataBytes.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  // 2. Compute Reed-Solomon Error Correction Codewords per block
  const blockDataLen = Math.floor(dataCapacity / blocks);
  const blockDataList: Uint8Array[] = [];
  const blockEccList: Uint8Array[] = [];

  for (let b = 0; b < blocks; b++) {
    const start = b * blockDataLen;
    const end = b === blocks - 1 ? dataCapacity : (b + 1) * blockDataLen;
    const bData = new Uint8Array(dataBytes.slice(start, end));
    blockDataList.push(bData);
    blockEccList.push(rsCompute(bData, eccPerBlock));
  }

  // 3. Interleave data and ECC codewords
  const finalCodewords: number[] = [];
  const maxBlockLen = Math.max(...blockDataList.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < blocks; b++) {
      if (i < blockDataList[b].length) {
        finalCodewords.push(blockDataList[b][i]);
      }
    }
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (let b = 0; b < blocks; b++) {
      finalCodewords.push(blockEccList[b][i]);
    }
  }

  // 4. Initialize module matrix & reserved flags
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(r: number, c: number, val: boolean) {
    modules[r][c] = val;
    isFunction[r][c] = true;
  }

  // Finder Patterns (3 corners: Top-Left, Top-Right, Bottom-Left)
  function drawFinderPattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const isBlack =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        setFunction(nr, nc, isBlack);
      }
    }
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // Alignment patterns
  if (alignmentPatterns.length > 0) {
    for (const r of alignmentPatterns) {
      for (const c of alignmentPatterns) {
        if (isFunction[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack =
              Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setFunction(r + dr, c + dc, isBlack);
          }
        }
      }
    }
  }

  // Timing patterns (Row 6 and Col 6)
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunction(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setFunction(i, 6, i % 2 === 0);
  }

  // Dark module
  setFunction(4 * spec.version + 9, 8, true);

  // Reserve format information regions
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
  }

  // 5. Place Data Codewords (zigzag traversal)
  const allBits: number[] = [];
  for (const byte of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((byte >>> i) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing pattern
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Apply Standard Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          modules[r][c] = (bit === 1) !== mask;
        }
      }
    }
    upward = !upward;
  }

  // 6. Format information (ECC Level M = 00, Mask 000 = 000 ➔ 00000 ➔ with BCH: 101010000010010 ^ 101010000010010)
  // Mask pattern 0 (000) with Level M (00) gives format code 0x5370 (BCH code 101001101110000 masked with 0x5412 = 0x0762)
  const formatInfo = 0x5370 ^ 0x5412; // 0x0762
  for (let i = 0; i < 15; i++) {
    const bit = ((formatInfo >>> i) & 1) === 1;
    // Top-left placement
    if (i <= 5) modules[8][i] = bit;
    else if (i === 6) modules[8][7] = bit;
    else if (i === 7) modules[8][8] = bit;
    else if (i === 8) modules[7][8] = bit;
    else modules[14 - i][8] = bit;

    // Split placement (top-right and bottom-left)
    if (i < 8) modules[size - 1 - i][8] = bit;
    else modules[8][size - 15 + i] = bit;
  }

  return { size, modules };
}

/**
 * Converts a QR matrix into an optimized SVG path data string.
 */
export function qrMatrixToSvgPath(matrix: QrMatrix): string {
  const { size, modules } = matrix;
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
