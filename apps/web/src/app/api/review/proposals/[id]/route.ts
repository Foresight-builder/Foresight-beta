import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";
import { Database } from "@/lib/database.types";

async function getReviewerSession() {
  const client = getClient();
  if (!client)
    return { ok: false as const, reason: "no_client" as const, userId: null as string | null };
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session || !session.user)
    return { ok: false as const, reason: "unauthorized" as const, userId: null as string | null };
  const userId = session.user.id;
  const { data: profile } = await (client as any)
    .from("user_profiles")
    .select("is_admin,is_reviewer")
    .eq("wallet_address", (session.user as any).user_metadata?.wallet_address || "")
    .maybeSingle();
  const isAdmin = !!(profile as any)?.is_admin;
  const isReviewer = !!(profile as any)?.is_reviewer;
  if (!isAdmin && !isReviewer)
    return { ok: false as const, reason: "forbidden" as const, userId: null as string | null };
  return { ok: true as const, reason: "ok" as const, userId };
}

type ForumThreadRow = Database["public"]["Tables"]["forum_threads"]["Row"];

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getReviewerSession();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.reason },
      { status: auth.reason === "unauthorized" ? 401 : 403 }
    );
  }
  const client = getClient();
  if (!client) return NextResponse.json({ message: "Supabase not configured" }, { status: 500 });
  const { id } = await ctx.params;
  const threadId = Number(id);
  if (!Number.isFinite(threadId)) {
    return NextResponse.json({ message: "invalid_id" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const reason = String(body.reason || "");
  const patch = body.patch || {};
  if (!action) {
    return NextResponse.json({ message: "action_required" }, { status: 400 });
  }
  if ((action === "reject" || action === "needs_changes") && !reason.trim()) {
    return NextResponse.json({ message: "reason_required" }, { status: 400 });
  }
  const { data: existing, error: fetchError } = await (client as any)
    .from("forum_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (fetchError) {
    return NextResponse.json(
      { message: "query_failed", detail: fetchError.message },
      { status: 500 }
    );
  }
  if (!existing) {
    return NextResponse.json({ message: "not_found" }, { status: 404 });
  }
  const now = new Date().toISOString();
  let reviewStatus = String((existing as ForumThreadRow).review_status || "");
  if (action === "approve") reviewStatus = "approved";
  if (action === "reject") reviewStatus = "rejected";
  if (action === "needs_changes") reviewStatus = "needs_changes";
  const updatePayload: Partial<ForumThreadRow> = {
    review_status: reviewStatus,
    reviewed_by: auth.userId,
    reviewed_at: now,
    review_reason: reason || (existing as ForumThreadRow).review_reason || null,
  };
  if (action === "edit_metadata" && patch && typeof patch === "object") {
    const allowedKeys = ["category", "deadline", "title_preview", "criteria_preview"];
    for (const key of allowedKeys) {
      if (key in patch) {
        (updatePayload as any)[key] = patch[key];
      }
    }
  }
  const { data, error } = await (client as any)
    .from("forum_threads")
    .update(updatePayload)
    .eq("id", threadId)
    .select("*")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ message: "update_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 200 });
}
