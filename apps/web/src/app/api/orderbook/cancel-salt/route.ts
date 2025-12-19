import { NextRequest, NextResponse } from "next/server";
import { getClient, supabaseAdmin } from "@/lib/supabase";
import { ethers } from "ethers";

function getRelayerBaseUrl(): string | undefined {
  const raw = (process.env.RELAYER_URL || process.env.NEXT_PUBLIC_RELAYER_URL || "").trim();
  if (!raw) return undefined;
  if (!/^https?:\/\//i.test(raw)) return undefined;
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const relayerBase = getRelayerBaseUrl();
    if (relayerBase) {
      const url = new URL("/orderbook/cancel-salt", relayerBase);
      const relayerRes = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: rawBody || "{}",
      });
      const relayerJson = await relayerRes.json().catch(() => null);
      return NextResponse.json(relayerJson ?? { message: "invalid relayer response" }, {
        status: relayerRes.status,
      });
    }

    const client = supabaseAdmin || getClient();
    if (!client) {
      return NextResponse.json(
        { success: false, message: "Supabase not configured" },
        { status: 500 }
      );
    }

    const body = (() => {
      try {
        return rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return {};
      }
    })();
    const { chainId, verifyingContract, contract, marketKey, market_key, salt, maker, signature } =
      body;

    const vcRaw = (verifyingContract || contract || "").toString();
    const vc = vcRaw.trim();
    const chainIdNum = Number(chainId);
    const mk = (marketKey || market_key || "").toString().trim() || undefined;

    if (!chainId || !vc || !salt || !maker || !signature) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(chainIdNum) || chainIdNum <= 0) {
      return NextResponse.json({ success: false, message: "Invalid chainId" }, { status: 400 });
    }

    if (!ethers.isAddress(vc)) {
      return NextResponse.json(
        { success: false, message: "Invalid verifyingContract" },
        { status: 400 }
      );
    }

    const domain = {
      name: "Foresight Market",
      version: "1",
      chainId: chainIdNum,
      verifyingContract: vc,
    };
    const types = {
      CancelSaltRequest: [
        { name: "maker", type: "address" },
        { name: "salt", type: "uint256" },
      ],
    };
    const recoveredAddress = ethers.verifyTypedData(domain, types, { maker, salt }, signature);
    if (recoveredAddress.toLowerCase() !== maker.toLowerCase()) {
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 401 });
    }

    // 2. Cancel Order in DB
    const runUpdate = async (useMk: boolean) => {
      let q = client
        .from("orders")
        // @ts-ignore
        .update({ status: "canceled", remaining: "0" })
        .eq("chain_id", chainIdNum)
        .eq("verifying_contract", vc.toLowerCase())
        .eq("maker_address", maker.toLowerCase())
        .eq("maker_salt", String(salt))
        .select();
      if (useMk && mk) q = (q as any).eq("market_key", mk);
      return await q;
    };

    let { error } = await runUpdate(true);
    if (error) {
      const msg = String((error as any).message || "");
      if (mk && /market_key/i.test(msg)) {
        ({ error } = await runUpdate(false));
      }
    }

    if (error) {
      console.error("Error cancelling order:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Order cancelled" });
  } catch (e: any) {
    console.error("Cancel Order API error:", e);
    return NextResponse.json({ success: false, message: e?.message || String(e) }, { status: 500 });
  }
}
