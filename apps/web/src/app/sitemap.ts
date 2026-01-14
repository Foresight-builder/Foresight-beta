import { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase.server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";

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
      url: `${baseUrl}/flags`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
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

  let predictionPages: MetadataRoute.Sitemap = [];
  let completedPredictionPages: MetadataRoute.Sitemap = [];
  let proposalPages: MetadataRoute.Sitemap = [];

  try {
    const client = supabaseAdmin;
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

      const { data: completedPredictions } = await (client as any)
        .from("predictions")
        .select("id, updated_at, status, deadline")
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (completedPredictions) {
        completedPredictionPages = completedPredictions.map((p: any) => ({
          url: `${baseUrl}/prediction/${p.id}`,
          lastModified: new Date(p.updated_at || p.deadline || Date.now()),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }));
      }

      const { data: proposals } = await (client as any)
        .from("forum_threads")
        .select("id, created_at, updated_at, event_id")
        .eq("event_id", 0)
        .order("created_at", { ascending: false })
        .limit(500);

      if (proposals) {
        proposalPages = proposals.map((p: any) => ({
          url: `${baseUrl}/proposals/${p.id}`,
          lastModified: new Date(p.updated_at || p.created_at || Date.now()),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }));
      }
    }
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }

  return [...staticPages, ...predictionPages, ...completedPredictionPages, ...proposalPages];
}
