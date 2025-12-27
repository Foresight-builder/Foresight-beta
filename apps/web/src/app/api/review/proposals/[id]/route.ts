import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { logApiError } from "@/lib/serverUtils";
import { ApiResponses } from "@/lib/apiResponse";

type ForumThreadRow = Database["public"]["Tables"]["forum_threads"]["Row"];
type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

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
  const wallet = (session.user.user_metadata as { wallet_address?: string } | null)?.wallet_address;
  const { data: profile } = await client
    .from("user_profiles")
    .select("is_admin,is_reviewer")
    .eq("wallet_address", wallet || "")
    .maybeSingle();
  const flags = (profile ?? ({} as UserProfileRow)) as Pick<
    UserProfileRow,
    "is_admin" | "is_reviewer"
  >;
  const isAdmin = !!flags.is_admin;
  const isReviewer = !!flags.is_reviewer;
  if (!isAdmin && !isReviewer)
    return { ok: false as const, reason: "forbidden" as const, userId: null as string | null };
  return { ok: true as const, reason: "ok" as const, userId };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getReviewerSession();
    if (!auth.ok) {
      if (auth.reason === "unauthorized") {
        return ApiResponses.unauthorized("unauthorized");
      }
      if (auth.reason === "forbidden") {
        return ApiResponses.forbidden("forbidden");
      }
      return ApiResponses.internalError("no_client");
    }
    const client = getClient();
    if (!client) {
      return ApiResponses.internalError("Supabase not configured");
    }
    const { id } = await ctx.params;
    const threadId = Number(id);
    if (!Number.isFinite(threadId)) {
      return ApiResponses.invalidParameters("invalid_id");
    }
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const reason = String(body.reason || "");
    const patch = body.patch || {};
    if (!action) {
      return ApiResponses.invalidParameters("action_required");
    }
    if ((action === "reject" || action === "needs_changes") && !reason.trim()) {
      return ApiResponses.invalidParameters("reason_required");
    }
    const { data: existing, error: fetchError } = await client
      .from("forum_threads")
      .select("*")
      .eq("id", threadId)
      .maybeSingle();
    if (fetchError) {
      logApiError("POST /api/review/proposals/[id] query_failed", fetchError);
      return ApiResponses.databaseError("query_failed", fetchError.message);
    }
    if (!existing) {
      return ApiResponses.notFound("not_found");
    }
    const now = new Date().toISOString();
    const existingRow = existing as ForumThreadRow;
    let reviewStatus = String(existingRow.review_status || "");
    if (action === "approve") reviewStatus = "approved";
    if (action === "reject") reviewStatus = "rejected";
    if (action === "needs_changes") reviewStatus = "needs_changes";
    const updatePayload: Partial<ForumThreadRow> = {
      review_status: reviewStatus,
      reviewed_by: auth.userId,
      reviewed_at: now,
      review_reason: reason || existingRow.review_reason || null,
    };
    if (action === "edit_metadata" && patch && typeof patch === "object") {
      const allowedKeys = ["category", "deadline", "title_preview", "criteria_preview"];
      for (const key of allowedKeys) {
        if (key in patch) {
          const value = patch[key];
          (updatePayload as Record<string, unknown>)[key] = value as unknown;
        }
      }
    }
    const { data, error } = await client
      .from("forum_threads")
      .update(updatePayload as never)
      .eq("id", threadId)
      .select("*")
      .maybeSingle();
    if (error) {
      logApiError("POST /api/review/proposals/[id] update_failed", error);
      return ApiResponses.databaseError("update_failed", error.message);
    }
    return NextResponse.json({ item: data }, { status: 200 });
  } catch (e: any) {
    logApiError("POST /api/review/proposals/[id] unhandled error", e);
    const detail = e?.message || String(e);
    return ApiResponses.internalError("update_failed", detail);
  }
}
