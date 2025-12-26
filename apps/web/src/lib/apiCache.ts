/**
 * 🚀 API 缓存工具
 * 
 * 提供多层缓存策略：
 * - 内存缓存（最快，但页面刷新后失效）
 * - HTTP 缓存头（浏览器级别缓存）
 */

import { NextResponse } from "next/server";

// 内存缓存存储
const memoryCache = new Map<string, { data: unknown; expiry: number }>();

// 定期清理过期缓存
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (value.expiry < now) {
        memoryCache.delete(key);
      }
    }
  }, 60 * 1000); // 每分钟清理一次
}

/**
 * 从内存缓存获取数据
 */
export function getFromCache<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (cached.expiry < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

/**
 * 设置内存缓存
 */
export function setCache<T>(key: string, data: T, ttlMs: number): void {
  memoryCache.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  });
}

/**
 * 生成缓存键
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `${prefix}:${sortedParams}`;
}

/**
 * 缓存配置预设
 */
export const CachePresets = {
  /** 短期缓存：5秒，适用于频繁变化的数据 */
  SHORT: {
    maxAge: 5,
    staleWhileRevalidate: 10,
    memoryTtl: 5 * 1000,
  },
  /** 中等缓存：30秒，适用于列表数据 */
  MEDIUM: {
    maxAge: 30,
    staleWhileRevalidate: 60,
    memoryTtl: 30 * 1000,
  },
  /** 长期缓存：5分钟，适用于不常变化的数据 */
  LONG: {
    maxAge: 300,
    staleWhileRevalidate: 600,
    memoryTtl: 5 * 60 * 1000,
  },
  /** 静态缓存：1小时，适用于几乎不变的数据 */
  STATIC: {
    maxAge: 3600,
    staleWhileRevalidate: 7200,
    memoryTtl: 60 * 60 * 1000,
  },
} as const;

type CachePreset = (typeof CachePresets)[keyof typeof CachePresets];

/**
 * 🚀 创建带缓存的 API 响应
 * 
 * @example
 * ```ts
 * return createCachedResponse(
 *   { success: true, data },
 *   CachePresets.MEDIUM
 * );
 * ```
 */
export function createCachedResponse<T>(
  data: T,
  preset: CachePreset,
  options?: { status?: number; cacheKey?: string }
) {
  const { status = 200, cacheKey } = options ?? {};

  // 如果提供了缓存键，同时存入内存缓存
  if (cacheKey) {
    setCache(cacheKey, data, preset.memoryTtl);
  }

  return NextResponse.json(data, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${preset.maxAge}, stale-while-revalidate=${preset.staleWhileRevalidate}`,
    },
  });
}

/**
 * 🚀 缓存装饰器 - 用于 API 路由
 * 
 * @example
 * ```ts
 * export const GET = withCache(
 *   async (request) => {
 *     const data = await fetchData();
 *     return { success: true, data };
 *   },
 *   {
 *     preset: CachePresets.MEDIUM,
 *     keyGenerator: (req) => `predictions:${req.nextUrl.searchParams.toString()}`,
 *   }
 * );
 * ```
 */
export function withCache<T>(
  handler: (request: Request) => Promise<T>,
  config: {
    preset: CachePreset;
    keyGenerator: (request: Request) => string;
  }
) {
  return async (request: Request) => {
    const cacheKey = config.keyGenerator(request);
    
    // 检查内存缓存
    const cached = getFromCache<T>(cacheKey);
    if (cached) {
      return createCachedResponse(cached, config.preset);
    }
    
    // 执行处理器
    const result = await handler(request);
    
    // 返回带缓存的响应
    return createCachedResponse(result, config.preset, { cacheKey });
  };
}

/**
 * 🚀 批量失效缓存
 */
export function invalidateCache(pattern: string | RegExp): number {
  let count = 0;
  
  for (const key of memoryCache.keys()) {
    const matches =
      typeof pattern === "string" ? key.startsWith(pattern) : pattern.test(key);
    
    if (matches) {
      memoryCache.delete(key);
      count++;
    }
  }
  
  return count;
}

/**
 * 获取缓存统计
 */
export function getCacheStats() {
  let validCount = 0;
  let expiredCount = 0;
  const now = Date.now();

  for (const value of memoryCache.values()) {
    if (value.expiry > now) {
      validCount++;
    } else {
      expiredCount++;
    }
  }

  return {
    total: memoryCache.size,
    valid: validCount,
    expired: expiredCount,
  };
}

