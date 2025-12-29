import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionAddress, normalizeAddress } from "@/lib/serverUtils";
import { ApiResponses } from "@/lib/apiResponse";

/**
 * 用户关注 API
 * POST: 关注/取消关注用户
 * GET: 检查关注状态
 */

export async function POST(req: NextRequest) {
  try {
    const client = supabaseAdmin;
    if (!client) return ApiResponses.internalError("Supabase not configured");

    const followerAddress = await getSessionAddress(req);
    if (!followerAddress) return ApiResponses.unauthorized();

    const { targetAddress } = await req.json();
    const target = normalizeAddress(targetAddress);
    const follower = normalizeAddress(followerAddress);

    if (!target) return ApiResponses.badRequest("Target address is required");
    if (target === follower) return ApiResponses.badRequest("Cannot follow yourself");

    // 检查是否已经关注
    const { data: existing } = await client
      .from("user_follows")
      .select("*")
      .eq("follower_address", follower)
      .eq("following_address", target)
      .maybeSingle();

    if (existing) {
      // 取消关注
      const { error: delError } = await client
        .from("user_follows")
        .delete()
        .eq("follower_address", follower)
        .eq("following_address", target);

      if (delError) return ApiResponses.databaseError("Failed to unfollow", delError.message);
      return NextResponse.json({ success: true, followed: false });
    } else {
      // 关注
      const { error: insError } = await client.from("user_follows").insert({
        follower_address: follower,
        following_address: target,
      });

      if (insError) return ApiResponses.databaseError("Failed to follow", insError.message);
      return NextResponse.json({ success: true, followed: true });
    }
  } catch (error: any) {
    return ApiResponses.internalError(error.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    const client = supabaseAdmin;
    if (!client) return ApiResponses.internalError("Supabase not configured");

    const { searchParams } = new URL(req.url);
    const targetAddress = normalizeAddress(searchParams.get("targetAddress") || "");
    const followerAddress = normalizeAddress(searchParams.get("followerAddress") || "");

    if (!targetAddress || !followerAddress) {
      return ApiResponses.badRequest("Both addresses are required");
    }

    const { data, error } = await client
      .from("user_follows")
      .select("*")
      .eq("follower_address", followerAddress)
      .eq("following_address", targetAddress)
      .maybeSingle();

    if (error) return ApiResponses.databaseError("Query failed", error.message);

    return NextResponse.json({ followed: !!data });
  } catch (error: any) {
    return ApiResponses.internalError(error.message);
  }
}
