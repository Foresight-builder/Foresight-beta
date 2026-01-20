// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createMockNextRequest } from "@/test/apiTestHelpers";

vi.mock("@/lib/serverUtils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/serverUtils")>("@/lib/serverUtils");
  return {
    ...actual,
    getSessionAddress: vi.fn().mockResolvedValue(""),
    normalizeAddress: (addr: string) => String(addr || "").toLowerCase(),
    logApiError: vi.fn(),
  };
});

describe("GET /api/deposits/history", () => {
  it("returns 401 when session is missing", async () => {
    const { GET } = await import("../route");
    const req = createMockNextRequest({
      method: "GET",
      url: "http://localhost:3000/api/deposits/history",
    });
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });
});
