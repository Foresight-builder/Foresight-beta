"use client";

import React from "react";
import GradientPage from "@/components/ui/GradientPage";

export function ProposalChatShell({ children }: { children: React.ReactNode }) {
  return (
    <GradientPage className="h-[calc(100vh-64px)] font-sans relative overflow-hidden flex flex-col">
      {/* 与提案列表页一致的渐变光晕背景 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-b from-violet-300/40 to-fuchsia-300/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-gradient-to-t from-rose-300/40 to-orange-200/40 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-cyan-200/30 rounded-full blur-[80px]" />
      </div>
      <div className="relative z-10 flex-1 flex min-h-0">{children}</div>
    </GradientPage>
  );
}
