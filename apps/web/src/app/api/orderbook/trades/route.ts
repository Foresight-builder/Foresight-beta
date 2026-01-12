import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";
import { ApiResponses } from "@/lib/apiResponse";
import { logApiError, logApiEvent } from "@/lib/serverUtils";
import { checkRateLimit, getIP, RateLimits } from "@/lib/rateLimit";

export const revalidate = 5; // 5 seconds cache

export async function GET(req: NextRequest) {
  try {
    const ip = getIP(req);
    const limitResult = await checkRateLimit(ip, RateLimits.lenient, "trades_ip");
    if (!limitResult.success) {
      try {
        await logApiEvent("trades_rate_limited", {
          ip: ip ? String(ip).split(".").slice(0, 2).join(".") + ".*.*" : "",
        });
      } catch {}
      return ApiResponses.rateLimit("Too many trades requests");
    }
    const client = getClient();
    if (!client) {
      return ApiResponses.internalError("Supabase not configured");
    }

    const url = new URL(req.url);
    const chainIdRaw = url.searchParams.get("chainId");
    const contract = url.searchParams.get("contract") || undefined;
    const limitRaw = url.searchParams.get("limit");
    const limitParsed = limitRaw == null ? 50 : Number(limitRaw);
    const limit = Number.isFinite(limitParsed) ? Math.max(1, Math.min(200, limitParsed)) : 50;

    let chainId: string | undefined;
    if (chainIdRaw != null) {
      const parsed = Number(chainIdRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return ApiResponses.badRequest("Invalid chainId");
      }
      chainId = String(parsed);
    }

    let query = client
      .from("trades")
      .select("*")
      .order("block_timestamp", { ascending: false })
      .limit(limit);

    if (chainId) {
      query = query.eq("network_id", chainId);
    }
    if (contract) {
      query = query.eq("market_address", contract);
    }
    // Note: trades table currently uses network_id and market_address.
    // It does not seem to have 'market_key' column based on previous sql file reading.
    // But let's check if we can filter by market_address and network_id effectively.

    const { data, error } = await query;

    if (error) {
      logApiError("GET /api/orderbook/trades query failed", error);
      return ApiResponses.databaseError("Failed to fetch trades", error.message);
    }

    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    logApiError("GET /api/orderbook/trades unhandled error", e);
    const message = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError(
      "Failed to fetch trades",
      process.env.NODE_ENV === "development" ? message : undefined
    );
  }
}
