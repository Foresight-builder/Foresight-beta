import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Edge Runtime 配置
  enabled: process.env.NODE_ENV === "production",

  tracesSampleRate: 0.1,

  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "development",
});
