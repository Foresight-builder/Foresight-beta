// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { webcrypto } from "crypto";
import { createMockNextRequest } from "@/test/apiTestHelpers";
import { createToken } from "@/lib/jwt";
import { ApiErrorCode } from "@/types/api";

const VIEWER = "0x1234567890123456789012345678901234567890";
const AUTHOR = "0xabc0000000000000000000000000000000000000";
const ADMIN1 = "0x1111111111111111111111111111111111111111";

if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto as any;
}

type RateLimitResult = { success: boolean; remaining: number; resetAt: number };

let rateLimitQueue: RateLimitResult[] = [];
let mockedIp = "127.0.0.1";

let threadRow: any = null;
let commentRow: any = null;
let threadError: any = null;
let commentError: any = null;
let notificationsUpsertError: any = null;
let lastUpsertRows: any[] | null = null;
let lastUpsertOptions: any = null;

function queueRateLimits(...items: RateLimitResult[]) {
  rateLimitQueue = [...items];
}

function resetSupabaseState() {
  threadRow = null;
  commentRow = null;
  threadError = null;
  commentError = null;
  notificationsUpsertError = null;
  lastUpsertRows = null;
  lastUpsertOptions = null;
}

describe("POST /api/forum/report", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("ADMIN_ADDRESSES", "");
    mockedIp = "127.0.0.1";
    queueRateLimits({ success: true, remaining: 4, resetAt: Date.now() + 60_000 });
    resetSupabaseState();
  });

  async function importRoute() {
    vi.doMock("@/lib/rateLimit", () => ({
      RateLimits: {
        strict: { interval: 60 * 1000, limit: 5 },
        moderate: { interval: 60 * 1000, limit: 20 },
        relaxed: { interval: 60 * 1000, limit: 60 },
        lenient: { interval: 60 * 1000, limit: 120 },
      },
      getIP: () => mockedIp,
      checkRateLimit: async () => {
        const next =
          rateLimitQueue.length > 0
            ? rateLimitQueue.shift()!
            : { success: true, remaining: 0, resetAt: Date.now() + 60_000 };
        return next;
      },
    }));

    vi.doMock("@/lib/supabase.server", () => ({
      supabaseAdmin: {
        from: (table: string) => {
          if (table === "forum_threads") {
            const builder: any = {
              select: () => builder,
              eq: () => builder,
              maybeSingle: async () => ({ data: threadRow, error: threadError }),
            };
            return builder;
          }
          if (table === "forum_comments") {
            const builder: any = {
              select: () => builder,
              eq: () => builder,
              maybeSingle: async () => ({ data: commentRow, error: commentError }),
            };
            return builder;
          }
          if (table === "notifications") {
            return {
              upsert: async (rows: any[], options: any) => {
                lastUpsertRows = rows;
                lastUpsertOptions = options;
                return { data: null, error: notificationsUpsertError };
              },
            };
          }
          return {};
        },
      },
    }));

    const mod = await import("../route");
    return mod.POST as (req: any) => Promise<Response>;
  }

  it("返回 429：IP 被限流", async () => {
    queueRateLimits({ success: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const POST = await importRoute();

    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/forum/report",
      headers: { "content-type": "application/json" },
      body: { type: "thread", id: 1, reason: "spam" },
    });

    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ApiErrorCode.RATE_LIMIT);
  });

  it("返回 401：未登录或会话失效", async () => {
    queueRateLimits(
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 },
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 }
    );
    const POST = await importRoute();

    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/forum/report",
      headers: { "content-type": "application/json" },
      body: { type: "thread", id: 1, reason: "spam" },
    });

    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ApiErrorCode.UNAUTHORIZED);
  });

  it("返回 400：type 必填", async () => {
    queueRateLimits(
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 },
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 }
    );
    const POST = await importRoute();

    const sessionToken = await createToken(VIEWER);
    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/forum/report",
      headers: { "content-type": "application/json" },
      body: { id: 1, reason: "spam" },
      cookies: { fs_session: sessionToken },
    });

    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ApiErrorCode.INVALID_PARAMETERS);
    expect(json.error.message).toContain("type");
  });

  it("返回 404：未找到对象（thread）", async () => {
    queueRateLimits(
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 },
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 }
    );
    const POST = await importRoute();
    threadRow = null;

    const sessionToken = await createToken(VIEWER);
    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/forum/report",
      headers: { "content-type": "application/json" },
      body: { type: "thread", id: 123, reason: "spam" },
      cookies: { fs_session: sessionToken },
    });

    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ApiErrorCode.NOT_FOUND);
  });

  it("返回 400：对象数据异常（comment thread_id 无效）", async () => {
    queueRateLimits(
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 },
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 }
    );
    const POST = await importRoute();

    commentRow = {
      id: 9,
      thread_id: 0,
      event_id: 1,
      user_id: AUTHOR,
      content: "A".repeat(200),
      created_at: new Date().toISOString(),
    };
    vi.stubEnv("ADMIN_ADDRESSES", `${ADMIN1}`);

    const sessionToken = await createToken(VIEWER);
    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/forum/report",
      headers: { "content-type": "application/json" },
      body: { type: "comment", id: 9, reason: "spam" },
      cookies: { fs_session: sessionToken },
    });

    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ApiErrorCode.INVALID_PARAMETERS);
  });

  it("写入 notifications，并使用 dedupe_key 去重（comment）", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    queueRateLimits(
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 },
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 }
    );
    const POST = await importRoute();

    commentRow = {
      id: 9,
      thread_id: 77,
      event_id: 1,
      user_id: AUTHOR,
      content: "A".repeat(200),
      created_at: new Date("2026-01-15T11:59:00.000Z").toISOString(),
    };
    vi.stubEnv("ADMIN_ADDRESSES", `${VIEWER},${ADMIN1}`);

    const sessionToken = await createToken(VIEWER);
    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/forum/report",
      headers: { "content-type": "application/json" },
      body: { type: "comment", id: 9, reason: "misinfo" },
      cookies: { fs_session: sessionToken },
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("ok");
    expect(Array.isArray(lastUpsertRows)).toBe(true);
    expect(lastUpsertRows?.length).toBe(1);
    expect(lastUpsertOptions).toEqual({
      onConflict: "recipient_id,dedupe_key",
      ignoreDuplicates: true,
    });

    const row = (lastUpsertRows as any[])[0];
    expect(row.recipient_id).toBe(ADMIN1.toLowerCase());
    expect(row.type).toBe("forum_report");
    expect(String(row.dedupe_key)).toContain("forum_report:comment:9:");
    expect(String(row.dedupe_key)).toContain(":misinfo:2026-01-15");
    expect(typeof row.payload).toBe("object");
    expect(row.payload.type).toBe("comment");
    expect(row.payload.id).toBe(9);
    expect(row.payload.threadId).toBe(77);
    expect(row.payload.reporterId).toBe(VIEWER.toLowerCase());
    expect(row.payload.authorId).toBe(AUTHOR.toLowerCase());
    expect(row.url).toBe("/proposals/77");
  });

  it("返回 400：不能举报自己的内容（thread）", async () => {
    queueRateLimits(
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 },
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 }
    );
    const POST = await importRoute();

    threadRow = {
      id: 11,
      event_id: 0,
      user_id: VIEWER,
      title: "Test",
      content: "C".repeat(80),
      created_at: new Date().toISOString(),
    };

    const sessionToken = await createToken(VIEWER);
    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/forum/report",
      headers: { "content-type": "application/json" },
      body: { type: "thread", id: 11, reason: "spam" },
      cookies: { fs_session: sessionToken },
    });

    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ApiErrorCode.INVALID_PARAMETERS);
    expect(lastUpsertRows).toBe(null);
  });

  it("管理员为空时直接返回 ok（不写入 notifications）", async () => {
    queueRateLimits(
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 },
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 }
    );
    const POST = await importRoute();

    threadRow = {
      id: 12,
      event_id: 0,
      user_id: AUTHOR,
      title: "Test",
      content: "C".repeat(80),
      created_at: new Date().toISOString(),
    };
    vi.stubEnv("ADMIN_ADDRESSES", VIEWER);

    const sessionToken = await createToken(VIEWER);
    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/forum/report",
      headers: { "content-type": "application/json" },
      body: { type: "thread", id: 12, reason: "spam" },
      cookies: { fs_session: sessionToken },
    });

    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toBe("ok");
    expect(lastUpsertRows).toBe(null);
  });

  it("写入 notifications（thread）", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    queueRateLimits(
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 },
      { success: true, remaining: 4, resetAt: Date.now() + 60_000 }
    );
    const POST = await importRoute();

    threadRow = {
      id: 13,
      event_id: 0,
      user_id: AUTHOR,
      title: "T".repeat(120),
      content: "C".repeat(200),
      created_at: new Date("2026-01-15T11:59:00.000Z").toISOString(),
    };
    vi.stubEnv("ADMIN_ADDRESSES", `${ADMIN1}`);

    const sessionToken = await createToken(VIEWER);
    const req = createMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/forum/report",
      headers: { "content-type": "application/json" },
      body: { type: "thread", id: 13, reason: "abuse" },
      cookies: { fs_session: sessionToken },
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("ok");
    expect(Array.isArray(lastUpsertRows)).toBe(true);
    expect(lastUpsertRows?.length).toBe(1);
    const row = (lastUpsertRows as any[])[0];
    expect(row.recipient_id).toBe(ADMIN1.toLowerCase());
    expect(row.type).toBe("forum_report");
    expect(row.url).toBe("/proposals/13");
    expect(String(row.dedupe_key)).toContain("forum_report:thread:13:");
    expect(String(row.dedupe_key)).toContain(":abuse:2026-01-15");
    expect(row.payload.type).toBe("thread");
    expect(row.payload.id).toBe(13);
    expect(row.payload.threadId).toBe(13);
    expect(row.payload.eventId).toBe(0);
  });
});
