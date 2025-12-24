import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 成就 Flags - 任务徽章与成长激励",
  description:
    "在 Foresight Flags 页面完成任务、解锁成就徽章，记录你的预测成长路径并获得额外激励。",
  alternates: {
    canonical: "/flags",
  },
};

export default function FlagsLayout({ children }: { children: ReactNode }) {
  return children;
}
