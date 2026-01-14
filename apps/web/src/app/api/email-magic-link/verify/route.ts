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
import { createSession } from "@/lib/session";

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

    let sessionAddress = "";
    const { secretString } = (() => {
      const raw = (process.env.JWT_SECRET || "").trim();
      if (raw) return { secretString: raw };
      if (process.env.NODE_ENV === "production") throw new Error("Missing JWT_SECRET");
      return { secretString: "your-secret-key-change-in-production" };
    })();

    const { data: existingList, error: existingErr } = await client
      .from("user_profiles")
      .select("wallet_address,email,proxy_wallet_type")
      .eq("email", email)
      .limit(10);

    if (existingErr) {
      return ApiResponses.databaseError("Failed to load user profile", existingErr.message);
    }

    const list = Array.isArray(existingList) ? existingList : [];
    const preferred =
      list.find((r: any) => !String(r?.proxy_wallet_type || "").trim()) ||
      list.find(
        (r: any) =>
          String(r?.proxy_wallet_type || "")
            .trim()
            .toLowerCase() === "email"
      ) ||
      list[0];

    if (preferred?.wallet_address && isValidEthAddress(preferred.wallet_address)) {
      sessionAddress = normalizeAddress(preferred.wallet_address);
    } else {
      sessionAddress = deriveDeterministicAddressFromEmail(email, secretString);
      const nowIso2 = new Date().toISOString();
      const { error: upsertErr } = await client.from("user_profiles").upsert(
        {
          wallet_address: sessionAddress,
          email,
          proxy_wallet_address: email,
          proxy_wallet_type: "email",
          updated_at: nowIso2,
        },
        { onConflict: "wallet_address" }
      );
      if (upsertErr) {
        return ApiResponses.databaseError("Failed to bind email", upsertErr.message);
      }
    }

    const res = successResponse({ ok: true, address: sessionAddress }, "验证成功");
    await createSession(res, sessionAddress, undefined, { req, authMethod: "email_magic_link" });
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
      await client
        .from("email_otps")
        .delete()
        .eq("wallet_address", sessionAddress)
        .eq("email", email);
    } catch {}
    return res;
  } catch (e: unknown) {
    logApiError("POST /api/email-magic-link/verify", e);
    const message = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("登录失败", message);
  }
}
