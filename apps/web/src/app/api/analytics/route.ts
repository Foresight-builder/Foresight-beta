import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { name, value, rating, delta, id, navigationType, url, timestamp } = body;

    // 在生产环境记录到数据库或发送到分析服务
    if (process.env.NODE_ENV === "production") {
      // 可以发送到 Vercel Analytics, Google Analytics 等
      console.log("Web Vital:", { name, value, rating });

      // 或记录到数据库（需要创建 web_vitals 表）
      const client = getClient();
      if (client) {
        await client
          .from("web_vitals")
          .insert({
            metric_name: name,
            metric_value: value,
            metric_rating: rating,
            metric_delta: delta,
            metric_id: id,
            navigation_type: navigationType,
            page_url: url,
            created_at: new Date(timestamp).toISOString(),
          })
          .catch(() => {
            // 表不存在时静默失败
          });
      }
    } else {
      // 开发环境仅输出到控制台
      console.log(`[Web Vital] ${name}:`, {
        value: Math.round(value),
        rating,
        delta: Math.round(delta),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Analytics error:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
