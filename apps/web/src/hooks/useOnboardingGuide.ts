"use client";

import { useState, useEffect, useCallback } from "react";

const ONBOARDING_COMPLETED_KEY = "foresight_onboarding_completed";
const ONBOARDING_SHOWN_KEY = "foresight_onboarding_shown";

export function useOnboardingGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // 检查用户是否已经完成引导
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";
    const shown = localStorage.getItem(ONBOARDING_SHOWN_KEY) === "true";

    setHasCompleted(completed);
    setHasShown(shown);

    // 如果用户没有完成引导且没有显示过，3秒后自动显示
    if (!completed && !shown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem(ONBOARDING_SHOWN_KEY, "true");
        setHasShown(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  // 完成引导
  const completeOnboarding = useCallback(() => {
    setIsOpen(false);
    setHasCompleted(true);
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
  }, []);

  // 关闭引导
  const closeOnboarding = useCallback(() => {
    setIsOpen(false);
  }, []);

  // 手动打开引导
  const openOnboarding = useCallback(() => {
    setIsOpen(true);
  }, []);

  // 重置引导状态（用于测试或重新引导）
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    localStorage.removeItem(ONBOARDING_SHOWN_KEY);
    setHasCompleted(false);
    setHasShown(false);
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    hasCompleted,
    hasShown,
    completeOnboarding,
    closeOnboarding,
    openOnboarding,
    resetOnboarding,
  };
}
