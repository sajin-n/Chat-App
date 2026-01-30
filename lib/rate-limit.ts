import { NextRequest, NextResponse } from "next/server";

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS: Record<string, number> = {
  auth: 10,
  message: 30,
  default: 60,
};

function getKey(ip: string, type: string): string {
  return `${type}:${ip}`;
}

function cleanup() {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

export function checkRateLimit(
  req: NextRequest,
  type: "auth" | "message" | "default" = "default"
): { allowed: boolean; remaining: number; resetIn: number } {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const key = getKey(ip, type);
  const now = Date.now();
  const limit = MAX_REQUESTS[type];

  cleanup();

  if (!store[key] || store[key].resetTime < now) {
    store[key] = { count: 1, resetTime: now + WINDOW_MS };
    return { allowed: true, remaining: limit - 1, resetIn: WINDOW_MS };
  }

  store[key].count++;
  const remaining = Math.max(0, limit - store[key].count);
  const resetIn = store[key].resetTime - now;

  return {
    allowed: store[key].count <= limit,
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
