import { getClient } from '@/lib/supabase';
import PredictionDetailClient, { PredictionDetail } from './PredictionDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPrediction(id: string): Promise<PredictionDetail | null> {
  if (!id || isNaN(parseInt(id))) return null;
  const predictionId = parseInt(id);

  const client = getClient();
  if (!client) return null;

  const { data: prediction, error } = await client
    .from("predictions")
    .select('*, outcomes:prediction_outcomes(*)')
    .eq("id", predictionId)
    .single();

  if (error || !prediction) return null;

  // Mock stats or fetch real stats if available in DB
  // Since stats are usually computed on the fly or from a view/cache, 
  // and the client does a secondary fetch for stats, we can provide basic structure here.
  // Or better, replicate the logic from /api/predictions/[id] if possible.
  // The API route calculates stats from `bets` table or similar.
  // For SSR speed, we can return the main data and let client fetch stats (as we implemented in Client Component).
  // But to match the type, we need to provide the shape.

  const now = new Date();
  const deadline = new Date(prediction.deadline);
  const created = new Date(prediction.created_at);
  
  const timeInfo = {
    createdAgo: '刚刚', // Simple fallback, client will update or hydration might mismatch slightly (use a library or just string)
    deadlineIn: '计算中...',
    isExpired: now > deadline
  };

  // We can provide empty stats and let client fill them
  const stats = {
    yesAmount: 0,
    noAmount: 0,
    totalAmount: 0,
    participantCount: 0,
    yesProbability: 50,
    noProbability: 50,
    betCount: 0
  };

  return {
    ...prediction,
    stats,
    timeInfo
  } as PredictionDetail;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prediction = await getPrediction(id);
  
  return <PredictionDetailClient initialPrediction={prediction} />;
}
