import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeAddress } from "@/lib/serverUtils";
import { ApiResponses } from "@/lib/apiResponse";

/**
 * 获取我的粉丝列表（关注我的人）
 */

export async function GET(req: NextRequest) {
  try {
    const client = supabaseAdmin;
    if (!client) return ApiResponses.internalError("Supabase not configured");

    const { searchParams } = new URL(req.url);
    const address = normalizeAddress(searchParams.get("address") || "");

    if (!address) return ApiResponses.badRequest("Address is required");

    // 查询关注我的人（follower_address）
    const { data: followData, error: followError } = await client
      .from("user_follows")
      .select("follower_address")
      .eq("following_address", address);

    if (followError)
      return ApiResponses.databaseError("Failed to fetch followers", followError.message);

    const followerAddresses = followData.map((f) => f.follower_address);

    if (followerAddresses.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // 获取这些粉丝的资料
    const { data: profiles, error: profileError } = await client
      .from("user_profiles")
      .select("wallet_address, username, created_at")
      .in("wallet_address", followerAddresses);

    if (profileError)
      return ApiResponses.databaseError("Failed to fetch profiles", profileError.message);

    const users = profiles.map((p) => ({
      wallet_address: p.wallet_address,
      username: p.username || `User_${p.wallet_address.slice(2, 8)}`,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${p.wallet_address}`,
    }));

    return NextResponse.json({ users });
  } catch (error: any) {
    return ApiResponses.internalError(error.message);
  }
}
