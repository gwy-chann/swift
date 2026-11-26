"use client";

import React, { useMemo } from "react";
import { generateQrMatrix, qrMatrixToSvgPath } from "@/lib/pos/qr-code";

export interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
  quietZone?: number;
  fgColor?: string;
  bgColor?: string;
}

/**
 * High-performance, zero-dependency SVG QR Code Component.
 * Renders vector QR matrices with crisp rendering and configurable quiet zone.
 */
export function QrCodeSvg({
  value,
  size = 220,
  className = "",
  quietZone = 2,
  fgColor = "#000000",
  bgColor = "#ffffff"
}: QrCodeSvgProps) {
  const { pathData, viewBoxSize } = useMemo(() => {
    if (!value || typeof value !== "string") {
      return { pathData: "", viewBoxSize: 21 };
    }
    try {
      const matrix = generateQrMatrix(value);
      const rawPath = qrMatrixToSvgPath(matrix);
      return {
        pathData: rawPath,
        viewBoxSize: matrix.size + quietZone * 2
      };
    } catch (err) {
      console.error("[QrCodeSvg] Failed to generate QR matrix:", err);
      return { pathData: "", viewBoxSize: 21 };
    }
  }, [value, quietZone]);

  if (!pathData) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-elevated text-text-muted text-xs ${className}`}
        style={{ width: size, height: size }}
      >
        <span>Unable to generate QR</span>
      </div>
    );
  }

  return (
    <svg
      role="img"
      aria-label={`QR Code for ${value}`}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      className={`select-none shrink-0 ${className}`}
      shapeRendering="crispEdges"
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill={bgColor} rx={4} />
      <g transform={`translate(${quietZone}, ${quietZone})`}>
        <path d={pathData} fill={fgColor} />
      </g>
    </svg>
  );
}
