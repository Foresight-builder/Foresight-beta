import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 预测排行榜 - 收益高手与策略榜单",
  description:
    "在 Foresight 预测排行榜中查看顶级预测者的历史收益、胜率和风险偏好，发现稳定盈利的策略账户，为自己的预测交易寻找可参考的实盘样本。",
  alternates: {
    canonical: "/leaderboard",
  },
  openGraph: {
    title: "Foresight 预测排行榜 - 收益高手与策略榜单",
    description: "浏览顶级预测者的收益与胜率表现，发现稳定盈利的策略帐号与交易风格。",
    url: "/leaderboard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foresight 预测排行榜 - 收益高手与策略榜单",
    description: "在排行榜中查看谁是 Foresight 上最稳定、最敏锐的预测者。",
  },
};

export default function LeaderboardLayout({ children }: { children: ReactNode }) {
  return children;
}
