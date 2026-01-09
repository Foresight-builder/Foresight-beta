import type { NextRequest } from "next/server";
import { handleUserFollowsGet } from "./_lib/handlers";

export async function GET(req: NextRequest) {
  return handleUserFollowsGet(req);
}
