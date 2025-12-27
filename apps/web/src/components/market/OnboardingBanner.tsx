"use client";

import React, { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n";

interface OnboardingBannerProps {
  category?: string;
}

export function OnboardingBanner({ category }: OnboardingBannerProps) {
  const tOnboarding = useTranslations("onboarding");
  const [isVisible, setIsVisible] = useState(false);
  const colors = {
    bgApp: "bg-white/85 backdrop-blur-xl",
    border: category ? "border-purple-200/60" : "border-purple-100/60",
    textPrimary: "text-slate-900",
    textSecondary: "text-slate-500",
  };

  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenPredictionGuide");
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("hasSeenPredictionGuide", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="mb-6">
      <div
        className={`relative overflow-hidden rounded-2xl p-5 ${colors.bgApp} border ${colors.border} shadow-sm`}
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className={`absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/50 transition-colors ${colors.textSecondary}`}
          aria-label={tOnboarding("closeGuide")}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4">
          <div
            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm text-amber-500`}
          >
            <Lightbulb className="w-5 h-5 fill-current" />
          </div>

          <div className="flex-1 space-y-3">
            <div className={`text-sm leading-relaxed ${colors.textPrimary}`}>
              <p className="mb-2 font-medium">
                {tOnboarding("intro").replace("{category}", category ? `${category} ` : "")}
              </p>
              <p className={`text-xs ${colors.textSecondary}`}>👉 {tOnboarding("tradingTip")}</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className={colors.textSecondary}>{tOnboarding("browseMore")}</span>
              <div className="flex gap-3">
                <Link
                  href="/trending"
                  className="text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
                >
                  {tOnboarding("trendingLink")}
                </Link>
                <Link
                  href="/forum"
                  className="text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
                >
                  {tOnboarding("forumLink")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
