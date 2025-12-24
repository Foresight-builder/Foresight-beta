import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 讨论区 - 预测市场事件与策略交流",
  description:
    "在 Foresight 讨论区参与预测市场事件讨论，分享交易观点与策略，与其他预测者交流看法。",
  alternates: {
    canonical: "/forum",
  },
};

export default function ForumLayout({ children }: { children: ReactNode }) {
  return children;
}
