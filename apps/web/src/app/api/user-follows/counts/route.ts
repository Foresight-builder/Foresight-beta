import type { NextRequest } from "next/server";
import { handleUserFollowsCountsGet } from "../_lib/handlers";

export async function GET(req: NextRequest) {
  return handleUserFollowsCountsGet(req);
}
