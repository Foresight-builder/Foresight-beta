import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Foresight 服务条款 - 使用协议与风险提示",
  description:
    "阅读 Foresight 服务条款，了解平台使用规则、适用资格、风险披露以及责任限制等关键信息。",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
