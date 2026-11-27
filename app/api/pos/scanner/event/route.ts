import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getScannerChannelName } from "@/lib/pos/scanner-session";
import { scannerHub } from "@/lib/pos/scanner-hub";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Cache active server channels by channelName so broadcasts reuse connections
const activeChannels = new Map<string, RealtimeChannel>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionKey, event, payload } = body;

    if (!sessionKey || !event) {
      return NextResponse.json({ error: "Missing sessionKey or event" }, { status: 400 });
    }

    // 1. Instantly dispatch to server-sent events hub for local/desktop subscribers
    scannerHub.emit(sessionKey, event, payload);

    // 2. Also broadcast over Supabase Realtime channel
    const channelName = getScannerChannelName(sessionKey);
    let channel = activeChannels.get(channelName);

    if (!channel) {
      const supabase = createAdminClient();
      channel = supabase.channel(channelName, {
        config: { broadcast: { ack: true } }
      });
      await new Promise<void>((resolve) => {
        channel!.subscribe((status) => {
          if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            resolve();
          }
        });
      });
      activeChannels.set(channelName, channel);
    }

    await channel.send({
      type: "broadcast",
      event,
      payload: payload || {}
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
