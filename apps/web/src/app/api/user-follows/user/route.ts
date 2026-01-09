import type { NextRequest } from "next/server";
import { handleUserFollowsUserGet, handleUserFollowsUserPost } from "../_lib/handlers";

export async function POST(req: NextRequest) {
  return handleUserFollowsUserPost(req);
}

export async function GET(req: NextRequest) {
  return handleUserFollowsUserGet(req);
}
