/**
 * Supabase Client 客户端专用
 * 仅在浏览器环境中使用
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 创建并导出客户端实例 - 动态导入避免构建错误
let cachedSupabase: SupabaseClient<Database> | null = null;

export function getBrowserClient(): SupabaseClient<Database> | null {
  // 在浏览器环境中安全创建客户端
  if (typeof window !== "undefined" && !cachedSupabase && supabaseUrl && supabaseAnonKey) {
    // 动态导入，避免构建时错误
    const { createClient } = require("@supabase/supabase-js");
    // 移除类型参数，改为在赋值时进行类型转换
    cachedSupabase = createClient(
      supabaseUrl,
      supabaseAnonKey
    ) as unknown as SupabaseClient<Database>;
  }
  return cachedSupabase;
}

// 默认导出客户端实例（用于客户端组件）
export const supabase = getBrowserClient();
