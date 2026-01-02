import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import zhCN from "../../../messages/zh-CN.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import ko from "../../../messages/ko.json";
import { defaultLocale, locales, type Locale } from "../../i18n-config";

type TrendingMessages = (typeof zhCN)["trending"];

const trendingMessages: Record<Locale, TrendingMessages> = {
  "zh-CN": zhCN.trending,
  en: en.trending,
  es: es.trending,
  ko: ko.trending as TrendingMessages,
};

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const raw = store.get("preferred-language")?.value;
  const locale: Locale = raw && locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;

  const trending = trendingMessages[locale] || trendingMessages[defaultLocale];
  const meta = (trending as any).meta || {};

  const title =
    typeof meta.title === "string"
      ? meta.title
      : "Foresight Trending Markets - On-chain prediction and trading";
  const description =
    typeof meta.description === "string"
      ? meta.description
      : "Discover trending prediction markets on Foresight and trade on real-world events with transparent on-chain settlement.";

  return {
    title,
    description,
    alternates: {
      canonical: "/trending",
      languages: {
        "zh-CN": "/trending",
        "en-US": "/trending",
        "es-ES": "/trending",
        "ko-KR": "/trending",
      },
    },
    openGraph: {
      title: typeof meta.ogTitle === "string" ? meta.ogTitle : title,
      description: typeof meta.ogDescription === "string" ? meta.ogDescription : description,
      url: "/trending",
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

export default function TrendingLayout({ children }: { children: ReactNode }) {
  return children;
}
