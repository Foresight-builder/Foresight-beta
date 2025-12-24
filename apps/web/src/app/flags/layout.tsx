import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 成就 Flags - 任务徽章与成长激励",
  description:
    "在 Foresight Flags 页面完成任务、解锁成就徽章，记录你的预测成长路径并获得额外激励。",
  alternates: {
    canonical: "/flags",
  },
  openGraph: {
    title: "Foresight 成就 Flags - 任务徽章与成长激励",
    description: "通过成就 Flags 为自己的预测与研究设定长期挑战和成长目标，解锁徽章激励。",
    url: "/flags",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foresight 成就 Flags - 任务徽章与成长激励",
    description: "创建和完成挑战任务，用徽章记录你的预测成长路径和实践进展。",
  },
};

export default function FlagsLayout({ children }: { children: ReactNode }) {
  return children;
}
