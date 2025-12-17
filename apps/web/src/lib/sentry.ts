/**
 * Sentry 错误追踪工具函数
 */
import * as Sentry from "@sentry/nextjs";

/**
 * 追踪自定义错误
 */
export function captureError(error: Error | string, context?: Record<string, any>) {
  if (typeof error === "string") {
    Sentry.captureMessage(error, {
      level: "error",
      extra: context,
    });
  } else {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * 追踪警告信息
 */
export function captureWarning(message: string, context?: Record<string, any>) {
  Sentry.captureMessage(message, {
    level: "warning",
    extra: context,
  });
}

/**
 * 设置用户上下文
 */
export function setUser(user: { id: string; address?: string; email?: string }) {
  Sentry.setUser({
    id: user.id,
    username: user.address,
    email: user.email,
  });
}

/**
 * 清除用户上下文
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * 添加面包屑（用户行为追踪）
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: "info",
    timestamp: Date.now() / 1000,
  });
}

/**
 * 追踪性能
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan(
    {
      name,
      op,
    },
    (span) => span
  );
}

/**
 * 业务错误追踪助手
 */
export const SentryHelpers = {
  // 钱包错误
  walletError: (error: Error, walletType?: string) => {
    Sentry.captureException(error, {
      tags: {
        category: "wallet",
        walletType,
      },
    });
  },

  // 订单错误
  orderError: (error: Error, orderId?: string, chainId?: number) => {
    Sentry.captureException(error, {
      tags: {
        category: "order",
        chainId,
      },
      extra: {
        orderId,
      },
    });
  },

  // API 错误
  apiError: (error: Error, endpoint: string, method: string) => {
    Sentry.captureException(error, {
      tags: {
        category: "api",
        endpoint,
        method,
      },
    });
  },

  // 合约交互错误
  contractError: (error: Error, contractAddress?: string, method?: string) => {
    Sentry.captureException(error, {
      tags: {
        category: "contract",
        contractAddress,
        method,
      },
    });
  },
};
