/**
 * 数据库连接池配置
 * 优化 Supabase 客户端连接管理
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { log } from "./logger";

interface PoolConfig {
  maxConnections: number;
  idleTimeout: number; // 毫秒
  connectionTimeout: number; // 毫秒
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxConnections: 10,
  idleTimeout: 30000, // 30秒
  connectionTimeout: 10000, // 10秒
};

/**
 * Supabase 连接池管理器
 */
class SupabasePool {
  private clients: Map<string, SupabaseClient<Database>> = new Map();
  private lastUsed: Map<string, number> = new Map();
  private config: PoolConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * 获取客户端连接
   */
  getClient(url: string, key: string, id: string = "default"): SupabaseClient<Database> {
    const clientId = `${id}-${url}`;

    // 检查是否已存在
    if (this.clients.has(clientId)) {
      this.lastUsed.set(clientId, Date.now());
      return this.clients.get(clientId)!;
    }

    // 检查连接数限制
    if (this.clients.size >= this.config.maxConnections) {
      log.warn(`Connection pool limit reached (${this.config.maxConnections})`);
      // 移除最久未使用的连接
      this.removeOldestClient();
    }

    // 创建新连接
    const client = createClient<Database>(url, key, {
      auth: {
        persistSession: false, // 服务端不需要持久化 session
        autoRefreshToken: false,
      },
      db: {
        schema: "public",
      },
      global: {
        headers: {
          "x-client-info": "foresight-pool",
        },
      },
    });

    this.clients.set(clientId, client);
    this.lastUsed.set(clientId, Date.now());

    log.debug(`Created new Supabase client: ${clientId}`);

    return client;
  }

  /**
   * 释放客户端连接
   */
  releaseClient(id: string) {
    if (this.clients.has(id)) {
      this.clients.delete(id);
      this.lastUsed.delete(id);
      log.debug(`Released Supabase client: ${id}`);
    }
  }

  /**
   * 移除最久未使用的客户端
   */
  private removeOldestClient() {
    let oldestId: string | null = null;
    let oldestTime = Date.now();

    for (const [id, time] of this.lastUsed.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.releaseClient(oldestId);
    }
  }

  /**
   * 清理空闲连接
   */
  private cleanup() {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, time] of this.lastUsed.entries()) {
      if (now - time > this.config.idleTimeout) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.releaseClient(id);
    }

    if (toRemove.length > 0) {
      log.debug(`Cleaned up ${toRemove.length} idle connections`);
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.idleTimeout);
  }

  /**
   * 停止清理并关闭所有连接
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.clients.clear();
    this.lastUsed.clear();

    log.info("Supabase pool destroyed");
  }

  /**
   * 获取连接池状态
   */
  getStats() {
    return {
      total: this.clients.size,
      max: this.config.maxConnections,
      idle: Array.from(this.lastUsed.values()).filter((time) => Date.now() - time > 5000).length,
    };
  }
}

// 全局连接池实例
let globalPool: SupabasePool | null = null;

/**
 * 获取全局连接池
 */
export function getPool(): SupabasePool {
  if (!globalPool) {
    globalPool = new SupabasePool({
      maxConnections: parseInt(process.env.DB_POOL_MAX || "10"),
      idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000"),
      connectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || "10000"),
    });
  }

  return globalPool;
}

/**
 * 获取 Supabase 客户端（使用连接池）
 */
export function getPooledClient(
  url?: string,
  key?: string,
  id: string = "default"
): SupabaseClient<Database> | null {
  const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    log.error("Supabase credentials not configured");
    return null;
  }

  const pool = getPool();
  return pool.getClient(supabaseUrl, supabaseKey, id);
}

/**
 * 获取连接池统计信息
 */
export function getPoolStats() {
  if (!globalPool) {
    return { total: 0, max: 0, idle: 0 };
  }

  return globalPool.getStats();
}

/**
 * 销毁连接池
 */
export function destroyPool() {
  if (globalPool) {
    globalPool.destroy();
    globalPool = null;
  }
}

// 导出类型
export type { PoolConfig };
export { SupabasePool };
