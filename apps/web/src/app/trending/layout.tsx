import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 热门预测市场 - 去中心化区块链预测平台",
  description:
    "在 Foresight 浏览当前最热门的链上预测市场，参与各种事件预测，使用加密货币交易观点，赢取收益。",
};

export default function TrendingLayout({ children }: { children: ReactNode }) {
  return children;
}
