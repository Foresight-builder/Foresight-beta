import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 提案广场 - 创建与投票新预测市场",
  description: "在 Foresight 提案广场发起新预测市场提案，为平台功能和事件设计投票，参与社区共建。",
  alternates: {
    canonical: "/proposals",
  },
};

export default function ProposalsLayout({ children }: { children: ReactNode }) {
  return children;
}
