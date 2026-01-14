import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase.server";
import { ApiResponses, successResponse } from "@/lib/apiResponse";
import {
  getRequestId,
  logApiError,
  logApiEvent,
  normalizeAddress,
  parseRequestBody,
} from "@/lib/serverUtils";
import { getIP } from "@/lib/rateLimit";
import { createSession, markDeviceVerified, setStepUpCookie } from "@/lib/session";
import { getFeatureFlags } from "@/lib/runtimeConfig";
import { resolveEmailOtpSecret } from "@/lib/otpUtils";

function resolveMagicSecret() {
  const raw = (process.env.MAGIC_LINK_SECRET || process.env.JWT_SECRET || "").trim();
  if (raw) return raw;
  if (process.env.NODE_ENV === "production") throw new Error("Missing MAGIC_LINK_SECRET");
  return "dev-magic-link-secret";
}

function hashMagicToken(token: string, secret: string) {
  return createHash("sha256").update(`${token}:${secret}`, "utf8").digest("hex");
}

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function isValidEthAddress(addr: string) {
  return /^0x[a-f0-9]{40}$/.test(normalizeAddress(String(addr || "")));
}

function deriveDeterministicAddressFromEmail(email: string, secretString: string) {
  const h = createHash("sha256")
    .update(`email-login:${email}:${secretString}`, "utf8")
    .digest("hex");
  return normalizeAddress(`0x${h.slice(0, 40)}`);
}

export async function POST(req: NextRequest) {
  try {
    if (!getFeatureFlags().embedded_auth_enabled) {
      return ApiResponses.forbidden("邮箱登录已关闭");
    }
    const client = supabaseAdmin as any;
    if (!client) return ApiResponses.internalError("Supabase not configured");
    const reqId = getRequestId(req);
    const ip = getIP(req);

    const payload = await parseRequestBody(req);
    const token = String(payload?.token || "").trim();
    if (!token || token.length < 10 || token.length > 512) {
      try {
        await logApiEvent("email_login_token_verify_failed", {
          reason: "TOKEN_INVALID_FORMAT",
          requestId: reqId || undefined,
        });
      } catch {}
      return ApiResponses.invalidParameters("登录链接无效或已过期");
    }

    const tokenHash = hashMagicToken(token, resolveMagicSecret());
    const nowIso = new Date().toISOString();
    try {
      const { data: stale, error: staleErr } = await client
        .from("email_login_tokens")
        .select("id")
        .lt("expires_at", nowIso)
        .limit(200);
      const list = Array.isArray(stale) ? stale : [];
      if (!staleErr && list.length) {
        await client
          .from("email_login_tokens")
          .delete()
          .in(
            "id",
            list.map((r: any) => Number(r?.id)).filter((id: any) => Number.isFinite(id))
          );
      }
    } catch {}
    const { data: updated, error: updateErr } = await client
      .from("email_login_tokens")
      .update({ used_at: nowIso })
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .select("email")
      .limit(1);

    if (updateErr) {
      try {
        await logApiEvent("email_login_token_verify_failed", {
          reason: "DB_ERROR",
          requestId: reqId || undefined,
        });
      } catch {}
      return ApiResponses.databaseError("Failed to verify token", updateErr.message);
    }
    const row = Array.isArray(updated) ? updated[0] : null;
    const email = typeof row?.email === "string" ? String(row.email).trim().toLowerCase() : "";
    if (!email || !isValidEmail(email)) {
      try {
        await logApiEvent("email_login_token_verify_failed", {
          reason: "TOKEN_NOT_FOUND_OR_EXPIRED",
          requestId: reqId || undefined,
        });
      } catch {}
      return ApiResponses.invalidParameters("登录链接无效或已过期");
    }

    const { data: existingList, error: existingErr } = await client
      .from("user_profiles")
      .select("wallet_address,email,proxy_wallet_type")
      .eq("email", email)
      .limit(10);

    if (existingErr) {
      return ApiResponses.databaseError("Failed to load user profile", existingErr.message);
    }

    const list = Array.isArray(existingList) ? existingList : [];
    const owner = list.find((r: any) => {
      const t = String(r?.proxy_wallet_type || "")
        .trim()
        .toLowerCase();
      if (t === "email") return false;
      const wa = String(r?.wallet_address || "");
      return !!wa && isValidEthAddress(wa);
    });
    if (!owner?.wallet_address || !isValidEthAddress(owner.wallet_address)) {
      return ApiResponses.notFound("该邮箱尚未绑定钱包，请先使用钱包登录并绑定邮箱");
    }
    const sessionAddress = normalizeAddress(owner.wallet_address);

    const res = successResponse({ ok: true, address: sessionAddress }, "验证成功");
    await createSession(res, sessionAddress, undefined, { req, authMethod: "email_magic_link" });
    await setStepUpCookie(res, sessionAddress, undefined, { purpose: "login" });
    await markDeviceVerified(req, sessionAddress);
    try {
      await logApiEvent("email_login_token_verified", {
        addr: sessionAddress ? sessionAddress.slice(0, 8) : "",
        emailDomain: email.split("@")[1] || "",
        requestId: reqId || undefined,
        ip: ip ? String(ip).split(".").slice(0, 2).join(".") + ".*.*" : "",
      });
    } catch {}
    try {
      await client.from("email_login_tokens").delete().eq("token_hash", tokenHash);
    } catch {}
    try {
      const walletKey = deriveDeterministicAddressFromEmail(
        email,
        resolveEmailOtpSecret().secretString
      );
      await client.from("email_otps").delete().eq("wallet_address", walletKey).eq("email", email);
    } catch {}
    return res;
  } catch (e: unknown) {
    logApiError("POST /api/email-magic-link/verify", e);
    const message = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("登录失败", message);
  }
}
