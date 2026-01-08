import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ApiResponses } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);

    if (!session) {
      return ApiResponses.unauthorized("Not authenticated");
    }

    return NextResponse.json({
      authenticated: true,
      address: session.address,
      chainId: session.chainId,
    });
  } catch (error: any) {
    console.error("Auth check error:", error);
    return ApiResponses.internalError("Auth check error", error?.message || "Unknown error");
  }
}
