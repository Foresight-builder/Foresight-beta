import type { NextRequest } from "next/server";
import { handleUserFollowsFollowersUsersGet } from "../_lib/handlers";

export async function GET(req: NextRequest) {
  return handleUserFollowsFollowersUsersGet(req);
}
