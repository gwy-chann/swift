import { NextResponse, type NextRequest } from "next/server";
import { scannerHub } from "@/lib/pos/scanner-hub";

export async function GET(request: NextRequest) {
  const sessionKey = request.nextUrl.searchParams.get("sessionKey");
  if (!sessionKey) {
    return new NextResponse("Missing sessionKey", { status: 400 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send SSE initial connection acknowledgement
  writer.write(encoder.encode(`event: READY\ndata: {"status":"READY"}\n\n`));

  const unsubscribe = scannerHub.subscribe(sessionKey, (event, payload) => {
    try {
      const data = JSON.stringify(payload || {});
      writer.write(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
    } catch {
      // Ignore write error on dropped connection
    }
  });

  request.signal.addEventListener("abort", () => {
    unsubscribe();
    try {
      writer.close();
    } catch {}
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
