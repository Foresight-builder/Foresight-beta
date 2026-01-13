import { z } from "zod";

// API密钥作用域枚举
export const ApiKeyScopes = {
  READ_MARKETS: "read:markets",
  WRITE_MARKETS: "write:markets",
  READ_PREDICTIONS: "read:predictions",
  WRITE_PREDICTIONS: "write:predictions",
  READ_USERS: "read:users",
  WRITE_USERS: "write:users",
  READ_ORDERS: "read:orders",
  WRITE_ORDERS: "write:orders",
  READ_STATS: "read:stats",
} as const;

export type ApiKeyScope = keyof typeof ApiKeyScopes;

// API密钥请求验证模式
const apiKeyRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  scopes: z.array(z.nativeEnum(ApiKeyScopes)).nonempty("At least one scope is required"),
  expires_at: z.string().datetime().optional(),
});

export type ApiKeyRequest = z.infer<typeof apiKeyRequestSchema>;

export function validateApiKeyRequest(data: any) {
  return apiKeyRequestSchema.safeParse(data);
}

export function validateApiKeyScopes(scopes: string[]) {
  return scopes.every((scope) => Object.values(ApiKeyScopes).includes(scope as any));
}
