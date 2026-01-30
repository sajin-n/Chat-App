import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

function createMockRequest(ip = "127.0.0.1"): NextRequest {
  return {
    ip,
    headers: {
      get: (name: string) => (name === "x-real-ip" ? ip : null),
    },
  } as unknown as NextRequest;
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request", () => {
    const req = createMockRequest("1.1.1.1");
    const result = checkRateLimit(req, "default");
    expect(result.allowed).toBe(true);
  });

  it("tracks remaining requests", () => {
    const req = createMockRequest("2.2.2.2");
    
    const first = checkRateLimit(req, "auth");
    expect(first.remaining).toBe(9); // auth limit is 10

    const second = checkRateLimit(req, "auth");
    expect(second.remaining).toBe(8);
  });

  it("blocks after limit exceeded", () => {
    const req = createMockRequest("3.3.3.3");
    
    // Exhaust the auth limit (10 requests)
    for (let i = 0; i < 10; i++) {
      checkRateLimit(req, "auth");
    }
    
    const result = checkRateLimit(req, "auth");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    const req = createMockRequest("4.4.4.4");
    
    // Exhaust limit
    for (let i = 0; i < 10; i++) {
      checkRateLimit(req, "auth");
    }
    
    expect(checkRateLimit(req, "auth").allowed).toBe(false);
    
    // Advance time past window (1 minute)
    vi.advanceTimersByTime(61000);
    
    const result = checkRateLimit(req, "auth");
    expect(result.allowed).toBe(true);
  });

  it("tracks different IPs separately", () => {
    const req1 = createMockRequest("5.5.5.5");
    const req2 = createMockRequest("6.6.6.6");
    
    // Exhaust first IP
    for (let i = 0; i < 10; i++) {
      checkRateLimit(req1, "auth");
    }
    
    expect(checkRateLimit(req1, "auth").allowed).toBe(false);
    expect(checkRateLimit(req2, "auth").allowed).toBe(true);
  });
});
