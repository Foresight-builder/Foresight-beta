import { NextRequest } from "next/server";
import { ApiResponses } from "@/lib/apiResponse";
import { compareApiKey } from "@/lib/serverUtils";
import { validateApiKeyScopes } from "@/app/api/api-keys/validate";

/**
 * API密钥认证中间件
 * @param req - Next.js请求对象
 * @param allowedScopes - 允许的作用域列表
 * @returns 认证成功返回API密钥信息，失败返回错误响应
 */
export async function apiKeyAuth(req: NextRequest, allowedScopes: string[]) {
  // API Keys feature is under development
  return ApiResponses.unauthorized("API Keys feature is under development");
}

/**
 * API密钥认证装饰器，用于保护API路由
 * @param allowedScopes - 允许的作用域列表
 */
export function withApiKeyAuth(allowedScopes: string[]) {
  return function (handler: (req: NextRequest, apiKey: any) => Promise<Response>) {
    return async (req: NextRequest) => {
      return ApiResponses.unauthorized("API Keys feature is under development");
    };
  };
}
