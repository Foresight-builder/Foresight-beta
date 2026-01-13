import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { ApiResponses, successResponse, errorResponse } from "@/lib/apiResponse";
import { ApiErrorCode } from "@/types/api";
import { createSession } from "@/lib/session";
import { hashEmailOtpCode, isValidEmail, resolveEmailOtpSecret } from "@/lib/otpUtils";
import { createToken, verifyToken } from "@/lib/jwt";
import {
  getSessionAddress,
  getRequestId,
  logApiError,
  logApiEvent,
  normalizeAddress,
  parseRequestBody,
} from "@/lib/serverUtils";
import { getIP } from "@/lib/rateLimit";

const EMAIL_CHANGE_COOKIE_NAME = "fs_email_change";

function isValidEthAddress(addr: string) {
  return /^0x[a-f0-9]{40}$/.test(normalizeAddress(String(addr || "")));
}

function deriveDeterministicAddressFromEmail(email: string, secretString: string) {
  const h = createHash("sha256")
    .update(`email-login:${email}:${secretString}`, "utf8")
    .digest("hex");
  return normalizeAddress(`0x${h.slice(0, 40)}`);
}

const SQL_CREATE_EMAIL_OTPS_TABLE = `
CREATE TABLE IF NOT EXISTS public.email_otps (
  wallet_address TEXT NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_window_start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_in_window INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  lock_until TIMESTAMPTZ,
  created_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (wallet_address, email)
);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
`.trim();

function isMissingEmailOtpsTable(error?: { message?: string | null; code?: string | null }) {
  const msg = String(error?.message || "").toLowerCase();
  if (!msg) return false;
  return (
    (msg.includes("relation") && msg.includes("email_otps") && msg.includes("does not exist")) ||
    (msg.includes("could not find the table") && msg.includes("email_otps"))
  );
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
    const mode: "login" | "bind" | "change_old" | "change_new" =
      requestedMode === "login" ||
      requestedMode === "bind" ||
      requestedMode === "change_old" ||
      requestedMode === "change_new"
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

    const reqId = getRequestId(req);
    const ip = getIP(req);
    const now = new Date();
    const nowMs = now.getTime();
    const secretString = resolveEmailOtpSecret().secretString;

    if (mode === "bind" || mode === "change_old" || mode === "change_new") {
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
      if (isMissingEmailOtpsTable(fetchErr)) {
        return ApiResponses.databaseError("邮箱验证码未初始化：缺少 email_otps 表", {
          setupRequired: true,
          sql: SQL_CREATE_EMAIL_OTPS_TABLE,
          detail: fetchErr.message,
        });
      }
      return ApiResponses.databaseError("Failed to fetch otp", fetchErr.message);
    }
    const rec = (recRaw || null) as Database["public"]["Tables"]["email_otps"]["Row"] | null;
    if (!rec) {
      try {
        await logApiEvent("email_login_code_verify_failed", {
          reason: "OTP_NOT_FOUND",
          addr: walletKey ? walletKey.slice(0, 8) : "",
          emailDomain: email.split("@")[1] || "",
          requestId: reqId || undefined,
        });
      } catch {}
      return errorResponse("验证码未发送或已失效", ApiErrorCode.INVALID_PARAMETERS, 400, {
        reason: "OTP_NOT_FOUND",
      });
    }
    if (rec.lock_until && new Date(rec.lock_until).getTime() > nowMs) {
      const waitMin = Math.ceil((new Date(rec.lock_until).getTime() - nowMs) / 60000);
      try {
        await logApiEvent("email_login_rate_limited", {
          reason: "EMAIL_LOCKED",
          addr: walletKey ? walletKey.slice(0, 8) : "",
          emailDomain: email.split("@")[1] || "",
          waitMinutes: waitMin,
          requestId: reqId || undefined,
        });
      } catch {}
      try {
        await logApiEvent("email_login_locked", {
          reason: "EMAIL_LOCKED",
          addr: walletKey ? walletKey.slice(0, 8) : "",
          emailDomain: email.split("@")[1] || "",
          waitMinutes: waitMin,
          requestId: reqId || undefined,
        });
      } catch {}
      return errorResponse(
        `该邮箱已被锁定，请 ${waitMin} 分钟后重试`,
        ApiErrorCode.RATE_LIMIT,
        429,
        { reason: "EMAIL_LOCKED", waitMinutes: waitMin }
      );
    }
    if (new Date(rec.expires_at).getTime() < nowMs) {
      try {
        await logApiEvent("email_login_code_verify_failed", {
          reason: "OTP_EXPIRED",
          addr: walletKey ? walletKey.slice(0, 8) : "",
          emailDomain: email.split("@")[1] || "",
          requestId: reqId || undefined,
        });
      } catch {}
      try {
        await client.from("email_otps").delete().eq("wallet_address", walletKey).eq("email", email);
      } catch {}
      return errorResponse("验证码已过期", ApiErrorCode.INVALID_PARAMETERS, 400, {
        reason: "OTP_EXPIRED",
      });
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
      try {
        await logApiEvent(
          nextFail >= 3 ? "email_login_rate_limited" : "email_login_code_verify_failed",
          {
            reason: nextFail >= 3 ? "OTP_TOO_MANY_ATTEMPTS" : "OTP_INCORRECT",
            addr: walletKey ? walletKey.slice(0, 8) : "",
            emailDomain: email.split("@")[1] || "",
            remaining: remain,
            requestId: reqId || undefined,
          }
        );
      } catch {}
      if (nextFail >= 3) {
        try {
          await logApiEvent("email_login_locked", {
            reason: "OTP_TOO_MANY_ATTEMPTS",
            addr: walletKey ? walletKey.slice(0, 8) : "",
            emailDomain: email.split("@")[1] || "",
            remaining: remain,
            requestId: reqId || undefined,
          });
        } catch {}
      }
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
    if (mode === "change_old" || mode === "change_new") {
      const { data: prof, error: profErr } = await client
        .from("user_profiles")
        .select("email")
        .eq("wallet_address", walletAddress)
        .maybeSingle();
      if (profErr) {
        return ApiResponses.databaseError("Failed to load user profile", profErr.message);
      }
      const currentEmail = String((prof as any)?.email || "")
        .trim()
        .toLowerCase();
      if (!currentEmail) {
        return errorResponse("请先完成邮箱验证", ApiErrorCode.INVALID_PARAMETERS, 400);
      }

      if (mode === "change_old") {
        if (email !== currentEmail) {
          return errorResponse("邮箱不匹配", ApiErrorCode.FORBIDDEN, 403);
        }
        const token = await createToken(walletAddress, undefined, 15 * 60, {
          tokenType: "email_change",
          extra: { ecStage: "old_verified", ecOldEmail: currentEmail },
        });
        const res = successResponse({ ok: true, stage: "old_verified" }, "验证成功");
        res.cookies.set(EMAIL_CHANGE_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 15 * 60,
        });
        return res;
      }

      const raw = req.cookies.get(EMAIL_CHANGE_COOKIE_NAME)?.value || "";
      const cookiePayload = raw ? await verifyToken(raw) : null;
      const cookieAddr = typeof cookiePayload?.address === "string" ? cookiePayload.address : "";
      const tokenType =
        typeof (cookiePayload as any)?.tokenType === "string"
          ? String((cookiePayload as any).tokenType)
          : "";
      const oldEmail =
        typeof (cookiePayload as any)?.ecOldEmail === "string"
          ? String((cookiePayload as any).ecOldEmail)
          : "";
      const stage =
        typeof (cookiePayload as any)?.ecStage === "string"
          ? String((cookiePayload as any).ecStage)
          : "";

      if (!cookiePayload || tokenType !== "email_change" || stage !== "old_verified") {
        return errorResponse("请先验证当前邮箱", ApiErrorCode.INVALID_PARAMETERS, 400);
      }
      if (!cookieAddr || cookieAddr.toLowerCase() !== walletAddress.toLowerCase()) {
        return errorResponse("请先验证当前邮箱", ApiErrorCode.INVALID_PARAMETERS, 400);
      }
      if (!oldEmail || oldEmail.toLowerCase() !== currentEmail.toLowerCase()) {
        return errorResponse("请先验证当前邮箱", ApiErrorCode.INVALID_PARAMETERS, 400);
      }
      if (email === currentEmail) {
        return errorResponse("新邮箱不能与当前邮箱相同", ApiErrorCode.INVALID_PARAMETERS, 400);
      }

      const { data: existingList, error: existingErr } = await client
        .from("user_profiles")
        .select("wallet_address,proxy_wallet_type")
        .eq("email", email)
        .limit(10);
      if (existingErr) {
        return ApiResponses.databaseError("Failed to load user profile", existingErr.message);
      }
      const list = Array.isArray(existingList) ? existingList : [];
      const conflict = list.find((r: any) => {
        const wa = normalizeAddress(String(r?.wallet_address || ""));
        if (!wa || wa.toLowerCase() === walletAddress.toLowerCase()) return false;
        const p = String(r?.proxy_wallet_type || "")
          .trim()
          .toLowerCase();
        return p !== "email";
      });
      if (conflict) {
        return errorResponse("该邮箱已被其他账号占用", ApiErrorCode.ALREADY_EXISTS, 409);
      }

      const { error: upsertErr } = await client.from("user_profiles").upsert(
        {
          wallet_address: walletAddress,
          email,
        } as Database["public"]["Tables"]["user_profiles"]["Insert"],
        { onConflict: "wallet_address" }
      );
      if (upsertErr) {
        return ApiResponses.databaseError("Failed to change email", upsertErr.message);
      }

      const res = successResponse({ ok: true }, "验证成功");
      res.cookies.set(EMAIL_CHANGE_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

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
      await createSession(res, sessionAddress, undefined, { req, authMethod: "email_otp" });
    }
    try {
      if (mode === "login") {
        await logApiEvent("email_login_code_verified", {
          addr: sessionAddress ? sessionAddress.slice(0, 8) : "",
          emailDomain: email.split("@")[1] || "",
          requestId: reqId || undefined,
          ip: ip ? String(ip).split(".").slice(0, 2).join(".") + ".*.*" : "",
        });
      }
    } catch {}
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
