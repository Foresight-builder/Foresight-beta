import { NextResponse } from "next/server";
import { getClient, supabaseAdmin } from "@/lib/supabase";
import { parseRequestBody, logApiError } from "@/lib/serverUtils";
import { normalizeId } from "@/lib/ids";
import { ApiResponses } from "@/lib/apiResponse";
import { normalizeCategory } from "@/features/trending/trendingModel";

// 论坛数据可以短暂缓存
export const revalidate = 30; // 30秒缓存

function actionLabel(v: string): string {
  const s = String(v || "");
  if (s === "价格达到") return "价格是否会达到";
  if (s === "将会发生") return "是否将会发生";
  if (s === "将会赢得") return "是否将会赢得";
  return s;
}

async function maybeAutoCreatePrediction(
  client: any,
  eventId: number,
  threads: any[],
  comments: any[]
) {
  const byThread: Record<string, { comments: number; participants: Set<string> }> = {};
  threads.forEach((t) => {
    byThread[String(t.id)] = { comments: 0, participants: new Set([String(t.user_id || "")]) };
  });
  comments.forEach((c) => {
    const k = String(c.thread_id);
    if (!byThread[k]) byThread[k] = { comments: 0, participants: new Set() };
    byThread[k].comments += 1;
    if (c.user_id) byThread[k].participants.add(String(c.user_id));
  });
  const calc = (t: any) => {
    const m = byThread[String(t.id)] || { comments: 0, participants: new Set<string>() };
    const score =
      Number(t.upvotes || 0) * 2 +
      Number(t.downvotes || 0) * 0 +
      Number(m.comments || 0) +
      Number((m.participants || new Set()).size || 0);
    return { id: Number(t.id), score };
  };
  const ranked = threads.map(calc).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top) return;
  const now = Date.now();
  const { data: topRow } = await client
    .from("forum_threads")
    .select("*")
    .eq("id", top.id)
    .maybeSingle();
  const { data: others } = await client
    .from("forum_threads")
    .select("id")
    .eq("event_id", eventId)
    .neq("id", top.id);
  const topSince = topRow?.hot_since ? new Date(topRow.hot_since).getTime() : 0;
  if (!topSince)
    await client
      .from("forum_threads")
      .update({ hot_since: new Date().toISOString() })
      .eq("id", top.id);
  if (others && others.length)
    await client
      .from("forum_threads")
      .update({ hot_since: null })
      .in(
        "id",
        (others as any[]).map((x) => x.id)
      );
  const thresholdMs = 60 * 1000;
  const ok = topSince && now - topSince >= thresholdMs;
  if (!ok) return;
  const reviewStatus = String(topRow?.review_status || "");
  if (reviewStatus && reviewStatus !== "approved") return;
  if (Number(topRow?.created_prediction_id || 0) > 0) return;
  const subj = String(topRow?.subject_name || "");
  const verb = String(topRow?.action_verb || "");
  const target = String(topRow?.target_value || "");
  const cat = String(topRow?.category || "科技");
  const deadline = topRow?.deadline
    ? new Date(topRow.deadline).toISOString()
    : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const titlePreview = String(topRow?.title_preview || "");
  const criteriaPreview = String(topRow?.criteria_preview || "");
  const eventTitle = `${subj}${actionLabel(verb)}${target}`;
  const seed = (eventTitle || "prediction").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const imageUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&size=400&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=20`;
  const { data: pred, error } = await client
    .from("predictions")
    .insert({
      title: eventTitle,
      description: titlePreview || eventTitle,
      category: cat || "其他",
      deadline,
      min_stake: 0.1,
      criteria: criteriaPreview || "以客观可验证来源为准，截止前满足条件视为达成",
      image_url: imageUrl,
      reference_url: "",
      status: "active",
    })
    .select()
    .maybeSingle();
  if (error) return;
  if (pred?.id)
    await client
      .from("forum_threads")
      .update({ created_prediction_id: Number(pred.id) })
      .eq("id", top.id);
}

// GET /api/forum?eventId=1
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = normalizeId(searchParams.get("eventId"));
  if (eventId === null) {
    return ApiResponses.invalidParameters("eventId 必填");
  }
  try {
    const client = getClient();
    if (!client) {
      return ApiResponses.internalError("Supabase 未配置");
    }
    const { data: threads, error: tErr } = await client
      .from("forum_threads")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (tErr) {
      logApiError("GET /api/forum query threads failed", tErr);
      return ApiResponses.databaseError("查询主题失败", tErr.message);
    }
    const ids = (threads || []).map((t: any) => t.id);
    let commentsByThread: Record<string, any[]> = {};
    let commentsArr: any[] = [];
    if (ids.length > 0) {
      const { data: comments, error: cErr } = await client
        .from("forum_comments")
        .select("*")
        .in("thread_id", ids)
        .order("created_at", { ascending: true });
      if (cErr) {
        logApiError("GET /api/forum query comments failed", cErr);
        return ApiResponses.databaseError("查询评论失败", cErr.message);
      }
      commentsArr = comments || [];
      commentsArr.forEach((c: any) => {
        const k = String(c.thread_id);
        (commentsByThread[k] = commentsByThread[k] || []).push(c);
      });
    }
    await maybeAutoCreatePrediction(client, eventId, threads || [], commentsArr);
    const merged = (threads || []).map((t: any) => ({
      id: Number(t.id),
      event_id: Number(t.event_id),
      title: String(t.title || ""),
      content: String(t.content || ""),
      user_id: String(t.user_id || ""),
      created_at: String(t.created_at || ""),
      upvotes: Number(t.upvotes || 0),
      downvotes: Number(t.downvotes || 0),
      category: t.category ? normalizeCategory(String(t.category)) : undefined,
      created_prediction_id:
        t.created_prediction_id == null ? null : Number(t.created_prediction_id),
      review_status: String(t.review_status || "pending_review"),
      comments: (commentsByThread[String(t.id)] || []).map((c: any) => ({
        id: Number(c.id),
        thread_id: Number(c.thread_id),
        event_id: Number(c.event_id),
        user_id: String(c.user_id || ""),
        content: String(c.content || ""),
        created_at: String(c.created_at || ""),
        upvotes: Number(c.upvotes || 0),
        downvotes: Number(c.downvotes || 0),
        parent_id: c.parent_id == null ? null : Number(c.parent_id),
      })),
    }));
    return NextResponse.json({ threads: merged }, { status: 200 });
  } catch (e: any) {
    logApiError("GET /api/forum unhandled error", e);
    const detail = String(e?.message || e);
    return ApiResponses.internalError("查询失败", detail);
  }
}

// POST /api/forum  body: { eventId, title, content, walletAddress }
export async function POST(req: Request) {
  try {
    const body = await parseRequestBody(req);
    const eventId = normalizeId(body?.eventId);
    const title = String(body?.title || "");
    const content = String(body?.content || "");
    const walletAddress = String(body?.walletAddress || "");
    if (eventId === null || !title.trim()) {
      return ApiResponses.invalidParameters("eventId、title 必填");
    }
    const client = (supabaseAdmin || getClient()) as any;
    if (!client) {
      return ApiResponses.internalError("Supabase 未配置");
    }
    const subject_name = String(body?.subjectName || "");
    const action_verb = String(body?.actionVerb || "");
    const target_value = String(body?.targetValue || "");
    const categoryRaw = String(body?.category || "");
    const category = categoryRaw ? normalizeCategory(categoryRaw) : "";
    const deadline = body?.deadline ? new Date(String(body.deadline)).toISOString() : null;
    const title_preview = String(body?.titlePreview || "");
    const criteria_preview = String(body?.criteriaPreview || "");
    const { data, error } = await client
      .from("forum_threads")
      .insert({
        event_id: eventId,
        title,
        content,
        user_id: walletAddress || "guest",
        subject_name,
        action_verb,
        target_value,
        category,
        deadline,
        title_preview,
        criteria_preview,
      })
      .select()
      .maybeSingle();
    if (error) {
      logApiError("POST /api/forum insert thread failed", error);
      return ApiResponses.databaseError("创建失败", error.message);
    }
    return NextResponse.json({ message: "ok", data }, { status: 200 });
  } catch (e: any) {
    logApiError("POST /api/forum unhandled error", e);
    const detail = String(e?.message || e);
    return ApiResponses.internalError("创建失败", detail);
  }
}
