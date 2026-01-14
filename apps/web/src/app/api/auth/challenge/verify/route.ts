import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  parseRequestBody,
  getRequestId,
  logApiError,
  logApiEvent,
  normalizeAddress,
} from "@/lib/serverUtils";
import { ApiResponses } from "@/lib/apiResponse";
import { checkRateLimit, RateLimits, getIP } from "@/lib/rateLimit";
import { createSession } from "@/lib/session";

function buildChallengeMessage(params: { domain: string; nonce: string }) {
  const domain = String(params.domain || "").trim() || "localhost";
  const nonce = String(params.nonce || "").trim();
  return `${domain} wants you to sign in to Foresight.\n\nNonce: ${nonce}`;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await parseRequestBody(req);
    const ip = getIP(req);
    const reqId = getRequestId(req);
    const rl = await checkRateLimit(ip || "unknown", RateLimits.moderate, "auth-challenge-verify");
    if (!rl.success) {
      try {
        await logApiEvent("auth_challenge_verify_rate_limited", {
          ip: ip ? String(ip).split(".").slice(0, 2).join(".") + ".*.*" : "",
          resetAt: rl.resetAt,
          requestId: reqId || undefined,
        });
      } catch {}
      return ApiResponses.rateLimit("请求过于频繁");
    }

    const addressRaw = typeof payload?.address === "string" ? payload.address : "";
    const signature = typeof payload?.signature === "string" ? payload.signature : "";
    const chainIdRaw = payload?.chainId;
    const chainId =
      typeof chainIdRaw === "number"
        ? chainIdRaw
        : typeof chainIdRaw === "string"
          ? Number(chainIdRaw)
          : NaN;

    const address = normalizeAddress(addressRaw);
    if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
      return ApiResponses.invalidParameters("钱包地址无效");
    }
    if (!/^0x[0-9a-fA-F]+$/.test(signature) || signature.length < 10) {
      return ApiResponses.badRequest("签名格式无效");
    }

    const cookieNonce = req.cookies.get("auth_challenge_nonce")?.value || "";
    if (!cookieNonce) {
      return ApiResponses.sessionExpired("nonce 不存在或已过期");
    }

    const domain = (() => {
      try {
        return String(req.nextUrl?.host || "");
      } catch {
        return "";
      }
    })();
    const message = buildChallengeMessage({ domain, nonce: cookieNonce });

    let recovered = "";
    try {
      recovered = normalizeAddress(ethers.verifyMessage(message, signature));
    } catch {
      return ApiResponses.invalidSignature("签名验证失败");
    }
    if (!recovered || recovered.toLowerCase() !== address.toLowerCase()) {
      return ApiResponses.invalidSignature("签名验证失败");
    }

    const allowedChainIds = new Set([1, 11155111, 137, 80002, 56, 8217, 1001]);
    const finalChainId =
      Number.isFinite(chainId) && allowedChainIds.has(Number(chainId))
        ? Number(chainId)
        : undefined;

    const res = NextResponse.json({ success: true, address });
    await createSession(res, address, finalChainId, { req, authMethod: "challenge" });
    try {
      await logApiEvent("auth_challenge_verify_success", {
        addr: address ? String(address).slice(0, 8) : "",
        chainId: finalChainId ?? null,
        requestId: reqId || undefined,
      });
    } catch {}

    res.cookies.set("auth_challenge_nonce", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (e: unknown) {
    logApiError("POST /api/auth/challenge/verify", e);
    const detail = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("服务器错误", detail);
  }
}
