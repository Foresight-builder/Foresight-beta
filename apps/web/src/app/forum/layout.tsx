import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 预测论坛 - 事件讨论与交易策略研究",
  description:
    "在 Foresight 预测论坛参与热门事件与市场走势讨论，分享数据驱动的交易策略与研究笔记，与其他预测者交流观点、寻找新的 alpha 机会。",
  alternates: {
    canonical: "/forum",
  },
  openGraph: {
    title: "Foresight 预测论坛 - 事件讨论与交易策略研究",
    description:
      "围绕链上预测市场事件展开社区讨论，分享数据分析与交易策略复盘，发现新的思路与 alpha。",
    url: "/forum",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foresight 预测论坛 - 事件讨论与交易策略研究",
    description: "加入 Foresight 社区，围绕预测事件和市场走势展开深度讨论与策略分享。",
  },
};

export default function ForumLayout({ children }: { children: ReactNode }) {
  return children;
}
