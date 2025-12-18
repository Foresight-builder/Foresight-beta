import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getClient } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { parseRequestBody, logApiError } from "@/lib/serverUtils";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const flagId = Number(id);
    if (!flagId) return NextResponse.json({ message: "flagId 必填" }, { status: 400 });

    const body = await parseRequestBody(req as any);
    const client = (supabaseAdmin || getClient()) as any;
    if (!client) return NextResponse.json({ message: "服务未配置" }, { status: 500 });

    const userId = String(body?.user_id || "").trim();
    const note = String(body?.note || "").trim();
    const imageUrl = String(body?.image_url || "").trim();
    if (!userId) return NextResponse.json({ message: "user_id 必填" }, { status: 400 });

    const { data: rawFlag, error: findErr } = await client
      .from("flags")
      .select("*")
      .eq("id", flagId)
      .maybeSingle();

    const flag = rawFlag as Database["public"]["Tables"]["flags"]["Row"] | null;

    if (findErr)
      return NextResponse.json({ message: "查询失败", detail: findErr.message }, { status: 500 });
    if (!flag) return NextResponse.json({ message: "不存在的 Flag" }, { status: 404 });
    if (String(flag.user_id || "") !== userId)
      return NextResponse.json({ message: "仅创建者可打卡" }, { status: 403 });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next = new Date(start.getTime() + 86400000);
    const startIso = start.toISOString();
    const nextIso = next.toISOString();
    let todayCount = 0;
    const cnt = await client
      .from("flag_checkins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startIso)
      .lt("created_at", nextIso);
    if (!cnt.error) {
      todayCount = Number(cnt.count || 0);
    } else {
      const fb = await client
        .from("discussions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startIso)
        .lt("created_at", nextIso)
        .ilike("content", "%checkin%");
      if (!fb.error) todayCount = Number(fb.count || 0);
    }
    if (todayCount >= 100)
      return NextResponse.json({ message: "今日打卡次数已达上限（100）" }, { status: 429 });

    const historyPayload: Database["public"]["Tables"]["discussions"]["Insert"] = {
      proposal_id: flagId,
      user_id: userId,
      content: JSON.stringify({
        type: "checkin",
        note,
        image_url: imageUrl,
        ts: new Date().toISOString(),
      }),
    };
    try {
      await client.from("discussions").insert(historyPayload);
    } catch (e) {
      logApiError("POST /api/flags/[id]/checkin history insert failed", e);
    }

    let insertedCheckin: Database["public"]["Tables"]["flag_checkins"]["Row"] | null = null;
    try {
      const ins = await client
        .from("flag_checkins")
        .insert({
          flag_id: flagId,
          user_id: userId,
          note,
          image_url: imageUrl || null,
        } as Database["public"]["Tables"]["flag_checkins"]["Insert"])
        .select("*")
        .maybeSingle();
      insertedCheckin = ins?.data || null;
    } catch (e) {
      logApiError("POST /api/flags/[id]/checkin insert failed", e);
    }

    // Auto-approve logic:
    const isSelfSupervised =
      flag.verification_type === "self" || (!flag.witness_id && flag.user_id === userId);

    if (
      insertedCheckin?.id &&
      ((flag?.verification_type === "witness" && String(flag?.witness_id || "") === "official") ||
        isSelfSupervised)
    ) {
      try {
        await client
          .from("flag_checkins")
          .update({
            review_status: "approved",
            reviewer_id: isSelfSupervised ? "self" : "official",
            reviewed_at: new Date().toISOString(),
          } as Database["public"]["Tables"]["flag_checkins"]["Update"])
          .eq("id", insertedCheckin.id);
      } catch (e) {
        logApiError("POST /api/flags/[id]/checkin auto-approve update failed", e);
      }
    }

    // Reward Logic: Randomly reward a sticker (if auto-approved)
    let rewardedStickerId = null;
    if (
      insertedCheckin?.id &&
      ((flag?.verification_type === "witness" && String(flag?.witness_id || "") === "official") ||
        isSelfSupervised)
    ) {
      try {
        // 使用与 settle 接口一致的随机池，确保 ID 与前端 OFFICIAL_STICKERS 对应
        const pool = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
        const randomId = pool[Math.floor(Math.random() * pool.length)];

        const { error: rewardError } = await client.from("user_stickers").insert({
          user_id: userId,
          sticker_id: randomId,
          created_at: new Date().toISOString(),
        });

        if (!rewardError) {
          rewardedStickerId = randomId;
        }
      } catch (e) {
        console.error("Reward error", e);
      }
    }

    // For self-supervised flags, update status to 'success' immediately if checkin is approved
    let newStatus =
      flag.verification_type === "witness" && String(flag?.witness_id || "") !== "official"
        ? "pending_review"
        : "active";

    if (isSelfSupervised && insertedCheckin?.id) {
      newStatus = "success";
    }

    let { data, error } = await client
      .from("flags")
      .update({
        proof_comment: note || null,
        proof_image_url: imageUrl || null,
        status: newStatus,
      })
      .eq("id", flagId)
      .select("*")
      .maybeSingle();
    if (error) {
      const fallback = await client
        .from("flags")
        .update({
          status: newStatus,
        })
        .eq("id", flagId)
        .select("*")
        .maybeSingle();
      if (fallback.error)
        return NextResponse.json(
          { message: "打卡失败", detail: fallback.error.message },
          { status: 500 }
        );
      data = fallback.data;
    }
    return NextResponse.json(
      {
        message: "ok",
        data,
        sticker_earned: !!rewardedStickerId,
        sticker_id: rewardedStickerId,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: "打卡失败", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
