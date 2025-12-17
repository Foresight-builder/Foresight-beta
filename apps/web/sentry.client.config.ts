import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 仅在生产环境启用
  enabled: process.env.NODE_ENV === "production",

  // 性能监控采样率（10%）
  tracesSampleRate: 0.1,

  // Session Replay 采样率
  replaysSessionSampleRate: 0.1, // 10% 的会话
  replaysOnErrorSampleRate: 1.0, // 100% 的错误会话

  // 集成
  integrations: [
    Sentry.replayIntegration({
      // 隐藏敏感文本和输入
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // 环境标识
  environment: process.env.NODE_ENV,

  // 发布版本
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "development",

  // 过滤敏感信息
  beforeSend(event, hint) {
    // 移除 Cookie 信息
    if (event.request) {
      delete event.request.cookies;
    }

    // 移除敏感的请求头
    if (event.request?.headers) {
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
    }

    // 过滤掉开发环境的某些错误
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    return event;
  },

  // 忽略某些错误
  ignoreErrors: [
    // 网络错误
    "Network request failed",
    "Failed to fetch",
    "NetworkError",
    "fetch failed",

    // 浏览器扩展错误
    "Extension context invalidated",
    "chrome-extension://",

    // 取消的请求
    "AbortError",
    "The user aborted a request",

    // MetaMask 用户取消
    "User rejected",
    "User denied",
  ],
});
