"use client";

import React from "react";

export function ProposalChatShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[calc(100vh-64px)] bg-[#f8faff] font-sans relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 flex-1 flex min-h-0">{children}</div>
    </div>
  );
}
