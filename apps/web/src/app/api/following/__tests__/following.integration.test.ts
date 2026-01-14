import { describe, it, expect, vi } from "vitest";
import { ApiErrorCode } from "@/types/api";

describe("GET /api/following", () => {
  it("returns INTERNAL_ERROR when supabase is not configured", async () => {
    vi.doMock("@/lib/supabase.server", () => ({
      supabaseAdmin: null,
    }));
    const { GET } = await import("../route");

    const req = new Request("http://localhost:3000/api/following?address=0xabc");
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe(ApiErrorCode.INTERNAL_ERROR);

    vi.resetModules();
  });

  it("returns 400 when address is invalid", async () => {
    vi.doMock("@/lib/supabase.server", () => ({
      supabaseAdmin: {},
    }));
    const { GET } = await import("../route");

    const req = new Request("http://localhost:3000/api/following?address=abc");
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe(ApiErrorCode.VALIDATION_ERROR);

    vi.resetModules();
  });

  it("returns empty array when user follows nothing", async () => {
    vi.doMock("@/lib/supabase.server", () => ({
      supabaseAdmin: {
        from: (table: string) => {
          if (table === "event_follows") {
            return {
              select: () => ({
                eq: () => ({
                  order: async () => ({ data: [], error: null }),
                }),
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      },
    }));

    const { GET } = await import("../route");

    const req = new Request(
      "http://localhost:3000/api/following?address=0xabc0000000000000000000000000000000000000"
    );
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(0);

    vi.resetModules();
  });
});
