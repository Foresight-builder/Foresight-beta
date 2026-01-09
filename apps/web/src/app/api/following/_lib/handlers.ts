import type { NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { supabaseAdmin } from "@/lib/supabase";
import { ApiResponses, successResponse } from "@/lib/apiResponse";
import { getErrorMessage, logApiError } from "@/lib/serverUtils";
import { parseWalletAddressQuery } from "./validators";
import type { FollowingItem } from "./types";

export async function handleFollowingGet(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return ApiResponses.internalError("Supabase client not initialized");
    }

    const { searchParams } = new URL(req.url);
    const address = parseWalletAddressQuery(searchParams.get("address"));

    if (!address) {
      return ApiResponses.badRequest("Address is required");
    }

    const { data: rawFollowData, error: followError } = await supabaseAdmin
      .from("event_follows")
      .select("event_id, created_at")
      .eq("user_id", address)
      .order("created_at", { ascending: false });

    const followData = (rawFollowData || null) as
      | Database["public"]["Tables"]["event_follows"]["Row"][]
      | null;

    if (followError) {
      logApiError("GET /api/following fetch ids failed", followError);
      return ApiResponses.databaseError("Failed to fetch following", followError.message);
    }

    if (!followData || followData.length === 0) {
      return successResponse<FollowingItem[]>([]);
    }

    const eventIds = followData.map((item) => item.event_id);
    const followMap = new Map(followData.map((item) => [item.event_id, item.created_at]));

    const { data: predictionsData, error: predictionsError } = await supabaseAdmin
      .from("predictions")
      .select("id, title, image_url, category, deadline")
      .in("id", eventIds);

    if (predictionsError) {
      logApiError("GET /api/following fetch predictions failed", predictionsError);
      return ApiResponses.databaseError("Failed to fetch predictions", predictionsError.message);
    }

    const { data: allFollows, error: allFollowsError } = await supabaseAdmin
      .from("event_follows")
      .select("event_id")
      .in("event_id", eventIds);

    const counts: Record<number, number> = {};
    if (!allFollowsError && allFollows) {
      const allFollowRows = (allFollows ||
        []) as Database["public"]["Tables"]["event_follows"]["Row"][];
      for (const f of allFollowRows) {
        const eid = f.event_id;
        counts[eid] = (counts[eid] || 0) + 1;
      }
    }

    const predictionRows = (predictionsData ||
      []) as Database["public"]["Tables"]["predictions"]["Row"][];

    const following: FollowingItem[] = predictionRows.map((prediction) => ({
      id: prediction.id,
      title: prediction.title,
      image_url: prediction.image_url,
      category: prediction.category,
      deadline: prediction.deadline,
      followers_count: counts[prediction.id] || 0,
      followed_at: followMap.get(prediction.id),
    }));

    following.sort((a, b) => {
      const timeA = a.followed_at ? new Date(a.followed_at).getTime() : 0;
      const timeB = b.followed_at ? new Date(b.followed_at).getTime() : 0;
      return timeB - timeA;
    });

    return successResponse<FollowingItem[]>(following);
  } catch (error: any) {
    logApiError("GET /api/following unhandled error", error);
    return ApiResponses.internalError("Failed to fetch following", getErrorMessage(error));
  }
}
