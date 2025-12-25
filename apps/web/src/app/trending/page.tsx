import { Suspense } from "react";
import { getClient } from "@/lib/supabase";
import { CardListSkeleton } from "@/components/skeletons";
import { getPredictionsList } from "../api/predictions/_lib/getPredictionsList";
import TrendingClient from "./TrendingClient";
import type { Prediction } from "@/features/trending/trendingModel";

export const revalidate = 60;

function buildTrendingJsonLd(predictions: Prediction[]) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";
  const items = predictions.slice(0, 50).map((p, index) => {
    const id = p.id;
    const url = `${baseUrl}/prediction/${id}`;
    const description =
      (p as any).description ||
      (p as any).criteria ||
      "链上预测市场事件，参与交易观点，基于区块链的去中心化预测市场平台。";
    const name = (p as any).title || "Foresight 预测市场事件";
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
        name: "Foresight 热门预测市场",
        url: baseUrl + "/trending",
        description:
          "在 Foresight 热门预测市场中参与链上预测事件交易，发现高赔率机会，并与提案广场、成就 Flags、预测论坛和排行榜联动。",
        inLanguage: "zh-CN",
      },
      {
        "@type": "ItemList",
        name: "Foresight 热门预测市场",
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
            name: "首页",
            item: baseUrl + "/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "热门预测",
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
  const jsonLd = buildTrendingJsonLd(predictions);

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
