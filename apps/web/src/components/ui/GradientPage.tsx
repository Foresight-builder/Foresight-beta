"use client";

import React from "react";

type GradientPageProps = {
  children: React.ReactNode;
  className?: string;
};

export default function GradientPage({ children, className = "" }: GradientPageProps) {
  return (
    <div className={`min-h-screen relative overflow-hidden bg-[var(--background)] ${className}`}>
      {/* Decorative gradient layer (kept subtle; adapts to prefers-color-scheme via dark:). */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-rose-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      <div className="absolute -z-10 -top-24 -left-24 h-72 w-72 rounded-full bg-purple-300/25 blur-3xl dark:bg-purple-500/10" />
      <div className="absolute -z-10 -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-300/25 blur-3xl dark:bg-fuchsia-500/10" />
      {children}
    </div>
  );
}
