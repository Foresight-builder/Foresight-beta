import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createToken, verifyToken, createRefreshToken, type JWTPayload } from "./jwt";
import { supabaseAdmin } from "./supabase.server";

const SESSION_COOKIE_NAME = "fs_session";
const REFRESH_COOKIE_NAME = "fs_refresh";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function isMissingRelation(err: unknown) {
  const msg = String((err as any)?.message || "").toLowerCase();
  return msg.includes("relation") && msg.includes("does not exist");
}

async function isSessionRevoked(address: string, sessionId: string): Promise<boolean> {
  try {
    const client = supabaseAdmin as any;
    if (!client) return false;
    const a = String(address || "").toLowerCase();
    const sid = String(sessionId || "");
    if (!a || !sid) return false;
    const { data, error } = await client
      .from("user_sessions")
      .select("revoked_at")
      .eq("wallet_address", a)
      .eq("session_id", sid)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error)) return false;
      return false;
    }
    return !!(data as any)?.revoked_at;
  } catch {
    return false;
  }
}

/**
 * 创建会话并设置 Cookie
 */
export async function createSession(
  response: NextResponse,
  address: string,
  chainId?: number,
  options?: { req?: NextRequest; sessionId?: string; authMethod?: string }
): Promise<void> {
  const sessionId = options?.sessionId || randomUUID();
  const token = await createToken(address, chainId, 7 * 24 * 60 * 60, {
    sessionId,
    tokenType: "session",
  });
  const refreshToken = await createRefreshToken(address, chainId, { sessionId });

  // 设置访问 token（7天）
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 天
  });

  // 设置刷新 token（30天）
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60, // 30 天
  });

  try {
    const client = supabaseAdmin as any;
    if (!client) return;
    const nowIso = new Date().toISOString();
    const ua =
      options?.req && typeof options.req.headers?.get === "function"
        ? String(options.req.headers.get("user-agent") || "").slice(0, 512)
        : "";
    const ipRaw =
      options?.req && typeof options.req.headers?.get === "function"
        ? String(
            options.req.headers.get("x-real-ip") || options.req.headers.get("x-forwarded-for") || ""
          )
        : "";
    const ip = String(ipRaw || "")
      .split(",")[0]
      .trim();
    const ipPrefix = ip ? ip.split(".").slice(0, 2).join(".") + ".*.*" : null;

    await client.from("user_sessions").upsert(
      {
        wallet_address: String(address || "").toLowerCase(),
        session_id: sessionId,
        chain_id: typeof chainId === "number" ? chainId : null,
        auth_method: options?.authMethod ? String(options.authMethod).slice(0, 32) : null,
        ip_prefix: ipPrefix,
        user_agent: ua || null,
        last_seen_at: nowIso,
        created_at: nowIso,
        revoked_at: null,
      },
      { onConflict: "session_id" }
    );

    await client
      .from("login_audit_events")
      .insert({
        wallet_address: String(address || "").toLowerCase(),
        method: options?.authMethod ? String(options.authMethod).slice(0, 32) : "unknown",
        ip_prefix: ipPrefix,
        user_agent: ua || null,
        created_at: nowIso,
      })
      .catch(() => {});
  } catch {}
}

/**
 * 从请求中获取会话
 */
export async function getSession(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value || "";
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const sid = typeof (payload as any)?.sid === "string" ? String((payload as any).sid) : "";
      if (sid && (await isSessionRevoked(payload.address, sid))) return null;
      return payload;
    }
  }

  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value || "";
  if (refreshToken) {
    const payload = await verifyToken(refreshToken);
    if (payload) {
      const sid = typeof (payload as any)?.sid === "string" ? String((payload as any).sid) : "";
      if (sid && (await isSessionRevoked(payload.address, sid))) return null;
      return payload;
    }
  }

  return null;
}

/**
 * 从服务端组件获取会话（使用 cookies()）
 */
export async function getSessionFromCookies(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || "";
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const sid = typeof (payload as any)?.sid === "string" ? String((payload as any).sid) : "";
      if (sid && (await isSessionRevoked(payload.address, sid))) return null;
      return payload;
    }
  }

  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value || "";
  if (refreshToken) {
    const payload = await verifyToken(refreshToken);
    if (payload) {
      const sid = typeof (payload as any)?.sid === "string" ? String((payload as any).sid) : "";
      if (sid && (await isSessionRevoked(payload.address, sid))) return null;
      return payload;
    }
  }

  return null;
}

/**
 * 尝试刷新会话
 */
export async function refreshSession(req: NextRequest, response: NextResponse): Promise<boolean> {
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return false;
  }

  const payload = await verifyToken(refreshToken);

  if (!payload) {
    return false;
  }

  const sid = typeof (payload as any)?.sid === "string" ? String((payload as any).sid) : "";
  if (sid && (await isSessionRevoked(payload.address, sid))) {
    return false;
  }

  // 创建新的访问 token
  await createSession(response, payload.address, payload.chainId, {
    req,
    sessionId: sid || undefined,
    authMethod: "refresh",
  });

  return true;
}

/**
 * 清除会话
 */
export function clearSession(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}

/**
 * 验证请求是否已认证
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ authenticated: true; session: JWTPayload } | { authenticated: false; error: string }> {
  const session = await getSession(req);

  if (!session) {
    return {
      authenticated: false,
      error: "未认证或会话已过期",
    };
  }

  return {
    authenticated: true,
    session,
  };
}

/**
 * 验证会话地址是否匹配
 */
export async function verifySessionAddress(
  req: NextRequest,
  expectedAddress: string
): Promise<boolean> {
  const session = await getSession(req);

  if (!session) {
    return false;
  }

  return session.address.toLowerCase() === expectedAddress.toLowerCase();
}
