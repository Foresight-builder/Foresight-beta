import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";
import { getSessionAddress, isAdminAddress, normalizeAddress } from "@/lib/serverUtils";

async function ensureAdmin(req: NextRequest, client: any) {
  const sessAddr = await getSessionAddress(req);
  const addr = normalizeAddress(String(sessAddr || ""));
  if (!/^0x[a-f0-9]{40}$/.test(addr)) {
    return { ok: false as const, reason: "unauthorized" as const };
  }
  const { data: prof } = await client
    .from("user_profiles")
    .select("is_admin")
    .eq("wallet_address", addr)
    .maybeSingle();
  const isAdmin = !!(prof as any)?.is_admin || isAdminAddress(addr);
  if (!isAdmin) {
    return { ok: false as const, reason: "forbidden" as const };
  }
  return { ok: true as const, reason: "ok" as const };
}

export async function GET(req: NextRequest) {
  const client = getClient();
  if (!client) {
    return NextResponse.json({ message: "Supabase not configured" }, { status: 500 });
  }
  const auth = await ensureAdmin(req, client as any);
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.reason === "unauthorized" ? "未登录" : "无权限" },
      { status: auth.reason === "unauthorized" ? 401 : 403 }
    );
  }
  const { data, error } = await (client as any)
    .from("user_profiles")
    .select("wallet_address,username,email,is_admin,is_reviewer,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ message: "查询失败", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ users: data || [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const client = getClient();
  if (!client) {
    return NextResponse.json({ message: "Supabase not configured" }, { status: 500 });
  }
  const auth = await ensureAdmin(req, client as any);
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.reason === "unauthorized" ? "未登录" : "无权限" },
      { status: auth.reason === "unauthorized" ? 401 : 403 }
    );
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "请求体解析失败" }, { status: 400 });
  }
  const walletAddress = String(body?.walletAddress || "").trim();
  const isReviewer = Boolean(body?.isReviewer);
  if (!walletAddress) {
    return NextResponse.json({ message: "walletAddress 必填" }, { status: 400 });
  }
  const { error } = await (client as any)
    .from("user_profiles")
    .update({ is_reviewer: isReviewer })
    .eq("wallet_address", walletAddress);
  if (error) {
    return NextResponse.json({ message: "更新失败", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: "ok" }, { status: 200 });
}
