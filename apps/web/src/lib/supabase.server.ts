/**
 * Supabase Client 服务器端专用
 * 仅在Node.js环境中使用
 */
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 创建并导出服务端客户端实例
let cachedSupabaseAdmin: SupabaseClient<Database> | null = null;
let cachedSupabaseAnon: SupabaseClient<Database> | null = null;

export function getServerClient(): SupabaseClient<Database> | null {
  if (!cachedSupabaseAdmin && supabaseUrl && supabaseServiceRoleKey) {
    cachedSupabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    ) as unknown as SupabaseClient<Database>;
  }
  return cachedSupabaseAdmin;
}

// 默认导出服务端客户端实例（用于服务端路由）
export const supabaseAdmin = getServerClient();

export function getServerAnonClient(): SupabaseClient<Database> | null {
  if (!cachedSupabaseAnon && supabaseUrl && supabaseAnonKey) {
    cachedSupabaseAnon = createClient(
      supabaseUrl,
      supabaseAnonKey
    ) as unknown as SupabaseClient<Database>;
  }
  return cachedSupabaseAnon;
}

export const supabaseAnon = getServerAnonClient();
