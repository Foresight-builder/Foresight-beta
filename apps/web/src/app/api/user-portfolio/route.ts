import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ message: "Wallet address is required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ message: "Supabase client not initialized" }, { status: 500 });
    }

    const { data: bets, error: betsError } = await supabaseAdmin
      .from("bets")
      .select("id, prediction_id, amount, outcome, created_at")
      .eq("user_id", address)
      .order("created_at", { ascending: false });

    if (betsError) {
      console.error("Error fetching bets:", betsError);
      return NextResponse.json({ message: "Failed to fetch bets" }, { status: 500 });
    }

    const predictionIds = Array.from(
      new Set(
        (bets || [])
          .map((item: any) => Number(item.prediction_id))
          .filter((id) => Number.isFinite(id))
      )
    );

    let predictionsMap: Record<
      number,
      {
        title: string;
        image_url: string | null;
        status: string;
        min_stake: number;
        winning_outcome: string | null;
      }
    > = {};

    if (predictionIds.length > 0) {
      const { data: predictionRows, error: predictionError } = await supabaseAdmin
        .from("predictions")
        .select("id, title, image_url, status, min_stake, winning_outcome")
        .in("id", predictionIds);

      if (predictionError) {
        console.error("Error fetching predictions:", predictionError);
      } else if (Array.isArray(predictionRows)) {
        for (const row of predictionRows as any[]) {
          const id = Number((row as any).id);
          if (!Number.isFinite(id)) continue;
          predictionsMap[id] = {
            title: String((row as any).title || "Unknown Event"),
            image_url: (row as any).image_url || null,
            status: String((row as any).status || "active"),
            min_stake: Number((row as any).min_stake || 0),
            winning_outcome:
              typeof (row as any).winning_outcome === "string"
                ? (row as any).winning_outcome
                : null,
          };
        }
      }
    }

    let statsMap: Record<
      number,
      {
        yesAmount: number;
        noAmount: number;
        totalAmount: number;
        participantCount: number;
        betCount: number;
      }
    > = {};

    if (predictionIds.length > 0) {
      const { data: statsRows, error: statsError } = await supabaseAdmin
        .from("prediction_stats")
        .select("prediction_id, yes_amount, no_amount, total_amount, participant_count, bet_count")
        .in("prediction_id", predictionIds);

      if (!statsError && Array.isArray(statsRows)) {
        for (const row of statsRows as any[]) {
          const pid = Number((row as any).prediction_id);
          if (!Number.isFinite(pid)) continue;
          statsMap[pid] = {
            yesAmount: Number((row as any).yes_amount || 0),
            noAmount: Number((row as any).no_amount || 0),
            totalAmount: Number((row as any).total_amount || 0),
            participantCount: Number((row as any).participant_count || 0),
            betCount: Number((row as any).bet_count || 0),
          };
        }
      }
    }

    const grouped: Record<
      number,
      {
        totalStake: number;
        stakeYes: number;
        stakeNo: number;
        stakeOther: number;
        joinedAt: string;
      }
    > = {};

    for (const bet of bets || []) {
      const pid = Number((bet as any).prediction_id);
      if (!Number.isFinite(pid)) continue;
      const amount = Number((bet as any).amount || 0);
      const outcome = String((bet as any).outcome || "");
      const created = String((bet as any).created_at || "");

      if (!grouped[pid]) {
        grouped[pid] = {
          totalStake: 0,
          stakeYes: 0,
          stakeNo: 0,
          stakeOther: 0,
          joinedAt: created,
        };
      }

      grouped[pid].totalStake += amount;
      const lower = outcome.toLowerCase();
      if (lower === "yes") {
        grouped[pid].stakeYes += amount;
      } else if (lower === "no") {
        grouped[pid].stakeNo += amount;
      } else {
        grouped[pid].stakeOther += amount;
      }

      if (
        grouped[pid].joinedAt &&
        created &&
        new Date(created).getTime() < new Date(grouped[pid].joinedAt).getTime()
      ) {
        grouped[pid].joinedAt = created;
      }
    }

    let totalInvested = 0;
    let totalRealizedPnl = 0;
    let winCount = 0;
    let lossCount = 0;

    const positions = Object.entries(grouped).map(([pidStr, value]) => {
      const pid = Number(pidStr);
      const meta = predictionsMap[pid];
      const s = statsMap[pid];

      const yesAmount = s?.yesAmount ?? 0;
      const noAmount = s?.noAmount ?? 0;
      const totalAmount = s?.totalAmount ?? 0;
      const participantCount = s?.participantCount ?? 0;
      const betCount = s?.betCount ?? 0;

      let yesProbability = 0.5;
      let noProbability = 0.5;
      if (totalAmount > 0) {
        yesProbability = yesAmount / totalAmount;
        noProbability = noAmount / totalAmount;
      }

      const imageUrl = meta?.image_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${pid}`;

      const invested = value.totalStake > 0 ? value.totalStake : meta?.min_stake || 0;
      totalInvested += invested;

      const winner = String(meta?.winning_outcome || "").toLowerCase();
      const resolved = winner === "yes" || winner === "no";

      let gross = 0;
      let netPnl = 0;

      if (resolved && totalAmount > 0) {
        if (winner === "yes" && yesAmount > 0) {
          const payoutYes = (value.stakeYes / yesAmount) * totalAmount;
          gross = payoutYes;
        } else if (winner === "no" && noAmount > 0) {
          const payoutNo = (value.stakeNo / noAmount) * totalAmount;
          gross = payoutNo;
        }
        netPnl = gross - value.totalStake;
      }

      totalRealizedPnl += netPnl;

      if (resolved && invested > 0) {
        if (netPnl > 0) winCount += 1;
        else if (netPnl < 0) lossCount += 1;
      }

      const pnlPct = invested > 0 ? (netPnl / invested) * 100 : 0;
      const pnlPctRounded = Number(pnlPct.toFixed(1));
      const pnlLabel =
        pnlPctRounded >= 0 ? `+${pnlPctRounded.toFixed(1)}%` : `${pnlPctRounded.toFixed(1)}%`;

      const mainOutcome =
        value.stakeYes >= value.stakeNo && value.stakeYes > 0
          ? "Yes"
          : value.stakeNo > 0
            ? "No"
            : value.stakeOther > 0
              ? "Other"
              : "Unknown";

      return {
        id: pid,
        title: meta?.title || "Unknown Event",
        image_url: imageUrl,
        status: meta?.status || "active",
        stake: invested,
        outcome: mainOutcome,
        pnl: resolved ? pnlLabel : "+0%",
        joined_at: value.joinedAt,
        stats: {
          yesAmount,
          noAmount,
          totalAmount,
          participantCount,
          betCount,
          yesProbability: parseFloat(yesProbability.toFixed(4)),
          noProbability: parseFloat(noProbability.toFixed(4)),
        },
      };
    });

    positions.sort((a: any, b: any) => {
      const ta = a?.joined_at ? new Date(a.joined_at).getTime() : 0;
      const tb = b?.joined_at ? new Date(b.joined_at).getTime() : 0;
      return tb - ta;
    });

    const activeCount = positions.filter((p: any) => String(p.status || "") === "active").length;

    const winRate =
      winCount + lossCount > 0
        ? `${((winCount / (winCount + lossCount)) * 100).toFixed(1)}%`
        : "0%";

    return NextResponse.json({
      positions,
      stats: {
        total_invested: totalInvested,
        active_count: activeCount,
        win_rate: winRate,
        realized_pnl: Number(totalRealizedPnl.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
