import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 服务条款 - 使用协议与风险提示",
  description:
    "阅读 Foresight 服务条款，了解平台使用规则、适用资格、风险披露以及责任限制等关键信息。",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Foresight 服务条款 - 使用协议与风险提示",
    description: "了解使用 Foresight 平台前的重要条款，包括风险披露、责任限制与使用规范。",
    url: "/terms",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foresight 服务条款 - 使用协议与风险提示",
    description: "在开始使用 Foresight 预测市场平台前，请先阅读服务条款与风险提示。",
  },
};

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
