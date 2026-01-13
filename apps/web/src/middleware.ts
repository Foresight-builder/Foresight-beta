import { NextResponse, type NextRequest } from "next/server";

// 轻量级的ID生成器
function genId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}

// 轻量级的IP获取函数
function getIP(req: NextRequest): string {
  if ("ip" in req && req.ip) return req.ip as string;
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown"
  );
}

// 轻量级的内存限流实现（仅用于中间件）
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const strictRateLimit = { interval: 60 * 1000, limit: 5 };

async function checkRateLimit(identifier: string): Promise<boolean> {
  const now = Date.now();
  const key = `mw:siwe-verify:ip:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + strictRateLimit.interval });
    return true;
  }

  if (entry.count < strictRateLimit.limit) {
    entry.count++;
    return true;
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const reqId = req.headers.get("x-request-id") || genId();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", reqId);

  const url = req.nextUrl.pathname || "";

  if (url.startsWith("/api/siwe/verify")) {
    const ip = getIP(req);
    const isAllowed = await checkRateLimit(ip);
    if (!isAllowed) {
      const res = NextResponse.json(
        {
          success: false,
          error: {
            message: "请求过于频繁",
            code: "RATE_LIMIT",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 429 }
      );
      res.headers.set("x-request-id", reqId);
      return res;
    }
  }

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  res.headers.set("x-request-id", reqId);
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
