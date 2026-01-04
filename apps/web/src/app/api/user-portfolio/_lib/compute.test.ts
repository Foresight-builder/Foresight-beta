import { describe, it, expect } from "vitest";
import { groupBets, buildPortfolioResponse } from "./compute";
import type { BetRow, PredictionMeta, PredictionStats } from "./types";

describe("user-portfolio compute helpers", () => {
  it("groupBets should aggregate stakes by prediction and outcome", () => {
    const bets: BetRow[] = [
      {
        id: 1,
        prediction_id: 1,
        amount: 10,
        outcome: "yes",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        prediction_id: 1,
        amount: 5,
        outcome: "no",
        created_at: "2024-01-02T00:00:00Z",
      },
      {
        id: 3,
        prediction_id: 2,
        amount: 7,
        outcome: "yes",
        created_at: "2024-01-03T00:00:00Z",
      },
    ];

    const { grouped, predictionIds } = groupBets(bets);

    expect(predictionIds.sort()).toEqual([1, 2]);

    expect(grouped[1].totalStake).toBe(15);
    expect(grouped[1].stakeYes).toBe(10);
    expect(grouped[1].stakeNo).toBe(5);
    expect(grouped[1].stakeOther).toBe(0);

    expect(grouped[2].totalStake).toBe(7);
    expect(grouped[2].stakeYes).toBe(7);
    expect(grouped[2].stakeNo).toBe(0);
  });

  it("buildPortfolioResponse should compute positions and stats for active markets", () => {
    const grouped = {
      1: {
        totalStake: 20,
        stakeYes: 20,
        stakeNo: 0,
        stakeOther: 0,
        joinedAt: "2024-01-01T00:00:00Z",
      },
    } as any;

    const predictionsMap: Record<number, PredictionMeta> = {
      1: {
        title: "Test Market",
        image_url: null,
        status: "active",
        min_stake: 5,
        winning_outcome: null,
      },
    };

    const statsMap: Record<number, PredictionStats> = {
      1: {
        yesAmount: 100,
        noAmount: 0,
        totalAmount: 100,
        participantCount: 10,
        betCount: 20,
      },
    };

    const res = buildPortfolioResponse({ grouped, predictionsMap, statsMap });

    expect(res.positions.length).toBe(1);
    expect(res.positions[0].id).toBe(1);
    expect(res.positions[0].title).toBe("Test Market");
    expect(res.positions[0].stake).toBe(20);
    expect(res.positions[0].outcome).toBe("Yes");
    expect(res.positions[0].stats.yesProbability).toBeCloseTo(1);
    expect(res.stats.total_invested).toBe(20);
    expect(res.stats.active_count).toBe(1);
    expect(res.stats.realized_pnl).toBe(0);
    expect(res.stats.win_rate).toBe("0%");
  });

  it("buildPortfolioResponse should compute realized PnL and win rate for resolved markets", () => {
    const grouped = {
      1: {
        totalStake: 10,
        stakeYes: 10,
        stakeNo: 0,
        stakeOther: 0,
        joinedAt: "2024-01-01T00:00:00Z",
      },
      2: {
        totalStake: 10,
        stakeYes: 0,
        stakeNo: 10,
        stakeOther: 0,
        joinedAt: "2024-01-02T00:00:00Z",
      },
    } as any;

    const predictionsMap: Record<number, PredictionMeta> = {
      1: {
        title: "Win Market",
        image_url: null,
        status: "completed",
        min_stake: 5,
        winning_outcome: "yes",
      },
      2: {
        title: "Lose Market",
        image_url: null,
        status: "completed",
        min_stake: 5,
        winning_outcome: "yes",
      },
    };

    const statsMap: Record<number, PredictionStats> = {
      1: {
        yesAmount: 100,
        noAmount: 0,
        totalAmount: 100,
        participantCount: 10,
        betCount: 20,
      },
      2: {
        yesAmount: 0,
        noAmount: 100,
        totalAmount: 100,
        participantCount: 10,
        betCount: 20,
      },
    };

    const res = buildPortfolioResponse({ grouped, predictionsMap, statsMap });

    expect(res.positions.length).toBe(2);
    expect(res.stats.total_invested).toBe(20);
    expect(res.stats.realized_pnl).toBeLessThan(0);
    expect(res.stats.win_rate).toBe("0.0%");
  });

  it("buildPortfolioResponse should handle empty grouped input", () => {
    const res = buildPortfolioResponse({
      grouped: {} as any,
      predictionsMap: {},
      statsMap: {},
    });

    expect(res.positions.length).toBe(0);
    expect(res.stats.total_invested).toBe(0);
    expect(res.stats.active_count).toBe(0);
    expect(res.stats.realized_pnl).toBe(0);
    expect(res.stats.win_rate).toBe("0%");
  });
});
