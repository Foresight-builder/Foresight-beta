import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 仅在生产环境启用
  enabled: process.env.NODE_ENV === "production",

  // 性能监控采样率（服务端可以更高）
  tracesSampleRate: 0.2,

  // 环境标识
  environment: process.env.NODE_ENV,

  // 发布版本
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "development",

  // 过滤敏感信息
  beforeSend(event) {
    // 移除环境变量中的敏感信息
    if (event.contexts?.runtime?.name === "node") {
      // 不发送敏感的环境变量
      if (event.extra) {
        delete event.extra.SUPABASE_SERVICE_KEY;
        delete event.extra.JWT_SECRET;
        delete event.extra.SMTP_PASS;
      }
    }

    return event;
  },

  // 服务端忽略的错误
  ignoreErrors: ["ECONNRESET", "EPIPE", "ETIMEDOUT"],
});
