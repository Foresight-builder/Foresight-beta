import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, RateLimits, getIP } from "@/lib/rateLimit";
import { ApiResponses } from "@/lib/apiResponse";

function genId() {
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch {}
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}

export async function middleware(req: NextRequest) {
  const reqId = req.headers.get("x-request-id") || genId();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", reqId);

  const url = req.nextUrl.pathname || "";
  const ip = getIP(req);

  if (url.startsWith("/api/siwe/verify")) {
    const rl = await checkRateLimit(ip || "unknown", RateLimits.strict, "mw:siwe-verify:ip");
    if (!rl.success) {
      const res = ApiResponses.rateLimit("请求过于频繁");
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
