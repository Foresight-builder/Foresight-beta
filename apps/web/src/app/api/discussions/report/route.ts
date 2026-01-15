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

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await checkRateLimit(ip || "unknown", RateLimits.strict, "discussion_report_ip");
    if (!rl.success) return ApiResponses.rateLimit("举报过于频繁，请稍后再试");

    const viewerRaw = await getSessionAddress(req);
    const viewer = normalizeAddress(String(viewerRaw || ""));
    if (!/^0x[a-f0-9]{40}$/.test(viewer)) return ApiResponses.unauthorized("未登录或会话失效");

    const rlUser = await checkRateLimit(viewer, RateLimits.strict, "discussion_report_user");
    if (!rlUser.success) return ApiResponses.rateLimit("举报过于频繁，请稍后再试");

    const body = await parseRequestBody(req);
    const idNum = Number(body?.discussionId);
    const discussionId =
      Number.isFinite(idNum) && idNum > 0 ? Math.floor(idNum) : (null as number | null);
    if (!discussionId) return ApiResponses.invalidParameters("discussionId 必填");

    const reason = normalizeReason(body?.reason);

    const rlContent = await checkRateLimit(
      `${discussionId}:${viewer}:${reason}`,
      { interval: 30 * 1000, limit: 1 },
      "discussion_report_content"
    );
    if (!rlContent.success) return ApiResponses.rateLimit("举报过于频繁，请稍后再试");

    const client = supabaseAdmin;
    if (!client) return ApiResponses.internalError("Supabase 未配置");

    type DiscussionRow = Pick<
      Database["public"]["Tables"]["discussions"]["Row"],
      "id" | "proposal_id" | "user_id" | "content" | "created_at"
    >;

    const { data: d, error: dErr } = await (client as any)
      .from("discussions")
      .select("id,proposal_id,user_id,content,created_at")
      .eq("id", discussionId)
      .maybeSingle();
    if (dErr) return ApiResponses.databaseError("查询失败", dErr.message);
    if (!d) return ApiResponses.notFound("未找到对象");

    const row = d as DiscussionRow;
    if (normalizeAddress(String(row.user_id || "")) === viewer) {
      return ApiResponses.invalidParameters("不能举报自己的内容");
    }

    const proposalId = Number(row.proposal_id || 0);
    if (!Number.isFinite(proposalId) || proposalId <= 0) {
      return ApiResponses.invalidParameters("proposal_id 无效");
    }

    const recipients = parseAdminRecipients().filter((x) => x !== viewer);
    if (recipients.length === 0) {
      return NextResponse.json({ message: "ok" }, { status: 200 });
    }

    const dayKey = new Date().toISOString().slice(0, 10);
    const dedupeKey = `discussion_report:${discussionId}:${viewer}:${reason}:${dayKey}`;
    const preview = String(row.content || "")
      .trim()
      .slice(0, 80);
    const url = `/proposals/${proposalId}`;

    const payloadBase = {
      discussionId,
      proposalId,
      reason,
      reporterId: viewer,
      authorId: normalizeAddress(String(row.user_id || "")),
      createdAt: String(row.created_at || ""),
      preview,
    };

    const insertRows: Database["public"]["Tables"]["notifications"]["Insert"][] = recipients.map(
      (r) => ({
        recipient_id: r,
        type: "discussion_report",
        title: "讨论举报",
        message: preview ? `原因：${reason} · "${preview}"` : `原因：${reason}`,
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
    logApiError("POST /api/discussions/report unhandled error", e);
    const detail = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError(
      "举报失败",
      process.env.NODE_ENV === "development" ? detail : undefined
    );
  }
}
