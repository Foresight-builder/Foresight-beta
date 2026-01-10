// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { webcrypto } from "crypto";
import { createMockNextRequest } from "@/test/apiTestHelpers";
import { createToken } from "@/lib/jwt";
import { getEmailOtpShared, type OtpRecord } from "@/lib/serverUtils";

const ADDRESS = "0x1234567890123456789012345678901234567890";
const OTHER_ADDRESS = "0xabc0000000000000000000000000000000000000";

if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto as any;
}

describe("POST /api/email-otp/verify", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    const { store, logs } = getEmailOtpShared();
    store.clear();
    logs.splice(0, logs.length);
    vi.clearAllMocks();
  });

  it("returns 401 when session address mismatch", async () => {
    vi.doMock("@/lib/supabase", () => ({
      supabaseAdmin: {},
    }));
    const { POST } = await import("../route");

    const sessionToken = await createToken(ADDRESS);
    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/email-otp/verify",
      body: {
        walletAddress: OTHER_ADDRESS,
        email: "test@example.com",
        code: "123456",
      },
      cookies: {
        fs_session: sessionToken,
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);

    vi.resetModules();
  });

  it("locks after three wrong attempts when using store fallback", async () => {
    vi.doMock("@/lib/supabase", () => ({
      supabaseAdmin: {},
    }));
    const { POST } = await import("../route");

    const { store } = getEmailOtpShared();
    const email = "test@example.com";
    const storeKey = `${ADDRESS}:${email}`;
    const now = Date.now();
    store.set(storeKey, {
      email,
      address: ADDRESS,
      code: "123456",
      expiresAt: now + 15 * 60_000,
      sentAtList: [],
      failCount: 0,
      lockUntil: 0,
      createdIp: "",
      createdAt: now,
    } satisfies OtpRecord);

    const sessionToken = await createToken(ADDRESS);
    const makeReq = () =>
      createMockNextRequest({
        method: "POST",
        url: "http://localhost:3000/api/email-otp/verify",
        body: {
          walletAddress: ADDRESS,
          email,
          code: "000000",
        },
        cookies: {
          fs_session: sessionToken,
        },
      });

    const r1 = await POST(makeReq());
    const r2 = await POST(makeReq());
    const r3 = await POST(makeReq());

    expect(r1.status).toBe(400);
    expect(r2.status).toBe(400);
    expect(r3.status).toBe(429);

    const rec = store.get(storeKey);
    expect(rec?.failCount).toBe(3);
    expect(typeof rec?.lockUntil).toBe("number");
    expect((rec?.lockUntil || 0) > Date.now()).toBe(true);

    vi.resetModules();
  });

  it("binds email and clears store record on success", async () => {
    const upsertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ upsert: upsertMock }));
    vi.doMock("@/lib/supabase", () => ({
      supabaseAdmin: {
        from: fromMock,
      },
    }));
    const { POST } = await import("../route");

    const { store } = getEmailOtpShared();
    const email = "test@example.com";
    const storeKey = `${ADDRESS}:${email}`;
    const now = Date.now();
    store.set(storeKey, {
      email,
      address: ADDRESS,
      code: "123456",
      expiresAt: now + 15 * 60_000,
      sentAtList: [],
      failCount: 0,
      lockUntil: 0,
      createdIp: "",
      createdAt: now,
    } satisfies OtpRecord);

    const sessionToken = await createToken(ADDRESS);
    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/email-otp/verify",
      body: {
        walletAddress: ADDRESS,
        email,
        code: "123456",
      },
      cookies: {
        fs_session: sessionToken,
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(fromMock).toHaveBeenCalledWith("user_profiles");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(store.has(storeKey)).toBe(false);
    expect(res.headers.get("set-cookie") || "").toContain("fs_email_otp=");

    vi.resetModules();
  });
});
