import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 提案广场 - 创建新预测市场与治理投票",
  description:
    "在 Foresight 提案广场发起新的预测市场想法，为加密、宏观、AI 等主题设计问题，与社区一起投票决定是否上线市场并参与协议治理。",
  alternates: {
    canonical: "/proposals",
  },
  openGraph: {
    title: "Foresight 提案广场 - 创建新预测市场与治理投票",
    description: "在提案广场发起和浏览治理与市场设计提案，为后续热门预测市场和链上交易铺路。",
    url: "/proposals",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foresight 提案广场 - 创建新预测市场与治理投票",
    description: "发起或参与提案讨论，与社区一起设计新的预测市场与治理流程。",
  },
};

export default function ProposalsLayout({ children }: { children: ReactNode }) {
  return children;
}
