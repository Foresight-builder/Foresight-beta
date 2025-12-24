import { Suspense } from "react";
import { getClient } from "@/lib/supabase";
import { CardListSkeleton } from "@/components/skeletons";
import TrendingClient from "./TrendingClient";
import type { Prediction } from "@/features/trending/trendingModel";

export const revalidate = 60;

type RawPrediction = {
  id: number | string | null;
  title: string | null;
  description: string | null;
  min_stake: number | null;
  category: string | null;
  image_url: string | null;
  deadline: string | null;
  status: string | null;
  criteria: string | null;
  type: string | null;
};

type EventFollowRow = {
  event_id: number | string | null;
};

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

  const { data: rawPredictions, error } = await client
    .from("predictions")
    .select("id,title,description,min_stake,category,image_url,deadline,status,criteria,type")
    .order("created_at", { ascending: false })
    .limit(100); // 限制最多返回100条，防止数据量过大

  if (error || !rawPredictions) {
    console.error("Server fetch predictions error:", error);
    return [];
  }

  const predictions = rawPredictions as RawPrediction[];

  const ids = predictions.map((p) => Number(p.id)).filter((n) => Number.isFinite(n));
  const idSet = new Set(ids);
  let counts: Record<number, number> = {};

  if (ids.length > 0) {
    const { data: rawRows, error: rowsError } = await client
      .from("event_follows")
      .select("event_id")
      .in("event_id", ids);

    if (!rowsError && Array.isArray(rawRows)) {
      const rows = rawRows as EventFollowRow[];
      for (const r of rows) {
        const eid = Number(r.event_id);
        if (Number.isFinite(eid) && idSet.has(eid)) {
          counts[eid] = (counts[eid] || 0) + 1;
        }
      }
    } else {
      // Fallback: 如果 select * 失败或太慢，可以用 count 查询 (N+1 problem solved by logic above, but this is just safety)
    }
  }

  const predictionsWithFollowersCount = predictions.map((p) => ({
    ...p,
    followers_count: counts[Number(p.id)] || 0,
  })) as Prediction[];

  return predictionsWithFollowersCount;
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
