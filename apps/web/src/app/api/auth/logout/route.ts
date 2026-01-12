import { NextResponse } from "next/server";
import { ApiResponses } from "@/lib/apiResponse";

export async function POST() {
  try {
    const res = NextResponse.json({ message: "ok" });
    const { clearSession } = await import("@/lib/session");
    clearSession(res);
    return res;
  } catch (e: any) {
    const detail = String(e?.message || e);
    return ApiResponses.internalError("登出失败", detail);
  }
}
