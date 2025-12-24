import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 排行榜 - 预测高手收益与胜率榜单",
  description: "查看 Foresight 平台预测高手的收益、胜率和交易活跃度，发现表现优秀的策略和账户。",
  alternates: {
    canonical: "/leaderboard",
  },
};

export default function LeaderboardLayout({ children }: { children: ReactNode }) {
  return children;
}
