import type { NextRequest } from "next/server";
import { handleFollowingGet } from "./_lib/handlers";

// GET /api/following?address=0x...
export async function GET(req: NextRequest) {
  return handleFollowingGet(req);
}
