import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { parseRequestBody, logApiError } from "@/lib/serverUtils";
import { normalizeId } from "@/lib/ids";
import { ApiResponses } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const proposalId = normalizeId(searchParams.get("proposalId"));
    if (!proposalId) {
      return ApiResponses.invalidParameters("proposalId 必填");
    }
    const client = getClient();
    if (!client) {
      return ApiResponses.internalError("Supabase 未配置");
    }
    const { data, error } = await client
      .from("discussions")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });
    if (error) {
      logApiError("[discussions:get]", error);
      return ApiResponses.databaseError("查询失败", error.message);
    }
    return NextResponse.json({ discussions: data || [] }, { status: 200 });
  } catch (e: unknown) {
    logApiError("[discussions:get] unhandled error", e);
    const detail = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("请求失败", detail);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseRequestBody(req);
    const proposalId = normalizeId(body?.proposalId);
    const content = String(body?.content || "");
    const userId = String(body?.userId || "");
    if (!proposalId || !content.trim() || !userId.trim()) {
      return ApiResponses.invalidParameters("proposalId、content、userId 必填");
    }
    const client = supabaseAdmin || getClient();
    if (!client) {
      return ApiResponses.internalError("Supabase 未配置");
    }
    const { data, error } = await client
      .from("discussions")
      .insert({
        proposal_id: proposalId,
        user_id: userId,
        content,
      } as Database["public"]["Tables"]["discussions"]["Insert"] as never)
      .select()
      .maybeSingle();
    if (error) {
      logApiError("[discussions:post]", error);
      return ApiResponses.databaseError("创建失败", error.message);
    }
    return NextResponse.json({ discussion: data }, { status: 200 });
  } catch (e: unknown) {
    logApiError("[discussions:post] unhandled error", e);
    const detail = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("请求失败", detail);
  }
}
