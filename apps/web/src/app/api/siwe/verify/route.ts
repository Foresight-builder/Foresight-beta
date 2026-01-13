import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { parseRequestBody, logApiError, logApiEvent, getRequestId } from "@/lib/serverUtils";
import { ApiResponses } from "@/lib/apiResponse";
import { checkRateLimit, RateLimits, getIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const payload = await parseRequestBody(req);
    const ip = getIP(req);
    const reqId = getRequestId(req);
    const rl = await checkRateLimit(ip || "unknown", RateLimits.moderate, "siwe-verify");
    if (!rl.success) {
      try {
        console.info(
          JSON.stringify({
            evt: "siwe_verify_rate_limited",
            ip: ip ? String(ip).split(".").slice(0, 2).join(".") + ".*.*" : "",
            resetAt: rl.resetAt,
          })
        );
        await logApiEvent("siwe_verify_rate_limited", {
          ip: ip ? String(ip).split(".").slice(0, 2).join(".") + ".*.*" : "",
          resetAt: rl.resetAt,
          requestId: reqId || undefined,
        });
      } catch {}
      return ApiResponses.rateLimit("请求过于频繁");
    }

    const messageVal = payload?.message;
    const signatureVal = payload?.signature;
    const messageStr = typeof messageVal === "string" ? messageVal : "";
    const signature = typeof signatureVal === "string" ? signatureVal : "";

    if (!messageStr || !signature) {
      return ApiResponses.badRequest("SIWE 必填字段缺失: message 或 signature");
    }

    if (!/^0x[0-9a-fA-F]+$/.test(signature) || signature.length < 10) {
      return ApiResponses.badRequest("签名格式无效");
    }

    let msg: SiweMessage;
    try {
      msg = new SiweMessage(messageStr);
    } catch (err) {
      return ApiResponses.badRequest("无效的 SIWE 消息格式");
    }

    const domainFromPayload = typeof payload?.domain === "string" ? payload.domain : undefined;
    const uriFromPayload = typeof payload?.uri === "string" ? payload.uri : undefined;

    const domain =
      domainFromPayload ||
      msg.domain ||
      (typeof window === "undefined" ? undefined : window.location.host);
    const origin = uriFromPayload || msg.uri;
    const nonce = msg.nonce;

    if (!domain || !msg.address || !origin || !msg.version || !msg.chainId || !nonce) {
      return ApiResponses.badRequest("SIWE 消息缺少必填字段");
    }

    try {
      const url = new URL(req.nextUrl?.href || req.url);
      const expectedDomain = url.host;
      if (domain !== expectedDomain) {
        return ApiResponses.badRequest("SIWE domain 不匹配");
      }
      const expectedOrigin = url.origin;
      if (origin !== expectedOrigin) {
        return ApiResponses.badRequest("SIWE uri 不匹配");
      }
    } catch {}

    if (msg.issuedAt) {
      const issuedAtTime = new Date(msg.issuedAt).getTime();
      if (Number.isFinite(issuedAtTime)) {
        const now = Date.now();
        if (issuedAtTime - now > 5 * 60 * 1000) {
          return ApiResponses.badRequest("SIWE time 无效: issuedAt 在未来");
        }
      }
    }

    const allowedChainIds = new Set([1, 11155111, 137, 80002, 56, 8217, 1001]);
    const msgChainId = Number(msg.chainId);
    if (!allowedChainIds.has(msgChainId)) {
      return ApiResponses.badRequest("不支持的 chainId");
    }

    const cookieNonce = req.cookies.get("siwe_nonce")?.value || "";

    if (!cookieNonce || cookieNonce !== nonce) {
      return ApiResponses.sessionExpired("nonce 不匹配或过期");
    }

    try {
      const result = await msg.verify({ signature, domain, nonce });
      if (!result?.success) {
        return ApiResponses.invalidSignature("签名验证失败");
      }
    } catch {
      return ApiResponses.invalidSignature("签名验证失败");
    }

    const address = msg.address;
    const chainId = msgChainId;
    const res = NextResponse.json({ success: true, address });

    const { createSession } = await import("@/lib/session");
    await createSession(res, address, chainId, { req, authMethod: "siwe" });
    try {
      console.info(
        JSON.stringify({
          evt: "siwe_verify_success",
          addr: address ? String(address).slice(0, 8) : "",
          chainId,
          ts: Date.now(),
        })
      );
      await logApiEvent("siwe_verify_success", {
        addr: address ? String(address).slice(0, 8) : "",
        chainId,
        requestId: reqId || undefined,
      });
    } catch {}

    res.cookies.set("siwe_nonce", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (e: unknown) {
    logApiError("POST /api/siwe/verify", e);
    const detail = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("服务器错误", detail);
  }
}
