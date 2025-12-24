import PredictionDetailClient from "./PredictionDetailClient";
import { getClient } from "@/lib/supabase";
import { Metadata, ResolvingMetadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getPrediction(id: string) {
  const client = getClient();
  if (!client) return null;

  const { data } = await (client as any).from("predictions").select("*").eq("id", id).single();

  return data;
}

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
      description: "The requested prediction market event could not be found.",
    };
  }

  const previousImages = (await parent).openGraph?.images || [];
  const imageUrl = prediction.image_url || "/og-image.png";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";
  const title = prediction.title || "Foresight 预测市场事件";
  const rawDescription =
    prediction.description ||
    prediction.criteria ||
    "链上预测市场事件，参与交易观点，基于区块链的去中心化预测市场平台。";
  const description =
    rawDescription.length > 160 ? rawDescription.slice(0, 157) + "..." : rawDescription;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/prediction/${id}`,
    },
    openGraph: {
      title,
      description,
      images: [imageUrl, ...previousImages],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function Page() {
  return <PredictionDetailClient />;
}
