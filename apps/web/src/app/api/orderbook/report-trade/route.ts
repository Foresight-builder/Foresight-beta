import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getClient, supabaseAdmin } from "@/lib/supabase";
import { ApiResponses, proxyJsonResponse, successResponse } from "@/lib/apiResponse";
import { getRelayerBaseUrl, logApiError } from "@/lib/serverUtils";
import { marketAbi } from "@/app/prediction/[id]/_lib/abis";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = (() => {
      try {
        return rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return {};
      }
    })();

    const relayerBase = getRelayerBaseUrl();
    if (relayerBase) {
      const url = new URL("/orderbook/report-trade", relayerBase);
      const relayerRes = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: rawBody || "{}",
      });
      return proxyJsonResponse(relayerRes, {
        successMessage: "ok",
        errorMessage: "Relayer request failed",
      });
    }

    // Serverless fallback: Update Supabase directly by parsing tx logs
    const { chainId, txHash } = body;

    if (!chainId || !txHash) {
      return ApiResponses.invalidParameters("Missing chainId or txHash");
    }

    // TODO: Support multiple chains via config
    const rpcUrl =
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology/";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Wait for receipt (it should be mined already as client sends this after wait)
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return ApiResponses.notFound("Transaction receipt not found");
    }

    const iface = new ethers.Interface(marketAbi);
    const client = supabaseAdmin || getClient();
    if (!client) {
      return ApiResponses.internalError("Supabase not configured");
    }

    const filledEvents = [];
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "OrderFilledSigned") {
          // event OrderFilledSigned(address indexed maker, address indexed taker, uint256 indexed outcomeIndex, bool isBuy, uint256 price, uint256 amount, uint256 fee, uint256 salt);
          const { maker, salt, amount } = parsed.args;
          filledEvents.push({
            maker: String(maker).toLowerCase(),
            salt: String(salt),
            amount: BigInt(amount),
          });
        }
      } catch {
        // ignore other events
      }
    }

    if (filledEvents.length === 0) {
      return successResponse({ updated: 0 }, "No fill events found in transaction");
    }

    let updatedCount = 0;
    for (const item of filledEvents) {
      const { maker, salt, amount } = item;

      // Fetch current order
      const { data: order, error: fetchErr } = await client
        .from("orders")
        .select("id, remaining, status")
        .eq("maker_address", maker)
        .eq("maker_salt", salt)
        .maybeSingle();

      if (fetchErr || !order) continue;

      const currentRemaining = BigInt(String(order.remaining || "0"));
      if (currentRemaining <= 0n) continue;

      const newRemaining = currentRemaining > amount ? currentRemaining - amount : 0n;
      const newStatus = newRemaining === 0n ? "filled" : "partially_filled";

      const { error: updateErr } = await client
        .from("orders")
        .update({
          remaining: newRemaining.toString(),
          status: newStatus,
        } as never)
        .eq("id", order.id);

      if (!updateErr) updatedCount++;
    }

    return successResponse({ updated: updatedCount }, "Orders updated successfully");
  } catch (e: unknown) {
    logApiError("POST /api/orderbook/report-trade", e);
    const message = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("Failed to report trade", message);
  }
}
