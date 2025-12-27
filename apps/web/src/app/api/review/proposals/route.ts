import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { logApiError } from "@/lib/serverUtils";
import { ApiResponses } from "@/lib/apiResponse";

type ReviewerSessionOk = { ok: true; reason: "ok"; userId: string };
type ReviewerSessionFailReason = "no_client" | "unauthorized" | "forbidden";
type ReviewerSessionFail = { ok: false; reason: ReviewerSessionFailReason; userId: null };
type ReviewerSession = ReviewerSessionOk | ReviewerSessionFail;

async function getReviewerSession(): Promise<ReviewerSession> {
  const client = getClient();
  if (!client) {
    return { ok: false, reason: "no_client", userId: null };
  }
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session || !session.user) {
    return { ok: false, reason: "unauthorized", userId: null };
  }
  const userWithMetadata = session.user as typeof session.user & {
    user_metadata?: { wallet_address?: string | null };
  };
  const walletAddress = userWithMetadata.user_metadata?.wallet_address || "";
  const { data: profile } = await client
    .from("user_profiles")
    .select("is_admin,is_reviewer")
    .eq("wallet_address", walletAddress)
    .maybeSingle<
      Pick<Database["public"]["Tables"]["user_profiles"]["Row"], "is_admin" | "is_reviewer">
    >();
  const isAdmin = !!profile?.is_admin;
  const isReviewer = !!profile?.is_reviewer;
  if (!isAdmin && !isReviewer) {
    return { ok: false, reason: "forbidden", userId: null };
  }
  return { ok: true, reason: "ok", userId: session.user.id };
}

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending_review";
    const limitParam = Number(searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, limitParam)) : 50;
    const { data, error } = await client
      .from("forum_threads")
      .select("*")
      .eq("event_id", 0)
      .eq("review_status", status)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      logApiError("GET /api/review/proposals query_failed", error);
      return ApiResponses.databaseError("query_failed", error.message);
    }
    return NextResponse.json({ items: data || [] }, { status: 200 });
  } catch (e: any) {
    logApiError("GET /api/review/proposals unhandled error", e);
    const detail = e?.message || String(e);
    return ApiResponses.internalError("query_failed", detail);
  }
}
