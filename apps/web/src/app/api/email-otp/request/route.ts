import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { createHash } from "crypto";
import {
  getEmailOtpShared,
  normalizeAddress,
  getSessionAddress,
  LogItem,
  OtpRecord,
  parseRequestBody,
  logApiError,
} from "@/lib/serverUtils";
import { ApiResponses, successResponse } from "@/lib/apiResponse";

const EMAIL_OTP_COOKIE = "fs_email_otp";
const EMAIL_OTP_ISSUER = "foresight-email-otp";
const EMAIL_OTP_AUDIENCE = "foresight-users";

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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

async function createEmailOtpToken(payload: {
  email: string;
  address: string;
  codeHash: string;
  failCount: number;
  lockUntil: number;
}) {
  const { secretBytes } = resolveEmailOtpSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(EMAIL_OTP_ISSUER)
    .setAudience(EMAIL_OTP_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secretBytes);
}

async function sendMailSMTP(email: string, code: string) {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || 0);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "noreply@localhost";
  if (!host || !port || !user || !pass) throw new Error("SMTP 未配置完整");
  const nodemailerMod = (await import("nodemailer")) as typeof import("nodemailer");
  const transporter = nodemailerMod.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  const subject = "您的验证码";
  const html = `<div style="font-family:system-ui,Segoe UI,Arial">验证码：<b>${code}</b>（15分钟内有效）。如非本人操作请忽略。</div>`;
  const text = `验证码：${code}（15分钟内有效）。如非本人操作请忽略。`;
  const info = await transporter.sendMail({ from, to: email, subject, text, html });
  const messageId =
    typeof (info as { messageId?: unknown }).messageId === "string"
      ? (info as { messageId: string }).messageId
      : "";
  return String(messageId || "");
}

export async function POST(req: NextRequest) {
  try {
    const { store, logs } = getEmailOtpShared();
    const payload = await parseRequestBody(req);

    const email = String(payload?.email || "")
      .trim()
      .toLowerCase();
    const walletAddress = normalizeAddress(String(payload?.walletAddress || ""));
    const storeKey = `${walletAddress}:${email}`;

    const sessAddr = await getSessionAddress(req);
    if (!sessAddr || sessAddr !== walletAddress) {
      return ApiResponses.unauthorized("未认证或会话地址不匹配");
    }
    if (!isValidEmail(email)) {
      return ApiResponses.invalidParameters("邮箱格式不正确");
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const now = Date.now();
    const rec =
      store.get(storeKey) ||
      ({
        email,
        address: walletAddress,
        code: "",
        expiresAt: 0,
        sentAtList: [],
        failCount: 0,
        lockUntil: 0,
        createdIp: ip || "",
        createdAt: now,
      } as OtpRecord);

    if (rec.lockUntil && now < rec.lockUntil) {
      const waitMin = Math.ceil((rec.lockUntil - now) / 60000);
      return ApiResponses.rateLimit(`该邮箱已被锁定，请 ${waitMin} 分钟后重试`);
    }

    rec.sentAtList = rec.sentAtList || [];
    const rateWindowMs = 60 * 60_000;
    const minIntervalMs = 60_000;
    const maxInWindow = 5;
    rec.sentAtList = rec.sentAtList.filter((t) => typeof t === "number" && now - t < rateWindowMs);
    const lastSentAt = rec.sentAtList.length ? rec.sentAtList[rec.sentAtList.length - 1] : 0;
    if (lastSentAt && now - lastSentAt < minIntervalMs) {
      const waitSec = Math.ceil((minIntervalMs - (now - lastSentAt)) / 1000);
      return ApiResponses.rateLimit(`请求过于频繁，请 ${waitSec} 秒后重试`);
    }
    if (rec.sentAtList.length >= maxInWindow) {
      return ApiResponses.rateLimit("请求过于频繁，请稍后重试");
    }

    const code = genCode();
    rec.code = code;
    rec.expiresAt = now + 15 * 60_000; // 15 分钟有效期
    rec.sentAtList.push(now);
    rec.address = walletAddress;
    rec.createdIp = ip || rec.createdIp;
    store.set(storeKey, rec);

    logs.push({ email, address: walletAddress, status: "queued", sentAt: now } as LogItem);
    try {
      const messageId = await sendMailSMTP(email, code);
      logs.push({
        email,
        address: walletAddress,
        status: "sent",
        messageId,
        sentAt: Date.now(),
      } as LogItem);
      if (logs.length > 1000) logs.splice(0, logs.length - 1000);
      const codeHash = hashEmailOtpCode(code, resolveEmailOtpSecret().secretString);
      const token = await createEmailOtpToken({
        email,
        address: walletAddress,
        codeHash,
        failCount: 0,
        lockUntil: 0,
      });
      const res = successResponse({ expiresInSec: 900 }, "验证码已发送");
      res.cookies.set(EMAIL_OTP_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 15 * 60,
      });
      return res;
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      try {
        const host = process.env.SMTP_HOST || "";
        const port = Number(process.env.SMTP_PORT || 0);
        const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
        const user = process.env.SMTP_USER || "";
        const maskedUser = user ? user.replace(/(^.).*(?=@)/, "$1***") : "";
        console.error("[email-otp] SMTP send error", {
          email,
          address: walletAddress,
          host,
          port,
          secure,
          user: maskedUser,
          error: errMessage,
        });
      } catch {}
      logs.push({
        email,
        address: walletAddress,
        status: "error",
        error: errMessage,
        sentAt: Date.now(),
      } as LogItem);
      if (logs.length > 1000) logs.splice(0, logs.length - 1000);
      if (process.env.NODE_ENV !== "production") {
        const codeHash = hashEmailOtpCode(code, resolveEmailOtpSecret().secretString);
        const token = await createEmailOtpToken({
          email,
          address: walletAddress,
          codeHash,
          failCount: 0,
          lockUntil: 0,
        });
        const res = successResponse(
          {
            codePreview: code,
            expiresInSec: 900,
          },
          "开发环境：邮件发送失败，已直接返回验证码"
        );
        res.cookies.set(EMAIL_OTP_COOKIE, token, {
          httpOnly: true,
          sameSite: "lax",
          secure: false,
          path: "/",
          maxAge: 15 * 60,
        });
        return res;
      }
      return ApiResponses.internalError("邮件发送失败", errMessage);
    }
  } catch (e: unknown) {
    logApiError("POST /api/email-otp/request", e);
    const message = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("邮箱验证码请求失败", message);
  }
}
