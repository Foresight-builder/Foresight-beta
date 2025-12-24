import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 热门预测市场 - 加密事件交易与收益机会",
  description:
    "在 Foresight 热门预测市场中参与加密货币、宏观经济、AI 等真实世界事件的预测交易，发现高赔率机会，用 USDC 表达观点并在链上透明结算收益。",
  alternates: {
    canonical: "/trending",
  },
  openGraph: {
    title: "Foresight 热门预测市场 - 加密事件交易与收益机会",
    description:
      "参与链上预测市场交易，发现高赔率机会，并与提案广场、成就 Flags 和预测论坛形成闭环路径。",
    url: "/trending",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foresight 热门预测市场 - 加密事件交易与收益机会",
    description: "浏览热门预测事件，参与链上交易并发现新的收益机会。",
  },
};

export default function TrendingLayout({ children }: { children: ReactNode }) {
  return children;
}
