import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase.server";
import { ApiResponses } from "@/lib/apiResponse";
import { checkRateLimit, getIP, RateLimits } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await checkRateLimit(ip || "unknown", RateLimits.moderate, "error_log_post_ip");
    if (!rl.success) {
      return ApiResponses.rateLimit("Too many error logs");
    }
    const body = await req.json();

    const { error, stack, digest, url, userAgent, componentStack } = body;

    // 在生产环境记录到数据库
    if (process.env.NODE_ENV === "production") {
      const client = supabaseAdmin as any;

      if (client) {
        // 记录到错误日志表（需要先创建此表）
        await (client as any)
          .from("error_logs")
          .insert({
            error_message: error || "Unknown error",
            error_stack: stack,
            error_digest: digest,
            url,
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
    console.error("Client Error:", {
      error,
      digest,
      url,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const detail = String(e?.message || e);
    console.error("Error in error logging:", e);
    return ApiResponses.internalError("Error in error logging", detail);
  }
}
