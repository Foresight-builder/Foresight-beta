import React, { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { useEventTheme } from "@/hooks/useEventTheme";
import Link from "next/link";

interface OnboardingBannerProps {
  category?: string;
}

export function OnboardingBanner({ category }: OnboardingBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { colors } = useEventTheme(category);

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
          aria-label="关闭指引"
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
                在这个预测市场中，你可以通过买入不同选项来交易自己对事件结果的看法，价格代表市场对事件发生概率的共识。
              </p>
              <p className={`text-xs ${colors.textSecondary}`}>
                👉
                右侧（或底部）交易面板用于下单和管理仓位，图表和盘口数据可以帮助你观察市场情绪和价格变化。
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className={colors.textSecondary}>想浏览更多事件？</span>
              <div className="flex gap-3">
                <Link
                  href="/trending"
                  className="text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
                >
                  热门预测
                </Link>
                <Link
                  href="/forum"
                  className="text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
                >
                  讨论区
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
