import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const client = getClient();
    if (!client) {
      return NextResponse.json(
        { success: false, message: "Supabase not configured" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const contract = url.searchParams.get("contract");
    const chainId = url.searchParams.get("chainId");
    const outcome = url.searchParams.get("outcome");
    const side = url.searchParams.get("side"); // 'true' for buy, 'false' for sell
    const marketKey = url.searchParams.get("marketKey") || url.searchParams.get("market_key");
    const levels = Number(url.searchParams.get("levels") || 10);

    if (!contract || !chainId || outcome === null || side === null) {
      return NextResponse.json({ success: false, message: "Missing parameters" }, { status: 400 });
    }

    const isBuy = side === "true";

    // Query open orders
    let query = client
      .from("orders")
      .select("price, remaining")
      .eq("verifying_contract", contract.toLowerCase())
      .eq("chain_id", Number(chainId))
      .eq("outcome_index", Number(outcome))
      .eq("is_buy", isBuy)
      .in("status", ["open", "filled_partial"]);

    if (marketKey) {
      query = query.eq("market_key", marketKey);
    }

    let { data: orders, error } = await query.order("price", { ascending: !isBuy }); // Buy: desc (high to low), Sell: asc (low to high)

    // 兼容旧版本数据库（没有 market_key 列时回退为不按 marketKey 过滤）
    if (error && (error as any).code === "42703" && marketKey) {
      const fallbackQuery = client
        .from("orders")
        .select("price, remaining")
        .eq("verifying_contract", contract.toLowerCase())
        .eq("chain_id", Number(chainId))
        .eq("outcome_index", Number(outcome))
        .eq("is_buy", isBuy)
        .in("status", ["open", "filled_partial"]);

      const fallback = await fallbackQuery.order("price", { ascending: !isBuy });
      orders = fallback.data || [];
      error = fallback.error as any;
    }

    if (error) {
      console.error("Error fetching depth:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Aggregate orders by price
    const depthMap = new Map<string, bigint>();

    for (const order of orders as any[]) {
      const priceStr = String(order.price);
      const currentQty = depthMap.get(priceStr) || BigInt(0);
      depthMap.set(priceStr, currentQty + BigInt(order.remaining));
    }

    // Convert to array and sort again (just to be safe)
    const depthArray = Array.from(depthMap.entries()).map(([price, qty]) => ({
      price,
      qty: qty.toString(),
    }));

    // Sort again because Map iteration order is insertion order (usually correct if query was sorted, but let's ensure)
    depthArray.sort((a, b) => {
      const priceA = BigInt(a.price);
      const priceB = BigInt(b.price);
      if (isBuy) {
        return priceA > priceB ? -1 : priceA < priceB ? 1 : 0;
      } else {
        return priceA < priceB ? -1 : priceA > priceB ? 1 : 0;
      }
    });

    return NextResponse.json({
      success: true,
      data: depthArray.slice(0, levels),
    });
  } catch (e: any) {
    console.error("Depth API error:", e);
    return NextResponse.json({ success: false, message: e?.message || String(e) }, { status: 500 });
  }
}
