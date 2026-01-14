/**
 * Supabase Client 主入口
 * 自动根据环境选择客户端或服务器端实现
 * 注意：此文件不包含任何直接的createClient调用，避免构建时的"self is not defined"错误
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database };

// 数据库表类型定义
export type Prediction = Database["public"]["Tables"]["predictions"]["Row"] & {
  outcomes?: Database["public"]["Tables"]["prediction_outcomes"]["Row"][]; // 扩展字段，用于关联查询
};

export type Category = Database["public"]["Tables"]["categories"]["Row"];

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  wallet_address?: string;
  created_at: string;
  updated_at: string;
}

export interface Bet {
  id: number;
  user_id: number;
  prediction_id: number;
  amount: number;
  outcome: "yes" | "no";
  created_at: string;
}

// 热门专题相关表
export type TrendingEvent = Database["public"]["Tables"]["predictions"]["Row"] & {
  image_url: string; // 确保不为 null
};

export type EventFollow = Database["public"]["Tables"]["event_follows"]["Row"];

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];

// 环境检测
const isServer = typeof window === "undefined";

// 动态导入客户端或服务器端实现
let browserClient: SupabaseClient<Database> | null = null;
let serverClient: SupabaseClient<Database> | null = null;

// 初始化函数，仅在需要时调用
async function initBrowserClient() {
  if (!browserClient) {
    const { getBrowserClient: getBrowserClientImpl } = await import("./supabase.client");
    browserClient = getBrowserClientImpl();
  }
  return browserClient;
}

function initServerClientSync(): SupabaseClient<Database> | null {
  if (serverClient) return serverClient;
  try {
    const { getServerClient, supabaseAdmin } = require("./supabase.server");
    serverClient = (supabaseAdmin ||
      (typeof getServerClient === "function"
        ? getServerClient()
        : null)) as SupabaseClient<Database> | null;
    return serverClient;
  } catch (error) {
    return null;
  }
}

// 保持原有API兼容性 - 同步获取客户端
// 注意：在服务器端，这个函数可能返回null，需要调用方处理
// 在客户端，会在首次调用时初始化
let cachedClient: SupabaseClient<Database> | null = null;

// 兼容原有API的同步getClient函数
export function getClient(_id?: string): SupabaseClient<Database> | null {
  if (cachedClient) return cachedClient;

  if (isServer) {
    cachedClient = initServerClientSync();
    return cachedClient;
  }

  // 对于客户端，我们可以同步初始化
  try {
    const { supabase: client } = require("./supabase.client");
    cachedClient = client;
    return cachedClient;
  } catch (error) {
    return null;
  }
}

// 异步版本的getClient，推荐使用
export async function getClientAsync(_id?: string): Promise<SupabaseClient<Database> | null> {
  if (cachedClient) return cachedClient;

  if (isServer) {
    cachedClient = initServerClientSync();
  } else {
    cachedClient = await initBrowserClient();
  }
  return cachedClient;
}

// 客户端专用函数（同步）
export function getBrowserClient(): SupabaseClient<Database> | null {
  if (isServer) return null;

  try {
    const { supabase: client } = require("./supabase.client");
    return client;
  } catch (error) {
    return null;
  }
}

// 客户端专用函数（异步，推荐使用）
export async function getBrowserClientAsync(): Promise<SupabaseClient<Database> | null> {
  if (isServer) return null;
  return await initBrowserClient();
}

// 导出的客户端实例（仅在客户端环境中可用）
export const supabase: SupabaseClient<Database> | null = isServer
  ? null
  : (() => {
      try {
        const { supabase: client } = require("./supabase.client");
        return client;
      } catch (error) {
        return null;
      }
    })();

export const supabaseAdmin: SupabaseClient<Database> | null = isServer
  ? initServerClientSync()
  : null;
