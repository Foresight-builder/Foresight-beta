import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { ApiResponses, successResponse, errorResponse } from "@/lib/apiResponse";
import { ApiErrorCode } from "@/types/api";
import { createSession } from "@/lib/session";
import { hashEmailOtpCode, isValidEmail, resolveEmailOtpSecret } from "@/lib/otpUtils";
import {
  getSessionAddress,
  logApiError,
  normalizeAddress,
  parseRequestBody,
} from "@/lib/serverUtils";

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
    const payload = await parseRequestBody(req);

    const email = String(payload?.email || "")
      .trim()
      .toLowerCase();
    const code = String(payload?.code || "").trim();
    const walletAddressRaw = String(payload?.walletAddress || "");
    const walletAddress = normalizeAddress(walletAddressRaw);
    const requestedMode = typeof payload?.mode === "string" ? String(payload.mode) : "";
    const mode: "login" | "bind" =
      requestedMode === "login" || requestedMode === "bind"
        ? (requestedMode as any)
        : isValidEthAddress(walletAddress)
          ? "bind"
          : "login";
    if (!isValidEmail(email)) {
      return errorResponse("邮箱格式不正确", ApiErrorCode.INVALID_PARAMETERS, 400);
    }
    if (!/^\d{6}$/.test(code)) {
      return errorResponse("验证码格式不正确", ApiErrorCode.INVALID_PARAMETERS, 400);
    }

    const client = supabaseAdmin as any;
    if (!client) return ApiResponses.internalError("Missing service key");

    const now = new Date();
    const nowMs = now.getTime();
    const secretString = resolveEmailOtpSecret().secretString;

    if (mode === "bind") {
      const sessAddr = await getSessionAddress(req);
      if (!sessAddr || sessAddr !== walletAddress) {
        return errorResponse("未认证或会话地址不匹配", ApiErrorCode.UNAUTHORIZED, 401);
      }
      if (!isValidEthAddress(walletAddress)) {
        return ApiResponses.invalidParameters("钱包地址无效");
      }
    }

    const walletKey =
      mode === "login" ? deriveDeterministicAddressFromEmail(email, secretString) : walletAddress;
    const { data: recRaw, error: fetchErr } = await client
      .from("email_otps")
      .select("wallet_address, email, code_hash, expires_at, fail_count, lock_until")
      .eq("wallet_address", walletKey)
      .eq("email", email)
      .maybeSingle();
    if (fetchErr) {
      return ApiResponses.databaseError("Failed to fetch otp", fetchErr.message);
    }
    const rec = (recRaw || null) as Database["public"]["Tables"]["email_otps"]["Row"] | null;
    if (!rec) {
      return errorResponse("验证码未发送或已失效", ApiErrorCode.INVALID_PARAMETERS, 400, {
        reason: "OTP_NOT_FOUND",
      });
    }
    if (rec.lock_until && new Date(rec.lock_until).getTime() > nowMs) {
      const waitMin = Math.ceil((new Date(rec.lock_until).getTime() - nowMs) / 60000);
      return errorResponse(
        `该邮箱已被锁定，请 ${waitMin} 分钟后重试`,
        ApiErrorCode.RATE_LIMIT,
        429,
        { reason: "EMAIL_LOCKED", waitMinutes: waitMin }
      );
    }
    if (new Date(rec.expires_at).getTime() < nowMs) {
      return ApiResponses.invalidParameters("验证码已过期");
    }

    const inputHash = hashEmailOtpCode(code, secretString);
    if (inputHash !== String(rec.code_hash || "")) {
      const nextFail = Number(rec.fail_count || 0) + 1;
      const nextLockUntil = nextFail >= 3 ? new Date(nowMs + 60 * 60_000).toISOString() : null;
      const { error: updErr } = await client
        .from("email_otps")
        .update({
          fail_count: nextFail,
          lock_until: nextLockUntil,
        } satisfies Database["public"]["Tables"]["email_otps"]["Update"])
        .eq("wallet_address", walletKey)
        .eq("email", email);
      if (updErr) {
        return ApiResponses.databaseError("Failed to update otp", updErr.message);
      }
      const remain = Math.max(0, 3 - nextFail);
      const msg =
        remain > 0 ? `验证码不正确，剩余 ${remain} 次尝试` : "连续失败次数过多，已锁定 1 小时";
      return nextFail >= 3
        ? errorResponse(msg, ApiErrorCode.RATE_LIMIT, 429, {
            reason: "OTP_TOO_MANY_ATTEMPTS",
            remaining: remain,
          })
        : errorResponse(msg, ApiErrorCode.INVALID_PARAMETERS, 400, {
            reason: "OTP_INCORRECT",
            remaining: remain,
          });
    }

    const { error: delErr } = await client
      .from("email_otps")
      .delete()
      .eq("wallet_address", walletKey)
      .eq("email", email);
    if (delErr) {
      return ApiResponses.databaseError("Failed to clear otp", delErr.message);
    }

    let sessionAddress = walletAddress;
    if (mode === "login") {
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
        const nowIso = new Date().toISOString();
        const { error: upsertErr } = await client.from("user_profiles").upsert(
          {
            wallet_address: sessionAddress,
            email,
            proxy_wallet_address: email,
            proxy_wallet_type: "email",
            updated_at: nowIso,
          } as Database["public"]["Tables"]["user_profiles"]["Insert"],
          { onConflict: "wallet_address" }
        );
        if (upsertErr) {
          return ApiResponses.databaseError("Failed to bind email", upsertErr.message);
        }
      }
    } else {
      const { error: upsertErr } = await client.from("user_profiles").upsert(
        {
          wallet_address: walletAddress,
          email,
        } as Database["public"]["Tables"]["user_profiles"]["Insert"],
        { onConflict: "wallet_address" }
      );
      if (upsertErr) {
        return ApiResponses.databaseError("Failed to bind email", upsertErr.message);
      }
    }

    const res = successResponse({ ok: true, address: sessionAddress }, "验证成功");
    if (mode === "login") {
      await createSession(res, sessionAddress);
    }
    return res;
  } catch (e: any) {
    const detail = String(e?.message || e);
    logApiError("POST /api/email-otp/verify unhandled error", e);
    return errorResponse(
      "邮箱验证码验证失败",
      ApiErrorCode.INTERNAL_ERROR,
      500,
      process.env.NODE_ENV === "development" ? { error: detail } : undefined
    );
  }
}
