import { NextRequest } from "next/server";
import { ApiResponses, proxyJsonResponse } from "@/lib/apiResponse";
import { getRelayerBaseUrl } from "@/lib/serverUtils";

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
    if (!relayerBase) {
      return ApiResponses.internalError("Relayer not configured");
    }

    const url = new URL("/orderbook/report-trade", relayerBase);
    const relayerRes = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return proxyJsonResponse(relayerRes, {
      successMessage: "ok",
      errorMessage: "Relayer request failed",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("Failed to report trade", message);
  }
}
