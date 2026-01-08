import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getClient } from "@/lib/supabase";
import { getSessionAddress } from "@/lib/serverUtils";
import { ApiResponses } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ stickers: [] });
    }

    const client = supabaseAdmin || getClient();
    if (!client) return NextResponse.json({ stickers: [] });

    // Use user_emojis table
    const { data, error } = await client
      .from("user_emojis")
      .select("emoji_id")
      .eq("user_id", user_id);

    if (error) {
      console.error("Fetch stickers error:", error);
      return NextResponse.json({ stickers: [] });
    }

    const ids = data ? data.map((r: any) => String(r.emoji_id)) : [];
    const uniqueIds = Array.from(new Set(ids));
    const stickers = uniqueIds.map((id) => ({ sticker_id: id }));

    return NextResponse.json({ stickers });
  } catch (e) {
    return NextResponse.json({ stickers: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, sticker_id } = body;

    if (!user_id || !sticker_id) {
      return ApiResponses.badRequest("Missing params");
    }

    const sessionUser = await getSessionAddress(req as any);
    if (!sessionUser) {
      return ApiResponses.unauthorized("Unauthorized");
    }

    if (sessionUser.toLowerCase() !== String(user_id).toLowerCase()) {
      return ApiResponses.forbidden("Forbidden");
    }

    const client = supabaseAdmin || getClient();
    if (!client) return ApiResponses.internalError("No DB");

    const { error } = await (client.from("user_emojis") as any).insert({
      user_id,
      emoji_id: sticker_id,
      source: "manual_api",
    });

    if (error) {
      console.error("Save sticker error:", error);
      return ApiResponses.databaseError("Failed to save sticker", error.message);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return ApiResponses.internalError("Failed to save sticker", String(e));
  }
}
