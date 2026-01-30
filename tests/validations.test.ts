import { describe, it, expect } from "vitest";
import { registerSchema, sendMessageSchema, paginationSchema } from "@/lib/validations";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short username", () => {
    const result = registerSchema.safeParse({
      username: "ab",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "invalid",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "test@example.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejects username with special characters", () => {
    const result = registerSchema.safeParse({
      username: "test@user",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("sendMessageSchema", () => {
  it("accepts valid message", () => {
    const result = sendMessageSchema.safeParse({
      content: "Hello world",
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with clientId", () => {
    const result = sendMessageSchema.safeParse({
      content: "Hello world",
      clientId: "abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    const result = sendMessageSchema.safeParse({
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message over 2000 chars", () => {
    const result = sendMessageSchema.safeParse({
      content: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("accepts valid pagination", () => {
    const result = paginationSchema.safeParse({
      limit: 25,
      cursor: "abc123",
    });
    expect(result.success).toBe(true);
  });

  it("uses default limit", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("coerces string limit to number", () => {
    const result = paginationSchema.safeParse({
      limit: "25",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
    }
  });

  it("rejects limit over 100", () => {
    const result = paginationSchema.safeParse({
      limit: 101,
    });
    expect(result.success).toBe(false);
  });
});
