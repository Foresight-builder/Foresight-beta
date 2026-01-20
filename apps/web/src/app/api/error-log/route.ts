import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase.server";
import { ApiResponses } from "@/lib/apiResponse";
import { checkRateLimit, getIP, RateLimits } from "@/lib/rateLimit";

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - 1)) + "…";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await checkRateLimit(ip || "unknown", RateLimits.moderate, "error_log_post_ip");
    if (!rl.success) {
      return ApiResponses.rateLimit("Too many error logs");
    }
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > 32 * 1024) {
      return ApiResponses.badRequest("Payload too large");
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return ApiResponses.invalidParameters("Invalid payload");
    }

    const raw = body as Record<string, unknown>;
    const error = truncate(String(raw.error || ""), 500) || "Unknown error";
    const stack = truncate(String(raw.stack || ""), 4000) || null;
    const digest = truncate(String(raw.digest || ""), 200) || null;
    const url = truncate(String(raw.url || ""), 800) || null;
    const userAgent = truncate(String(raw.userAgent || ""), 500) || null;
    const componentStack = truncate(String(raw.componentStack || ""), 4000) || null;

    // 在生产环境记录到数据库
    if (process.env.NODE_ENV === "production") {
      const client = supabaseAdmin as any;

      if (client) {
        // 记录到错误日志表（需要先创建此表）
        await (client as any)
          .from("error_logs")
          .insert({
            error_message: error,
            error_stack: stack,
            error_digest: digest,
            url: url,
            user_agent: userAgent,
            component_stack: componentStack,
            created_at: new Date().toISOString(),
          })
          .catch((err: any) => {
            // 如果表不存在，只在控制台记录
            console.error("Error logging to database:", err);
          });
      }
    }

    // 同时输出到控制台
    const logPayload: Record<string, unknown> = {
      error,
      digest,
      url,
      timestamp: new Date().toISOString(),
    };
    if (process.env.NODE_ENV !== "production") {
      logPayload.stack = stack;
      logPayload.userAgent = userAgent;
      logPayload.componentStack = componentStack;
    }
    console.error("Client Error:", logPayload);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const detail = String(e?.message || e);
    console.error("Error in error logging:", e);
    return ApiResponses.internalError("Error in error logging", detail);
  }
}
