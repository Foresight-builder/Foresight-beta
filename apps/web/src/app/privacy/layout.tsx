import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 隐私政策 - 数据收集与使用说明",
  description: "查看 Foresight 隐私政策，了解我们如何收集、使用和保护你的个人信息与使用数据。",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
