import { MetadataRoute } from "next";
import { getClient } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/trending`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/forum`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/proposals`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // 动态页面：预测事件
  let predictionPages: MetadataRoute.Sitemap = [];

  try {
    const client = getClient();
    if (client) {
      const { data: predictions } = await (client as any)
        .from("predictions")
        .select("id, updated_at, status")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(500);

      if (predictions) {
        predictionPages = predictions.map((p: any) => ({
          url: `${baseUrl}/prediction/${p.id}`,
          lastModified: new Date(p.updated_at || Date.now()),
          changeFrequency: "daily" as const,
          priority: 0.8,
        }));
      }
    }
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }

  return [...staticPages, ...predictionPages];
}
