import { Suspense } from "react";
import { getClient } from "@/lib/supabase";
import { CardListSkeleton } from "@/components/skeletons";
import { getPredictionsList } from "../api/predictions/_lib/getPredictionsList";
import TrendingClient from "./TrendingClient";
import type { Prediction } from "@/features/trending/trendingModel";
import zhCN from "../../messages/zh-CN.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import ko from "../../messages/ko.json";
import { defaultLocale, locales, type Locale } from "../../i18n-config";
import { cookies } from "next/headers";

export const revalidate = 60;

type TrendingMessages = (typeof zhCN)["trending"];

const trendingMessages: Record<Locale, TrendingMessages> = {
  "zh-CN": zhCN.trending,
  en: en.trending as unknown as TrendingMessages,
  es: es.trending as unknown as TrendingMessages,
  ko: ko.trending as unknown as TrendingMessages,
};

async function getCurrentLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get("preferred-language")?.value;
  if (raw && locales.includes(raw as Locale)) {
    return raw as Locale;
  }
  return defaultLocale;
}

function buildTrendingJsonLd(predictions: Prediction[], locale: Locale) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";
  const messages = trendingMessages[locale] || trendingMessages[defaultLocale];
  const name =
    (messages as any).sections?.hotEvents ??
    (messages as any).sections?.popularCategories ??
    "Foresight Trending prediction markets";
  const description =
    (messages as any).platformDescription ??
    "Discover and trade trending on-chain prediction markets on Foresight.";

  const items = predictions.slice(0, 50).map((p, index) => {
    const id = p.id;
    const url = `${baseUrl}/prediction/${id}`;
    const description =
      (p as any).description ||
      (p as any).criteria ||
      "On-chain prediction market event on Foresight.";
    const name = (p as any).title || "Foresight prediction market event";
    return {
      "@type": "ListItem",
      position: index + 1,
      url,
      name,
      description,
    };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name,
        url: baseUrl + "/trending",
        description,
        inLanguage: locale,
      },
      {
        "@type": "ItemList",
        name,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        url: baseUrl + "/trending",
        itemListElement: items,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Foresight",
            item: baseUrl + "/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name,
            item: baseUrl + "/trending",
          },
        ],
      },
    ],
  };
}

async function getPredictions(): Promise<Prediction[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const { items } = await getPredictionsList(client as any, {
      includeOutcomes: false,
      limit: 100,
    });

    return items as unknown as Prediction[];
  } catch (error) {
    console.error("Server fetch predictions error:", error);
    return [];
  }
}

export default async function Page() {
  const predictions = await getPredictions();
  const locale = await getCurrentLocale();
  const jsonLd = buildTrendingJsonLd(predictions, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<CardListSkeleton count={6} />}>
        <TrendingClient initialPredictions={predictions} />
      </Suspense>
    </>
  );
}
