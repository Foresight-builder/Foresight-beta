import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";

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

export async function GET(req: NextRequest) {
  const auth = await getReviewerSession();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.reason },
      { status: auth.reason === "unauthorized" ? 401 : 403 }
    );
  }
  const client = getClient();
  if (!client) return NextResponse.json({ message: "Supabase not configured" }, { status: 500 });
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
    return NextResponse.json({ message: "query_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] }, { status: 200 });
}
