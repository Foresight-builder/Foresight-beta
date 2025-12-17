"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);

    // 发送到 Sentry（严重错误）
    Sentry.captureException(error, {
      level: "fatal",
      tags: {
        errorBoundary: "global",
        digest: error.digest,
      },
      contexts: {
        app: {
          crashed: true,
        },
      },
    });

    // 发送到错误日志 API（作为备份）
    if (typeof window !== "undefined") {
      fetch("/api/error-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          digest: error.digest,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // 静默失败，避免无限循环
      });
    }
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              width: "100%",
              background: "white",
              borderRadius: "20px",
              padding: "40px",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <h1
              style={{
                fontSize: "48px",
                margin: "0 0 20px 0",
              }}
            >
              😵
            </h1>
            <h2
              style={{
                fontSize: "24px",
                margin: "0 0 10px 0",
                color: "#333",
              }}
            >
              应用崩溃了
            </h2>
            <p
              style={{
                color: "#666",
                marginBottom: "30px",
              }}
            >
              发生了严重错误，请刷新页面重试
            </p>
            {process.env.NODE_ENV === "development" && (
              <div
                style={{
                  background: "#f5f5f5",
                  padding: "15px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                  textAlign: "left",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#666",
                  overflowWrap: "break-word",
                }}
              >
                {error.message}
              </div>
            )}
            <button
              onClick={reset}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                padding: "12px 30px",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
