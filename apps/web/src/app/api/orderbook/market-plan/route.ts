import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";

type MarketPlanItem = {
  orderId: number;
  fillAmount: string;
  maker: string;
  signature: string;
  req: {
    maker: string;
    outcomeIndex: number;
    isBuy: boolean;
    price: string;
    amount: string;
    expiry: string;
    salt: string;
  };
};

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
    const chainIdRaw = url.searchParams.get("chainId");
    const outcomeRaw = url.searchParams.get("outcome");
    const sideRaw = url.searchParams.get("side");
    const marketKey = url.searchParams.get("marketKey") || url.searchParams.get("market_key");
    const amountRaw = url.searchParams.get("amount");

    if (!contract || !chainIdRaw || outcomeRaw === null || !sideRaw || !amountRaw) {
      return NextResponse.json({ success: false, message: "Missing parameters" }, { status: 400 });
    }

    const chainId = Number(chainIdRaw);
    const outcome = Number(outcomeRaw);
    if (!Number.isFinite(chainId) || chainId <= 0 || !Number.isFinite(outcome) || outcome < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid chainId or outcome" },
        { status: 400 }
      );
    }

    let targetAmount: bigint;
    try {
      const parsedAmount = Math.floor(Number(amountRaw));
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
      }
      targetAmount = BigInt(parsedAmount);
    } catch {
      return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
    }

    const takerSide = sideRaw.toLowerCase() === "buy" ? "buy" : "sell";
    const makerIsBuy = takerSide === "sell";

    let query = client
      .from("orders")
      .select(
        "id, maker_address, maker_salt, outcome_index, is_buy, price, amount, remaining, expiry, signature, status, created_at, sequence"
      )
      .eq("verifying_contract", contract.toLowerCase())
      .eq("chain_id", chainId)
      .eq("outcome_index", outcome)
      .eq("is_buy", makerIsBuy)
      .in("status", ["open", "filled_partial"]);

    if (marketKey) {
      query = query.eq("market_key", marketKey);
    }

    // 不依赖数据库对 TEXT price 的排序，拉取后在服务端用 BigInt 排序保证数值正确
    let { data: orders, error } = await query.limit(2000);
    if (error && (error as any).code === "42703" && marketKey) {
      const fallbackQuery = client
        .from("orders")
        .select(
          "id, maker_address, maker_salt, outcome_index, is_buy, price, amount, remaining, expiry, signature, status, created_at, sequence"
        )
        .eq("verifying_contract", contract.toLowerCase())
        .eq("chain_id", chainId)
        .eq("outcome_index", outcome)
        .eq("is_buy", makerIsBuy)
        .in("status", ["open", "filled_partial"])
        .limit(2000);
      const fallback = await fallbackQuery;
      orders = fallback.data || [];
      error = fallback.error as any;
    }
    if (error) {
      return NextResponse.json(
        { success: false, message: error.message || "Order query failed" },
        { status: 500 }
      );
    }

    const rows = Array.isArray(orders) ? (orders as any[]) : [];
    const normalized = rows
      .map((row) => {
        try {
          const price = BigInt(String(row.price));
          const remaining = BigInt(String(row.remaining));
          const sequence = row.sequence != null ? BigInt(String(row.sequence)) : 0n;
          return {
            row,
            price,
            remaining,
            sequence,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ row: any; price: bigint; remaining: bigint; sequence: bigint }>;

    normalized.sort((a, b) => {
      if (a.price !== b.price) {
        if (makerIsBuy) return a.price > b.price ? -1 : 1; // 买盘：高价优先
        return a.price < b.price ? -1 : 1; // 卖盘：低价优先
      }
      if (a.sequence !== b.sequence) return a.sequence < b.sequence ? -1 : 1; // 时间优先
      return 0;
    });

    let remainingToFill = targetAmount;
    let filledAmount = 0n;
    let totalCost = 0n;
    let bestPrice: bigint | null = null;
    let worstPrice: bigint | null = null;

    const fills: MarketPlanItem[] = [];

    for (const item of normalized) {
      if (remainingToFill <= 0n) break;
      if (item.remaining <= 0n) continue;

      const take = item.remaining >= remainingToFill ? remainingToFill : item.remaining;
      if (take <= 0n) continue;

      if (bestPrice === null) bestPrice = item.price;
      worstPrice = item.price;
      filledAmount += take;
      totalCost += take * item.price;
      remainingToFill -= take;

      const expiryUnix =
        item.row.expiry != null ? Math.floor(new Date(String(item.row.expiry)).getTime() / 1000) : 0;

      fills.push({
        orderId: Number(item.row.id),
        fillAmount: take.toString(),
        maker: String(item.row.maker_address),
        signature: String(item.row.signature),
        req: {
          maker: String(item.row.maker_address),
          outcomeIndex: Number(item.row.outcome_index),
          isBuy: Boolean(item.row.is_buy),
          price: String(item.row.price),
          amount: String(item.row.amount),
          expiry: String(expiryUnix),
          salt: String(item.row.maker_salt),
        },
      });
    }

    if (filledAmount === 0n || bestPrice === null || worstPrice === null) {
      return NextResponse.json({
        success: true,
        data: {
          side: takerSide,
          amount: targetAmount.toString(),
          filledAmount: "0",
          total: "0",
          avgPrice: "0",
          bestPrice: null,
          worstPrice: null,
          slippageBps: "0",
          hasMoreDepth: false,
          fills: [],
        },
      });
    }

    const avgPrice = totalCost / filledAmount;
    let slippageBps = 0n;
    if (takerSide === "buy") {
      if (worstPrice > bestPrice) slippageBps = ((worstPrice - bestPrice) * 10000n) / bestPrice;
    } else {
      if (worstPrice < bestPrice) slippageBps = ((bestPrice - worstPrice) * 10000n) / bestPrice;
    }

    const hasMoreDepth = remainingToFill > 0n;

    return NextResponse.json({
      success: true,
      data: {
        side: takerSide,
        amount: targetAmount.toString(),
        filledAmount: filledAmount.toString(),
        total: totalCost.toString(),
        avgPrice: avgPrice.toString(),
        bestPrice: bestPrice.toString(),
        worstPrice: worstPrice.toString(),
        slippageBps: slippageBps.toString(),
        hasMoreDepth,
        fills,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || String(e) }, { status: 500 });
  }
}


