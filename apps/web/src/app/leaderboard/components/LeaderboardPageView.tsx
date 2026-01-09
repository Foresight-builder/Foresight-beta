"use client";

import GradientPage from "@/components/ui/GradientPage";
import type { LeaderboardUser } from "../data";
import { LeaderboardControls, type LeaderboardControlsProps } from "./LeaderboardControls";
import { LeaderboardHeader } from "./LeaderboardHeader";
import { LeaderboardMainSections } from "./LeaderboardMainSections";
import { LeaderboardPodium } from "./LeaderboardPodium";

export type LeaderboardPageViewProps = {
  timeRange: string;
  category: string;
  onTimeRangeChange: LeaderboardControlsProps["onTimeRangeChange"];
  onCategoryChange: LeaderboardControlsProps["onCategoryChange"];
  topThree: LeaderboardUser[];
  restRank: LeaderboardUser[];
  allUsers: LeaderboardUser[]; // 完整数据用于查找当前用户排名
  jsonLd: any;
  // 分页相关
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  displayCount?: number;
  totalCount?: number;
  // 搜索相关
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
};

export function LeaderboardPageView({
  timeRange,
  category,
  onTimeRangeChange,
  onCategoryChange,
  topThree,
  restRank,
  allUsers,
  jsonLd,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  displayCount = 0,
  totalCount = 0,
  searchQuery = "",
  onSearchChange,
}: LeaderboardPageViewProps) {
  return (
    <GradientPage className="w-full relative overflow-hidden font-sans selection:bg-purple-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-b from-violet-300/40 to-fuchsia-300/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-gradient-to-t from-rose-300/40 to-orange-200/40 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-cyan-200/30 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 pb-24">
        <LeaderboardHeader />
        <LeaderboardControls
          timeRange={timeRange}
          category={category}
          onTimeRangeChange={onTimeRangeChange}
          onCategoryChange={onCategoryChange}
        />
        <LeaderboardPodium users={topThree} />
        <LeaderboardMainSections
          restRank={restRank}
          allUsers={allUsers}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
          displayCount={displayCount}
          totalCount={totalCount}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
      </div>
    </GradientPage>
  );
}
