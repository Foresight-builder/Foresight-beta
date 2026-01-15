import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { ApiResponses } from "@/lib/apiResponse";
import { supabaseAdmin } from "@/lib/supabase.server";
import {
  getSessionAddress,
  logApiError,
  normalizeAddress,
  parseRequestBody,
} from "@/lib/serverUtils";
import { checkRateLimit, getIP, RateLimits } from "@/lib/rateLimit";

function parseAdminRecipients(): string[] {
  const raw = String(process.env.ADMIN_ADDRESSES || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const normalized = raw.map((x) => normalizeAddress(x)).filter((x) => /^0x[a-f0-9]{40}$/.test(x));
  return Array.from(new Set(normalized));
}

function normalizeReason(raw: unknown): "spam" | "abuse" | "misinfo" | "other" {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "spam" || v === "abuse" || v === "misinfo") return v;
  return "other";
}

function normalizeReportType(raw: unknown): "thread" | "comment" | null {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "thread" || v === "comment") return v;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await checkRateLimit(ip || "unknown", RateLimits.strict, "forum_report_ip");
    if (!rl.success) return ApiResponses.rateLimit("举报过于频繁，请稍后再试");

    const viewerRaw = await getSessionAddress(req);
    const viewer = normalizeAddress(String(viewerRaw || ""));
    if (!/^0x[a-f0-9]{40}$/.test(viewer)) return ApiResponses.unauthorized("未登录或会话失效");

    const rlUser = await checkRateLimit(viewer, RateLimits.strict, "forum_report_user");
    if (!rlUser.success) return ApiResponses.rateLimit("举报过于频繁，请稍后再试");

    const body = await parseRequestBody(req);
    const reportType = normalizeReportType(body?.type);
    if (!reportType) return ApiResponses.invalidParameters("type 必填");

    const idNum = Number(body?.id);
    const contentId =
      Number.isFinite(idNum) && idNum > 0 ? Math.floor(idNum) : (null as number | null);
    if (!contentId) return ApiResponses.invalidParameters("id 必填");

    const reason = normalizeReason(body?.reason);

    const rlContent = await checkRateLimit(
      `${reportType}:${contentId}:${viewer}:${reason}`,
      { interval: 30 * 1000, limit: 1 },
      "forum_report_content"
    );
    if (!rlContent.success) return ApiResponses.rateLimit("举报过于频繁，请稍后再试");

    const client = supabaseAdmin;
    if (!client) return ApiResponses.internalError("Supabase 未配置");

    let row:
      | (Pick<
          Database["public"]["Tables"]["forum_threads"]["Row"],
          "id" | "event_id" | "user_id" | "title" | "content" | "created_at"
        > & { thread_id: number })
      | (Pick<
          Database["public"]["Tables"]["forum_comments"]["Row"],
          "id" | "event_id" | "thread_id" | "user_id" | "content" | "created_at"
        > & { title: string | null })
      | null = null;

    if (reportType === "thread") {
      const { data, error } = await (client as any)
        .from("forum_threads")
        .select("id,event_id,user_id,title,content,created_at")
        .eq("id", contentId)
        .maybeSingle();
      if (error) return ApiResponses.databaseError("查询失败", error.message);
      if (!data) return ApiResponses.notFound("未找到对象");
      row = { ...(data as any), thread_id: Number((data as any)?.id || 0) };
    } else {
      const { data, error } = await (client as any)
        .from("forum_comments")
        .select("id,event_id,thread_id,user_id,content,created_at")
        .eq("id", contentId)
        .maybeSingle();
      if (error) return ApiResponses.databaseError("查询失败", error.message);
      if (!data) return ApiResponses.notFound("未找到对象");
      row = { ...(data as any), title: null };
    }

    if (!row) return ApiResponses.notFound("未找到对象");

    if (normalizeAddress(String((row as any).user_id || "")) === viewer) {
      return ApiResponses.invalidParameters("不能举报自己的内容");
    }

    const recipients = parseAdminRecipients().filter((x) => x !== viewer);
    if (recipients.length === 0) {
      if (process.env.NODE_ENV === "production") {
        return ApiResponses.internalError("管理员未配置");
      }
      return NextResponse.json({ message: "ok" }, { status: 200 });
    }

    const threadId = reportType === "thread" ? contentId : Number((row as any).thread_id || 0);
    if (!Number.isFinite(threadId) || threadId <= 0) {
      return ApiResponses.invalidParameters("对象数据异常");
    }
    const url = `/proposals/${threadId}`;
    const previewSource =
      reportType === "thread"
        ? String((row as any).title || "")
        : String((row as any).content || "");
    const preview = previewSource.trim().slice(0, 80);

    const dayKey = new Date().toISOString().slice(0, 10);
    const dedupeKey = `forum_report:${reportType}:${contentId}:${viewer}:${reason}:${dayKey}`;

    const payloadBase = {
      type: reportType,
      id: contentId,
      threadId,
      eventId: Number((row as any).event_id || 0),
      reason,
      reporterId: viewer,
      authorId: normalizeAddress(String((row as any).user_id || "")),
      createdAt: String((row as any).created_at || ""),
      preview,
    };

    const title = reportType === "thread" ? "提案举报" : "评论举报";
    const message = preview ? `原因：${reason} · "${preview}"` : `原因：${reason}`;

    const insertRows: Database["public"]["Tables"]["notifications"]["Insert"][] = recipients.map(
      (r) => ({
        recipient_id: r,
        type: "forum_report",
        title,
        message,
        url,
        payload: payloadBase as any,
        actor_id: viewer,
        dedupe_key: dedupeKey,
      })
    );

    const { error: nErr } = await (client as any)
      .from("notifications")
      .upsert(insertRows as any, { onConflict: "recipient_id,dedupe_key", ignoreDuplicates: true });
    if (nErr) return ApiResponses.databaseError("举报失败", nErr.message);

    return NextResponse.json({ message: "ok" }, { status: 200 });
  } catch (e: unknown) {
    logApiError("POST /api/forum/report unhandled error", e);
    const detail = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError(
      "举报失败",
      process.env.NODE_ENV === "development" ? detail : undefined
    );
  }
}
