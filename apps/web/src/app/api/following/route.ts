import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/following?address=0x...
export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: "Supabase client not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { message: "Address is required" },
        { status: 400 }
      );
    }

    // 1. 获取关注的事件 ID 列表
    const { data: followData, error: followError } = await supabaseAdmin
      .from("event_follows")
      .select("event_id, created_at")
      .eq("user_id", address)
      .order("created_at", { ascending: false });

    if (followError) {
      console.error("Failed to fetch following IDs:", followError);
      return NextResponse.json(
        { message: "Failed to fetch following" },
        { status: 500 }
      );
    }

    if (!followData || followData.length === 0) {
      return NextResponse.json({ following: [] });
    }

    const eventIds = followData.map((item) => item.event_id);
    const followMap = new Map(
      followData.map((item) => [item.event_id, item.created_at])
    );

    // 2. 根据 ID 获取预测事件详情
    const { data: predictionsData, error: predictionsError } =
      await supabaseAdmin
        .from("predictions")
        .select("id, title, image_url, category, deadline")
        .in("id", eventIds);

    if (predictionsError) {
      console.error("Failed to fetch followed predictions:", predictionsError);
      return NextResponse.json(
        { message: "Failed to fetch predictions" },
        { status: 500 }
      );
    }

    // 3. 获取这些事件的总关注数
    const { data: allFollows, error: allFollowsError } = await supabaseAdmin
      .from("event_follows")
      .select("event_id")
      .in("event_id", eventIds);

    const counts: Record<number, number> = {};
    if (!allFollowsError && allFollows) {
      allFollows.forEach((f: any) => {
        const eid = f.event_id;
        counts[eid] = (counts[eid] || 0) + 1;
      });
    }

    // 4. 组装数据
    const following = (predictionsData || []).map((prediction: any) => ({
      id: prediction.id,
      title: prediction.title,
      image_url: prediction.image_url,
      category: prediction.category,
      deadline: prediction.deadline,
      followers_count: counts[prediction.id] || 0,
      followed_at: followMap.get(prediction.id),
    }));

    // 保持原来的排序（按关注时间倒序）
    following.sort((a: any, b: any) => {
      const timeA = new Date(a.followed_at).getTime();
      const timeB = new Date(b.followed_at).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ following });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
