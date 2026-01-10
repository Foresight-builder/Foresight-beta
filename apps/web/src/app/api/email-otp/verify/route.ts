import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getEmailOtpShared,
  normalizeAddress,
  getSessionAddress,
  LogItem,
  parseRequestBody,
  logApiError,
} from "@/lib/serverUtils";
import { Database } from "@/lib/database.types";
import { ApiResponses, successResponse } from "@/lib/apiResponse";

const EMAIL_OTP_COOKIE = "fs_email_otp";
const EMAIL_OTP_ISSUER = "foresight-email-otp";
const EMAIL_OTP_AUDIENCE = "foresight-users";

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function resolveEmailOtpSecret(): { secretBytes: Uint8Array; secretString: string } {
  const raw = (process.env.JWT_SECRET || "").trim();
  if (raw) return { secretBytes: new TextEncoder().encode(raw), secretString: raw };
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing JWT_SECRET");
  }
  const fallback = "your-secret-key-change-in-production";
  return { secretBytes: new TextEncoder().encode(fallback), secretString: fallback };
}

function hashEmailOtpCode(code: string, secretString: string): string {
  return createHash("sha256").update(`${code}:${secretString}`, "utf8").digest("hex");
}

async function createEmailOtpToken(
  payload: {
    email: string;
    address: string;
    codeHash: string;
    failCount: number;
    lockUntil: number;
  },
  exp?: number
) {
  const { secretBytes } = resolveEmailOtpSecret();
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(EMAIL_OTP_ISSUER)
    .setAudience(EMAIL_OTP_AUDIENCE)
    .setIssuedAt();
  if (typeof exp === "number" && Number.isFinite(exp) && exp > 0) {
    jwt.setExpirationTime(exp);
  } else {
    jwt.setExpirationTime("15m");
  }
  return jwt.sign(secretBytes);
}

export async function POST(req: NextRequest) {
  try {
    const { store, logs } = getEmailOtpShared();
    const payload = await parseRequestBody(req);

    const email = String(payload?.email || "")
      .trim()
      .toLowerCase();
    const code = String(payload?.code || "").trim();
    const walletAddress = normalizeAddress(String(payload?.walletAddress || ""));
    const storeKey = `${walletAddress}:${email}`;

    const sessAddr = await getSessionAddress(req);
    if (!sessAddr || sessAddr !== walletAddress) {
      return ApiResponses.unauthorized("未认证或会话地址不匹配");
    }
    if (!isValidEmail(email)) {
      return ApiResponses.invalidParameters("邮箱格式不正确");
    }
    if (!/^\d{6}$/.test(code)) {
      return ApiResponses.invalidParameters("验证码格式不正确");
    }

    const now = Date.now();
    const cookieToken = req.cookies.get(EMAIL_OTP_COOKIE)?.value || "";
    if (cookieToken) {
      const { secretBytes, secretString } = resolveEmailOtpSecret();
      const verified = await jwtVerify(cookieToken, secretBytes, {
        issuer: EMAIL_OTP_ISSUER,
        audience: EMAIL_OTP_AUDIENCE,
      }).catch(() => null);

      const raw = verified?.payload || null;
      const tokenEmail = typeof (raw as any)?.email === "string" ? String((raw as any).email) : "";
      const tokenAddress =
        typeof (raw as any)?.address === "string" ? String((raw as any).address) : "";
      const tokenCodeHash =
        typeof (raw as any)?.codeHash === "string" ? String((raw as any).codeHash) : "";
      const tokenFailCount =
        typeof (raw as any)?.failCount === "number" ? Number((raw as any).failCount) : 0;
      const tokenLockUntil =
        typeof (raw as any)?.lockUntil === "number" ? Number((raw as any).lockUntil) : 0;
      const tokenExp = typeof (raw as any)?.exp === "number" ? Number((raw as any).exp) : undefined;

      if (!tokenEmail || !tokenAddress || !tokenCodeHash) {
        const res = ApiResponses.invalidParameters("验证码未发送或已失效");
        res.cookies.set(EMAIL_OTP_COOKIE, "", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 0,
        });
        return res;
      }

      if (tokenEmail !== email || normalizeAddress(tokenAddress) !== walletAddress) {
        return ApiResponses.unauthorized("未认证或会话地址不匹配");
      }

      if (tokenLockUntil && now < tokenLockUntil) {
        const waitMin = Math.ceil((tokenLockUntil - now) / 60000);
        return ApiResponses.rateLimit(`该邮箱已被锁定，请 ${waitMin} 分钟后重试`);
      }

      const inputHash = hashEmailOtpCode(code, secretString);
      if (inputHash !== tokenCodeHash) {
        const nextFail = tokenFailCount + 1;
        const nextLockUntil = nextFail >= 3 ? now + 60 * 60_000 : 0;
        const nextToken = await createEmailOtpToken(
          {
            email,
            address: walletAddress,
            codeHash: tokenCodeHash,
            failCount: nextFail,
            lockUntil: nextLockUntil,
          },
          tokenExp
        );
        const remain = Math.max(0, 3 - nextFail);
        const msg =
          remain > 0 ? `验证码不正确，剩余 ${remain} 次尝试` : "连续失败次数过多，已锁定 1 小时";
        const res =
          nextFail >= 3 ? ApiResponses.rateLimit(msg) : ApiResponses.invalidParameters(msg);
        res.cookies.set(EMAIL_OTP_COOKIE, nextToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 15 * 60,
        });
        return res;
      }
    } else {
      const rec = store.get(storeKey);
      if (!rec) {
        return ApiResponses.invalidParameters("验证码未发送或已失效");
      }
      if (rec.address && rec.address !== walletAddress) {
        return ApiResponses.unauthorized("未认证或会话地址不匹配");
      }
      if (rec.lockUntil && now < rec.lockUntil) {
        const waitMin = Math.ceil((rec.lockUntil - now) / 60000);
        return ApiResponses.rateLimit(`该邮箱已被锁定，请 ${waitMin} 分钟后重试`);
      }
      if (now > rec.expiresAt) {
        return ApiResponses.invalidParameters("验证码已过期");
      }
      if (code !== rec.code) {
        rec.failCount = (rec.failCount || 0) + 1;
        if (rec.failCount >= 3) {
          rec.lockUntil = now + 60 * 60_000;
        }
        store.set(storeKey, rec);
        const remain = Math.max(0, 3 - rec.failCount);
        const msg =
          remain > 0 ? `验证码不正确，剩余 ${remain} 次尝试` : "连续失败次数过多，已锁定 1 小时";
        return rec.failCount >= 3
          ? ApiResponses.rateLimit(msg)
          : ApiResponses.invalidParameters(msg);
      }
    }

    // 通过验证：绑定邮箱到钱包地址
    const client = supabaseAdmin as any;
    if (!client) return ApiResponses.internalError("Supabase not configured");
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

    // 审计记录（内存）：时间戳与 IP
    try {
      logs.push({
        email,
        address: walletAddress,
        status: "verified",
        sentAt: Date.now(),
      } as LogItem);
      if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    } catch (e) {
      logApiError("[email-otp] push verified log failed", e);
    }

    // 清理使用过的记录
    store.delete(storeKey);

    const res = successResponse({ ok: true }, "验证成功");
    res.cookies.set(EMAIL_OTP_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (e: any) {
    const detail = String(e?.message || e);
    logApiError("POST /api/email-otp/verify unhandled error", e);
    return ApiResponses.internalError(
      "邮箱验证码验证失败",
      process.env.NODE_ENV === "development" ? detail : undefined
    );
  }
}
