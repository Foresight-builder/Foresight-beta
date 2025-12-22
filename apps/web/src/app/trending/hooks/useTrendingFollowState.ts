"use client";

import { useEffect, useState, useCallback } from "react";
import type { MouseEvent } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toggleFollowPrediction } from "@/lib/follows";
import { supabase } from "@/lib/supabase";
import { createSmartClickEffect, createHeartParticles } from "../trendingAnimations";
import type { TrendingEvent } from "../trendingModel";

export function useTrendingFollowState(
  accountNorm: string | undefined,
  setShowLoginModal: (open: boolean) => void,
  tErrors: (key: string) => string,
  queryClient: QueryClient,
  visibleEvents: TrendingEvent[]
) {
  const [followedEvents, setFollowedEvents] = useState<Set<number>>(new Set());
  const [followError, setFollowError] = useState<string | null>(null);

  const toggleFollow = useCallback(
    async (predictionId: number, event: MouseEvent) => {
      if (!accountNorm) {
        setShowLoginModal(true);
        return;
      }

      if (!Number.isFinite(Number(predictionId))) return;

      const normalizedId = Number(predictionId);
      const wasFollowing = followedEvents.has(normalizedId);

      createSmartClickEffect(event);
      createHeartParticles(event.currentTarget as HTMLElement, wasFollowing);

      setFollowedEvents((prev) => {
        const next = new Set(prev);
        if (next.has(normalizedId)) {
          next.delete(normalizedId);
        } else {
          next.add(normalizedId);
        }
        return next;
      });

      try {
        await toggleFollowPrediction(wasFollowing, normalizedId, accountNorm);
      } catch (err) {
        setFollowError(
          (err as any)?.message ? String((err as any).message) : tErrors("followActionFailed")
        );
        setTimeout(() => setFollowError(null), 3000);
        setFollowedEvents((prev) => {
          const rollback = new Set(prev);
          if (wasFollowing) {
            rollback.add(normalizedId);
          } else {
            rollback.delete(normalizedId);
          }
          return rollback;
        });
      }
    },
    [accountNorm, followedEvents, setShowLoginModal, tErrors]
  );

  useEffect(() => {
    if (!accountNorm) return;
    (async () => {
      try {
        const res = await fetch(`/api/user-follows?address=${accountNorm}`);
        if (!res.ok) return;
        const data = await res.json();
        const ids = new Set<number>((data?.follows || []).map((e: any) => Number(e.id)));
        setFollowedEvents(ids);
      } catch {}
    })();
  }, [accountNorm]);

  useEffect(() => {
    let windowIds: number[] = [];
    windowIds = visibleEvents.map((e) => Number(e?.id)).filter(Number.isFinite) as number[];
    const ids = Array.from(new Set(windowIds));
    if (ids.length === 0) return;
    if (!supabase || typeof (supabase as any).channel !== "function") {
      return;
    }

    let channel: any = null;
    let isSubscribed = true;

    const filterIn = `event_id=in.(${ids.join(",")})`;
    channel = (supabase as any).channel("event_follows_trending");

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_follows",
          filter: filterIn,
        },
        (payload: any) => {
          if (!isSubscribed) return;
          const row = payload?.new || {};
          const eid = Number(row?.event_id);
          const uid = String(row?.user_id || "");
          if (!Number.isFinite(eid)) return;
          if (!accountNorm || (uid || "").toLowerCase() !== accountNorm) {
            queryClient.setQueryData(["predictions"], (old: any[]) =>
              old?.map((p: any) =>
                p?.id === eid
                  ? {
                      ...p,
                      followers_count: Number(p?.followers_count || 0) + 1,
                    }
                  : p
              )
            );
          }
          if (accountNorm && (uid || "").toLowerCase() === accountNorm) {
            setFollowedEvents((prev) => {
              const s = new Set(prev);
              s.add(eid);
              return s;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "event_follows",
          filter: filterIn,
        },
        (payload: any) => {
          if (!isSubscribed) return;
          const row = payload?.old || {};
          const eid = Number(row?.event_id);
          const uid = String(row?.user_id || "");
          if (!Number.isFinite(eid)) return;
          if (!accountNorm || (uid || "").toLowerCase() !== accountNorm) {
            queryClient.setQueryData(["predictions"], (old: any[]) =>
              old?.map((p: any) =>
                p?.id === eid
                  ? {
                      ...p,
                      followers_count: Math.max(0, Number(p?.followers_count || 0) - 1),
                    }
                  : p
              )
            );
          }
          if (accountNorm && (uid || "").toLowerCase() === accountNorm) {
            setFollowedEvents((prev) => {
              const s = new Set(prev);
              s.delete(eid);
              return s;
            });
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;

      if (channel) {
        try {
          channel.unsubscribe();
          (supabase as any).removeChannel(channel);
          channel = null;
        } catch {}
      }
    };
  }, [visibleEvents, accountNorm, queryClient]);

  return { followedEvents, followError, toggleFollow };
}
