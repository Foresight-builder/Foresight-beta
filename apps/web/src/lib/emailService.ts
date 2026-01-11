import { createTransport } from "nodemailer";

export async function sendMailSMTP(email: string, code: string) {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || 0);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "noreply@localhost";

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP 未配置完整");
  }

  const transporter = createTransport({
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
