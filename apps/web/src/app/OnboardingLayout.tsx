"use client";

import React from "react";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { useOnboardingGuide } from "@/hooks/useOnboardingGuide";
import { defaultLocale, type Locale } from "../i18n-config";

// 预定义的默认消息，减少初始加载体积
const defaultOnboardingMessages = {
  title: "Welcome to Foresight",
  subtitle: "New User Guide",
  step1: {
    title: "Browse Trending Predictions",
    desc: "View the most popular prediction events on the homepage to understand market trends.",
  },
  step2: {
    title: "Search for Events",
    desc: "Use the search function to find prediction events that interest you.",
  },
  step3: {
    title: "Follow Events",
    desc: "Follow prediction events you're interested in to get timely updates.",
  },
  step4: {
    title: "Join Discussions",
    desc: "Participate in discussions about prediction events in the forum and share your opinions.",
  },
  step5: {
    title: "Connect Wallet to Start Predicting",
    desc: "Connect your crypto wallet and start participating in prediction trading.",
  },
  footer: "Enjoy your time on Foresight!",
  cta: "Start Exploring",
};

// 新手引导的多语言配置（简化版，只包含必要的翻译）
const onboardingMessages: Record<Locale, any> = {
  "zh-CN": {
    title: "欢迎使用 Foresight",
    subtitle: "新手引导",
    step1: {
      title: "浏览热门预测事件",
      desc: "在首页查看当前最热门的预测事件，了解市场动态。",
    },
    step2: {
      title: "搜索感兴趣的事件",
      desc: "使用搜索功能查找您感兴趣的预测事件。",
    },
    step3: {
      title: "关注预测事件",
      desc: "关注您感兴趣的预测事件，及时获取更新。",
    },
    step4: {
      title: "参与讨论",
      desc: "在论坛中参与预测事件的讨论，分享您的观点。",
    },
    step5: {
      title: "连接钱包开始预测",
      desc: "连接您的加密钱包，开始参与预测交易。",
    },
    footer: "祝您在 Foresight 玩得愉快！",
    cta: "开始探索",
  },
  en: defaultOnboardingMessages,
  es: {
    title: "Bienvenido a Foresight",
    subtitle: "Guía para Nuevos Usuarios",
    step1: {
      title: "Explora Predicciones Tendentes",
      desc: "Ve los eventos de predicción más populares en la página de inicio para entender las tendencias del mercado.",
    },
    step2: {
      title: "Busca Eventos",
      desc: "Usa la función de búsqueda para encontrar eventos de predicción que te interesen.",
    },
    step3: {
      title: "Sigue Eventos",
      desc: "Sigue los eventos de predicción que te interesen para recibir actualizaciones oportunas.",
    },
    step4: {
      title: "Únete a Discusiones",
      desc: "Participa en discusiones sobre eventos de predicción en el foro y comparte tus opiniones.",
    },
    step5: {
      title: "Conecta tu Billetera para Empezar a Predecir",
      desc: "Conecta tu billetera criptográfica y comienza a participar en el comercio de predicciones.",
    },
    footer: "¡Disfruta tu tiempo en Foresight!",
    cta: "Empezar a Explorar",
  },
  ko: {
    title: "Foresight에 오신 것을 환영합니다",
    subtitle: "새 사용자 가이드",
    step1: {
      title: "트렌딩 예측 이벤트浏览",
      desc: "홈페이지에서 현재 가장 인기 있는 예측 이벤트를 보고 시장 동향을 이해하세요.",
    },
    step2: {
      title: "관심 있는 이벤트 검색",
      desc: "검색 기능을 사용하여 관심 있는 예측 이벤트를 찾으세요.",
    },
    step3: {
      title: "예측 이벤트 팔로우",
      desc: "관심 있는 예측 이벤트를 팔로우하여 실시간 업데이트를 받으세요.",
    },
    step4: {
      title: "토론에 참여",
      desc: "포럼에서 예측 이벤트에 대한 토론에 참여하고 의견을 공유하세요.",
    },
    step5: {
      title: "지갑 연결하여 예측 시작",
      desc: "크립토 지갑을 연결하고 예측 거래에 참여하세요.",
    },
    footer: "Foresight에서 좋은 시간 보내세요!",
    cta: "탐색 시작",
  },
};

interface OnboardingLayoutProps {
  children: React.ReactNode;
  locale: Locale;
}

export function OnboardingLayout({ children, locale }: OnboardingLayoutProps) {
  const { isOpen, completeOnboarding, closeOnboarding } = useOnboardingGuide();
  const messages = onboardingMessages[locale] || onboardingMessages[defaultLocale];

  // 翻译函数
  const t = (key: string) => {
    const keys = key.split(".");
    let result: any = messages;

    for (const k of keys) {
      if (result[k] === undefined) {
        return key; // 如果找不到翻译，返回原始键
      }
      result = result[k];
    }

    return result;
  };

  return (
    <>
      {children}
      <OnboardingGuide
        isOpen={isOpen}
        onClose={closeOnboarding}
        onComplete={completeOnboarding}
        t={t}
      />
    </>
  );
}
