/**
 * Companion Broadcast Dispatcher for POS Scans (SIAA-112)
 */

import { createClient } from "@/lib/supabase/client";
import type { PosScanValidationResponse } from "@/specs/112-pos-realtime-availability-validation/contracts/pos-scan-validation.contract";

/**
 * Broadcasts a scan validation result to the mobile companion phone over Supabase Realtime.
 * Guarantees zero blocking and catches any exceptions so POS terminal operations are unaffected.
 */
export async function broadcastPosScanValidation(
  payload: PosScanValidationResponse,
  pairingCode?: string
): Promise<void> {
  try {
    if (typeof window === "undefined") {
      return;
    }

    const sessionCode = pairingCode?.trim() || "default";
    const supabase = createClient();
    const channelName = sessionCode.startsWith("pos-")
      ? `pos-channel:${sessionCode}`
      : `pos-session:${sessionCode}`;
    const channel = supabase.channel(channelName);

    await channel.send({
      type: "broadcast",
      event: "SCAN_VALIDATION_RESULT",
      payload
    });
  } catch (err) {
    // Non-blocking warning only: network interruptions must not impede counter checkout
    console.warn("[CompanionBroadcast] Supabase Realtime scan broadcast warning:", err);
  }
}
