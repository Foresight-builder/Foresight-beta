import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getClient } from "@/lib/supabase";
import { parseRequestBody } from "@/lib/serverUtils";
import { normalizeId } from "@/lib/ids";
import { ApiResponses } from "@/lib/apiResponse";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: pid } = await context.params;
    const id = normalizeId(pid);
    if (!id) return ApiResponses.badRequest("id 必填");
    const body = await parseRequestBody(req);
    const content = String(body?.content || "");
    if (!content.trim()) return ApiResponses.badRequest("content 必填");
    const client = supabaseAdmin || getClient();
    const { data, error } = await client
      .from("discussions")
      .update({ content } as never)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return ApiResponses.databaseError("更新失败", error.message);
    return NextResponse.json({ discussion: data }, { status: 200 });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("请求失败", detail);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: pid } = await context.params;
    const id = normalizeId(pid);
    if (!id) return ApiResponses.badRequest("id 必填");
    const client = supabaseAdmin || getClient();
    const { error } = await client.from("discussions").delete().eq("id", id);
    if (error) return ApiResponses.databaseError("删除失败", error.message);
    return NextResponse.json({ message: "已删除" }, { status: 200 });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    return ApiResponses.internalError("请求失败", detail);
  }
}
