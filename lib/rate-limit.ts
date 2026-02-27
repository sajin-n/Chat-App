import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Use a Map for better performance + bounded size
const store = new Map<string, RateLimitEntry>();

// Hard cap to prevent memory exhaustion under heavy load
const MAX_STORE_SIZE = 10000;

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS: Record<string, number> = {
  auth: 10,
  message: 30,
  default: 60,
  search: 20,
  blog: 20,
  report: 5,
};

function getKey(ip: string, type: string): string {
  return `${type}:${ip}`;
}

// Periodic cleanup runs at most once per 30 seconds
let lastCleanup = 0;
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 30_000) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  req: NextRequest,
  type: "auth" | "message" | "default" | "search" | "blog" | "report" = "default"
): { allowed: boolean; remaining: number; resetIn: number } {
  // Prefer x-real-ip (set by trusted reverse proxy) over x-forwarded-for (spoofable)
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = getKey(ip, type);
  const now = Date.now();
  const limit = MAX_REQUESTS[type] ?? MAX_REQUESTS.default;

  cleanup();

  const existing = store.get(key);

  if (!existing || existing.resetTime < now) {
    // Evict oldest entries if store is too large
    if (store.size >= MAX_STORE_SIZE) {
      const firstKey = store.keys().next().value;
      if (firstKey) store.delete(firstKey);
    }
    store.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetIn: WINDOW_MS };
  }

  existing.count++;
  const remaining = Math.max(0, limit - existing.count);
  const resetIn = existing.resetTime - now;

  return {
    allowed: existing.count <= limit,
    remaining,
    resetIn,
  };
}

export function rateLimitResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": Math.ceil(resetIn / 1000).toString(),
      },
    }
  );
}
