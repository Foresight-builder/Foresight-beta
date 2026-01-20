"use client";

import React from "react";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { useOnboardingGuide } from "@/hooks/useOnboardingGuide";
import { type Locale } from "../i18n-config";
import { useTranslations } from "@/lib/i18n";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  locale: Locale;
}

export function OnboardingLayout({ children, locale: _locale }: OnboardingLayoutProps) {
  const { isOpen, completeOnboarding, closeOnboarding } = useOnboardingGuide();
  const tChat = useTranslations("chat");

  return (
    <>
      {children}
      <OnboardingGuide
        isOpen={isOpen}
        onClose={closeOnboarding}
        onComplete={completeOnboarding}
        t={tChat}
      />
    </>
  );
}
