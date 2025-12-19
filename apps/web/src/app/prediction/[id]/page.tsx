import PredictionDetailClient from "./PredictionDetailClient";
import { getClient } from "@/lib/supabase";
import { Metadata, ResolvingMetadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// 获取预测事件详情的辅助函数
async function getPrediction(id: string) {
  const client = getClient();
  if (!client) return null;

  const { data } = await (client as any).from("predictions").select("*").eq("id", id).single();

  return data;
}

// 动态生成 Metadata
export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const prediction = await getPrediction(id);

  if (!prediction) {
    return {
      title: "Prediction Not Found",
    };
  }

  const previousImages = (await parent).openGraph?.images || [];
  const imageUrl = prediction.image_url || "/og-image.png";

  return {
    title: prediction.title,
    description: prediction.description.slice(0, 160),
    openGraph: {
      title: prediction.title,
      description: prediction.description.slice(0, 160),
      images: [imageUrl, ...previousImages],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: prediction.title,
      description: prediction.description.slice(0, 160),
      images: [imageUrl],
    },
  };
}

export default function Page() {
  return <PredictionDetailClient />;
}
