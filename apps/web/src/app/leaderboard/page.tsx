"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  buildLeaderboardJsonLd,
  transformLeaderboardData,
  type LeaderboardUser,
} from "./data";
import { LeaderboardPageView } from "./components/LeaderboardPageView";
import GradientPage from "@/components/ui/GradientPage";

// 分页配置
const INITIAL_LOAD = 20; // 首屏加载条数
const PAGE_SIZE = 30; // 每次加载更多的条数
const MAX_LOAD = 100; // 最大加载条数

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState("weekly");
  const [category, setCategory] = useState("profit");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayCount, setDisplayCount] = useState(INITIAL_LOAD);
  const [totalLoaded, setTotalLoaded] = useState(0);

  // 获取排行榜数据
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setDisplayCount(INITIAL_LOAD); // 切换时间范围时重置显示条数
      try {
        // 首次加载获取足够的数据
        const res = await fetch(`/api/leaderboard?range=${timeRange}&limit=${MAX_LOAD}`);
        const data = await res.json();
        if (data.leaderboard && Array.isArray(data.leaderboard)) {
          const transformed = transformLeaderboardData(data.leaderboard);
          setLeaderboardData(transformed);
          setTotalLoaded(transformed.length);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [timeRange]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (loadingMore || displayCount >= totalLoaded) return;
    
    setLoadingMore(true);
    // 模拟加载延迟，提供更好的 UX 反馈
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, totalLoaded));
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, displayCount, totalLoaded]);

  // 计算是否还有更多数据
  const hasMore = displayCount < totalLoaded;

  // 根据 displayCount 切片数据
  const displayedData = useMemo(
    () => leaderboardData.slice(0, displayCount),
    [leaderboardData, displayCount]
  );
  const topThree = useMemo(() => displayedData.slice(0, 3), [displayedData]);
  const restRank = useMemo(() => displayedData.slice(3), [displayedData]);
  const jsonLd = useMemo(
    () => buildLeaderboardJsonLd(leaderboardData),
    [leaderboardData]
  );

  // 加载状态
  if (loading && leaderboardData.length === 0) {
    return (
      <GradientPage className="w-full relative overflow-hidden font-sans min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <p className="text-gray-500 font-medium">加载排行榜数据...</p>
        </div>
      </GradientPage>
    );
  }

  return (
    <LeaderboardPageView
      timeRange={timeRange}
      category={category}
      onTimeRangeChange={setTimeRange}
      onCategoryChange={setCategory}
      topThree={topThree}
      restRank={restRank}
      jsonLd={jsonLd}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={handleLoadMore}
      displayCount={displayCount}
      totalCount={totalLoaded}
    />
  );
}
