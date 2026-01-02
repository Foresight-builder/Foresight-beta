import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import zhCN from "../../../messages/zh-CN.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import ko from "../../../messages/ko.json";
import { defaultLocale, locales, type Locale } from "../../i18n-config";

type ForumMessages = (typeof zhCN)["forum"];

const forumMessages: Record<Locale, ForumMessages> = {
  "zh-CN": zhCN.forum,
  en: en.forum,
  es: es.forum,
  ko: ko.forum as ForumMessages,
};

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const raw = store.get("preferred-language")?.value;
  const locale: Locale = raw && locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;
  const forum = forumMessages[locale] || forumMessages[defaultLocale];
  const meta = (forum as any).meta || {};

  const title =
    typeof meta.title === "string"
      ? meta.title
      : "Foresight Prediction Forum - Event discussions and strategy research";
  const description =
    typeof meta.description === "string"
      ? meta.description
      : "Join the Foresight forum to discuss prediction events, share data-driven trading strategies, and learn from other forecasters.";

  return {
    title,
    description,
    alternates: {
      canonical: "/forum",
      languages: {
        "zh-CN": "/forum",
        "en-US": "/forum",
        "es-ES": "/forum",
        "ko-KR": "/forum",
      },
    },
    openGraph: {
      title: typeof meta.ogTitle === "string" ? meta.ogTitle : title,
      description: typeof meta.ogDescription === "string" ? meta.ogDescription : description,
      url: "/forum",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: typeof meta.twitterTitle === "string" ? meta.twitterTitle : title,
      description:
        typeof meta.twitterDescription === "string" ? meta.twitterDescription : description,
    },
  };
}

export default function ForumLayout({ children }: { children: ReactNode }) {
  return children;
}
