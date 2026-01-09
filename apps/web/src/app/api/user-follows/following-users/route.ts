import type { NextRequest } from "next/server";
import { handleUserFollowsFollowingUsersGet } from "../_lib/handlers";

export async function GET(req: NextRequest) {
  return handleUserFollowsFollowingUsersGet(req);
}
