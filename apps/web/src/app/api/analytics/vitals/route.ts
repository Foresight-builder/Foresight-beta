import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Web Vitals 数据收集 API
 * 
 * 接收前端发送的性能指标并存储到数据库
 */
export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();

    const client = getClient();
    if (!client) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // 存储到性能监控表
    const { error } = await client.from("performance_metrics").insert({
      metric_id: metric.id,
      metric_name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigation_type: metric.navigationType,
      url: metric.url,
      user_agent: metric.userAgent,
      device_type: metric.deviceType,
      created_at: new Date(metric.timestamp).toISOString(),
    });

    if (error) {
      console.error("Failed to store performance metric:", error);
      return NextResponse.json({ error: "Failed to store metric" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Analytics vitals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * 获取性能统计数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");
    const metricName = searchParams.get("metric");

    const client = getClient();
    if (!client) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // 计算时间范围
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = client
      .from("performance_metrics")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (metricName) {
      query = query.eq("metric_name", metricName);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch performance metrics:", error);
      return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
    }

    // 计算统计数据
    const stats = calculateStats(data || []);

    return NextResponse.json({
      success: true,
      data,
      stats,
    }, { status: 200 });
  } catch (error) {
    console.error("Analytics vitals GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function calculateStats(metrics: any[]) {
  if (metrics.length === 0) {
    return {};
  }

  const grouped: Record<string, any[]> = {};
  metrics.forEach((m) => {
    if (!grouped[m.metric_name]) {
      grouped[m.metric_name] = [];
    }
    grouped[m.metric_name].push(m);
  });

  const stats: Record<string, any> = {};
  Object.keys(grouped).forEach((name) => {
    const values = grouped[name].map((m) => m.value);
    const ratings = grouped[name].map((m) => m.rating);

    stats[name] = {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p50: percentile(values, 0.5),
      p75: percentile(values, 0.75),
      p95: percentile(values, 0.95),
      good: ratings.filter((r) => r === "good").length,
      needsImprovement: ratings.filter((r) => r === "needs-improvement").length,
      poor: ratings.filter((r) => r === "poor").length,
    };
  });

  return stats;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

