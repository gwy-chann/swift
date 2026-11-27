type ScannerEventCallback = (event: string, payload: unknown) => void;

class ScannerHub {
  private listeners = new Map<string, Set<ScannerEventCallback>>();

  subscribe(sessionKey: string, cb: ScannerEventCallback): () => void {
    if (!this.listeners.has(sessionKey)) {
      this.listeners.set(sessionKey, new Set());
    }
    this.listeners.get(sessionKey)!.add(cb);

    return () => {
      const set = this.listeners.get(sessionKey);
      if (set) {
        set.delete(cb);
        if (set.size === 0) {
          this.listeners.delete(sessionKey);
        }
      }
    };
  }

  emit(sessionKey: string, event: string, payload: unknown) {
    const set = this.listeners.get(sessionKey);
    if (set) {
      for (const cb of set) {
        try {
          cb(event, payload);
        } catch {
          // Ignore subscriber failures
        }
      }
    }
  }
}

const globalForHub = globalThis as unknown as { scannerHub?: ScannerHub };
export const scannerHub = globalForHub.scannerHub || new ScannerHub();
if (process.env.NODE_ENV !== "production") {
  globalForHub.scannerHub = scannerHub;
}
