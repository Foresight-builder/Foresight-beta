import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ApiResponses } from "@/lib/apiResponse";
import { getSessionAddress, normalizeAddress } from "@/lib/serverUtils";

export async function GET(req: NextRequest) {
  try {
    const client = supabaseAdmin;
    if (!client) return ApiResponses.internalError("Supabase not configured");

    const viewer = normalizeAddress(await getSessionAddress(req));
    if (!viewer) return ApiResponses.unauthorized();

    const unreadDb = await client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", viewer)
      .is("archived_at", null)
      .is("read_at", null);

    if (unreadDb.error) return ApiResponses.databaseError("Query failed", unreadDb.error.message);

    let pendingReviewCount = 0;
    try {
      const { data: flags } = await client
        .from("flags")
        .select("id")
        .eq("witness_id", viewer)
        .eq("status", "pending_review")
        .eq("verification_type", "witness");
      pendingReviewCount = Array.isArray(flags) ? flags.length : 0;
    } catch {}

    const dbCount = Number(unreadDb.count || 0);
    const count = dbCount + pendingReviewCount;

    return NextResponse.json({ count, dbCount, pendingReviewCount }, { status: 200 });
  } catch (error: any) {
    return ApiResponses.internalError(error?.message || "Request failed");
  }
}
