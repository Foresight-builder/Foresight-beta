/**
 * Supabase Server Shim
 * 用于在服务器端替换 @supabase/supabase-js，避免 "self is not defined" 错误
 * 这个文件只在服务器端构建时使用，客户端会使用真实的 Supabase 客户端
 */

// 导出一个简化的 createClient 函数，仅在服务器端使用
function createClient(url, key, options) {
  // 仅在开发环境下警告
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "Using Supabase server shim - this should only happen during build or server-side rendering"
    );
  }

  // 返回一个空对象，包含一些基本方法的模拟实现
  return {
    supabaseUrl: url,
    supabaseKey: key,
    // 模拟 auth 对象
    auth: {
      getSession: async () => ({ data: null, error: null }),
      signInWithPassword: async () => ({
        data: null,
        error: new Error("Not implemented in server shim"),
      }),
      signOut: async () => ({ error: null }),
    },
    // 模拟 database 对象
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      update: () => ({
        eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      }),
      delete: () => ({
        eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      }),
    }),
    // 模拟其他 Supabase 客户端方法
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
      }),
    },
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
  };
}

// 导出必要的类型和方法
module.exports = {
  createClient,
  // 导出其他可能被使用的类型和常量
  AuthError: class AuthError extends Error {},
  PostgrestError: class PostgrestError extends Error {},
  StorageError: class StorageError extends Error {},
  FunctionsError: class FunctionsError extends Error {},
};
