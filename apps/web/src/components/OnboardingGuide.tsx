"use client";

import React from "react";
import {
  X,
  ArrowRight,
  Search,
  Heart,
  TrendingUp,
  MessageSquare,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type OnboardingGuideProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  t: (key: string) => any;
};

export function OnboardingGuide({ isOpen, onClose, onComplete, t }: OnboardingGuideProps) {
  const steps = [
    {
      title: t("onboarding.step1.title"),
      desc: t("onboarding.step1.desc"),
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      title: t("onboarding.step2.title"),
      desc: t("onboarding.step2.desc"),
      icon: Search,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      title: t("onboarding.step3.title"),
      desc: t("onboarding.step3.desc"),
      icon: Heart,
      color: "text-pink-500",
      bg: "bg-pink-50",
    },
    {
      title: t("onboarding.step4.title"),
      desc: t("onboarding.step4.desc"),
      icon: MessageSquare,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      title: t("onboarding.step5.title"),
      desc: t("onboarding.step5.desc"),
      icon: Wallet,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/20 overflow-hidden"
          >
            {/* Mesh Gradient Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Header Area */}
            <div className="p-8 pb-0 flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {t("onboarding.title")}
                  </h2>
                </div>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest pl-10">
                  {t("onboarding.subtitle")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-black/5 text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Steps Content */}
            <div className="p-8 space-y-6 relative z-10">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="flex gap-4 group"
                  >
                    <div className="flex-shrink-0 pt-1">
                      <div
                        className={`w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center border border-white/50 shadow-sm group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-800 text-sm">{step.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer Action */}
            <div className="p-8 pt-0 relative z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Heart size={10} className="text-purple-500 fill-current" />
                  {t("onboarding.footer")}
                </p>
                <button
                  onClick={onComplete}
                  className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2 group relative overflow-hidden"
                >
                  <span className="relative z-10">{t("onboarding.cta")}</span>
                  <ArrowRight size={16} className="relative z-10" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
