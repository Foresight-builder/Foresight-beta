import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { getSessionAddress, isAdminAddress, normalizeAddress } from "@/lib/serverUtils";

type AdminSessionOk = { ok: true; reason: "ok"; sessionUserId: string | null };
type AdminSessionFailReason = "unauthorized" | "forbidden";
type AdminSessionFail = { ok: false; reason: AdminSessionFailReason };
type AdminSession = AdminSessionOk | AdminSessionFail;

export async function isAdminSession(
  client: SupabaseClient,
  req: NextRequest
): Promise<AdminSession> {
  const sessAddr = await getSessionAddress(req);
  const addr = normalizeAddress(String(sessAddr || ""));
  if (!/^0x[a-f0-9]{40}$/.test(addr)) {
    return { ok: false, reason: "unauthorized" };
  }

  const { data: prof } = await (client as any)
    .from("user_profiles")
    .select("is_admin")
    .eq("wallet_address", addr)
    .maybeSingle();
  const isAdmin = !!(prof as any)?.is_admin || isAdminAddress(addr);

  if (!isAdmin) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, reason: "ok", sessionUserId: addr };
}
