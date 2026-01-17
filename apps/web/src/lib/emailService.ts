import { createHash } from "crypto";

let cachedSmtpTransporter: any | null = null;
let cachedSmtpKey = "";

function computeSmtpKey() {
  const smtpUrl = (process.env.SMTP_URL || "").trim();
  const host = process.env.SMTP_HOST || "";
  const port = String(process.env.SMTP_PORT || "");
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase();
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "";
  const pool = String(process.env.SMTP_POOL || "");
  const maxConnections = String(process.env.SMTP_POOL_MAX_CONNECTIONS || "");
  const maxMessages = String(process.env.SMTP_POOL_MAX_MESSAGES || "");
  const connectionTimeoutMs = String(process.env.SMTP_CONNECTION_TIMEOUT_MS || "");
  const greetingTimeoutMs = String(process.env.SMTP_GREETING_TIMEOUT_MS || "");
  const socketTimeoutMs = String(process.env.SMTP_SOCKET_TIMEOUT_MS || "");
  const raw = `${smtpUrl}|${host}|${port}|${secure}|${user}|${pass}|${from}|${pool}|${maxConnections}|${maxMessages}|${connectionTimeoutMs}|${greetingTimeoutMs}|${socketTimeoutMs}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function getMissingSmtpEnv(params: {
  smtpUrl: string;
  host: string;
  port: number;
  user: string;
  pass: string;
}) {
  if (params.smtpUrl.trim()) return [];
  const missing: string[] = [];
  if (!params.host.trim()) missing.push("SMTP_HOST");
  if (!Number.isFinite(params.port) || params.port <= 0) missing.push("SMTP_PORT");
  if (!params.user.trim()) missing.push("SMTP_USER");
  if (!params.pass.trim()) missing.push("SMTP_PASS");
  return missing;
}

function isRetryableSmtpError(err: unknown) {
  const e = err as any;
  const code = typeof e?.code === "string" ? e.code : "";
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "EPIPE" ||
    code === "EAI_AGAIN"
  ) {
    return true;
  }
  const responseCode = typeof e?.responseCode === "number" ? e.responseCode : 0;
  if ([421, 450, 451, 452, 454].includes(responseCode)) return true;
  const message = typeof e?.message === "string" ? e.message : "";
  if (/timeout|timed out|Connection closed|read ECONNRESET/i.test(message)) return true;
  return false;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function getSmtpTransporter() {
  const key = computeSmtpKey();
  if (cachedSmtpTransporter && cachedSmtpKey === key) return cachedSmtpTransporter;

  const smtpUrl = (process.env.SMTP_URL || "").trim();
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || 0);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const missing = getMissingSmtpEnv({ smtpUrl, host, port, user, pass });
  if (missing.length) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`SMTP 未配置完整：缺少 ${missing.join(", ")}`);
    }
    cachedSmtpTransporter = null;
    cachedSmtpKey = key;
    return null;
  }

  const pool = String(process.env.SMTP_POOL || "").toLowerCase() !== "false";
  const maxConnections = Math.max(
    1,
    Math.min(20, Number(process.env.SMTP_POOL_MAX_CONNECTIONS || 5))
  );
  const maxMessages = Math.max(
    1,
    Math.min(1000, Number(process.env.SMTP_POOL_MAX_MESSAGES || 100))
  );
  const connectionTimeout = Math.max(
    1000,
    Math.min(120_000, Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10_000))
  );
  const greetingTimeout = Math.max(
    1000,
    Math.min(120_000, Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10_000))
  );
  const socketTimeout = Math.max(
    1000,
    Math.min(300_000, Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20_000))
  );

  const nodemailerMod = (await import("nodemailer")) as typeof import("nodemailer");
  const transporter = smtpUrl
    ? nodemailerMod.createTransport(smtpUrl, {
        pool,
        maxConnections,
        maxMessages,
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
      } as any)
    : nodemailerMod.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        pool,
        maxConnections,
        maxMessages,
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
      } as any);

  cachedSmtpTransporter = transporter;
  cachedSmtpKey = key;
  return transporter;
}

export async function sendRawEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const from = process.env.SMTP_FROM || "noreply@localhost";
  const transporter = await getSmtpTransporter();
  if (!transporter) return "";

  const maxAttempts = Math.max(1, Math.min(5, Number(process.env.SMTP_SEND_MAX_ATTEMPTS || 2)));
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const info = await transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      const messageId =
        typeof (info as { messageId?: unknown }).messageId === "string"
          ? (info as { messageId: string }).messageId
          : "";
      return String(messageId || "");
    } catch (err: unknown) {
      lastErr = err;
      if (attempt >= maxAttempts || !isRetryableSmtpError(err)) break;
      const baseDelay = Math.max(
        50,
        Math.min(5000, Number(process.env.SMTP_SEND_RETRY_BASE_DELAY_MS || 250))
      );
      const delay = Math.min(10_000, baseDelay * Math.pow(2, attempt - 1));
      await sleep(delay);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function sendMailSMTP(email: string, code: string) {
  const subject = "您的验证码";
  const html = `<div style="font-family:system-ui,Segoe UI,Arial">验证码：<b>${code}</b>（15分钟内有效）。如非本人操作请忽略。</div>`;
  const text = `验证码：${code}（15分钟内有效）。如非本人操作请忽略。`;
  return sendRawEmail({ to: email, subject, text, html });
}

export async function sendMagicLinkEmail(email: string, loginUrl: string, code: string) {
  const subject = "登录 Foresight";
  const safeUrl = loginUrl.replace(/"/g, "%22");
  const html = `<div style="font-family:system-ui,Segoe UI,Arial;line-height:1.5"><p>点击按钮一键登录：</p><p><a href="${safeUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px">一键登录</a></p><p>若按钮不可用，可在页面输入验证码：<b>${code}</b>（15分钟内有效）。</p><p>如非本人操作请忽略。</p></div>`;
  const text = `一键登录：${loginUrl}\n验证码：${code}（15分钟内有效）。如非本人操作请忽略。`;
  return sendRawEmail({ to: email, subject, text, html });
}
