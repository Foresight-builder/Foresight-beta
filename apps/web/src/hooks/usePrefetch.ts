"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * 🚀 数据预取 Hook
 * 
 * 用于在用户悬停或即将导航时预取数据
 * 提升页面切换的感知速度
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * 预取预测详情
   */
  const prefetchPrediction = useCallback(
    (predictionId: string | number) => {
      queryClient.prefetchQuery({
        queryKey: ["prediction", String(predictionId)],
        queryFn: async () => {
          const res = await fetch(`/api/predictions/${predictionId}`);
          if (!res.ok) throw new Error("Failed to fetch prediction");
          return res.json();
        },
        staleTime: 2 * 60 * 1000, // 2分钟
      });
    },
    [queryClient]
  );

  /**
   * 预取预测列表
   */
  const prefetchPredictions = useCallback(
    (params?: { category?: string; status?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set("category", params.category);
      if (params?.status) searchParams.set("status", params.status);

      queryClient.prefetchQuery({
        queryKey: ["predictions", params],
        queryFn: async () => {
          const res = await fetch(`/api/predictions?${searchParams.toString()}`);
          if (!res.ok) throw new Error("Failed to fetch predictions");
          return res.json();
        },
        staleTime: 60 * 1000, // 1分钟
      });
    },
    [queryClient]
  );

  /**
   * 预取用户资料
   */
  const prefetchUserProfile = useCallback(
    (userId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["userProfile", userId],
        queryFn: async () => {
          const res = await fetch(`/api/user-profiles/${userId}`);
          if (!res.ok) throw new Error("Failed to fetch user profile");
          return res.json();
        },
        staleTime: 5 * 60 * 1000, // 5分钟
      });
    },
    [queryClient]
  );

  /**
   * 预取排行榜数据
   */
  const prefetchLeaderboard = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["leaderboard"],
      queryFn: async () => {
        const res = await fetch("/api/user-portfolio/leaderboard");
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        return res.json();
      },
      staleTime: 60 * 1000, // 1分钟
    });
  }, [queryClient]);

  return {
    prefetchPrediction,
    prefetchPredictions,
    prefetchUserProfile,
    prefetchLeaderboard,
  };
}

/**
 * 🚀 悬停预取 - 用于卡片等组件
 * 
 * @example
 * ```tsx
 * const { onMouseEnter } = useHoverPrefetch(() => prefetchPrediction(id));
 * <Card onMouseEnter={onMouseEnter}>...</Card>
 * ```
 */
export function useHoverPrefetch(prefetchFn: () => void) {
  const onMouseEnter = useCallback(() => {
    // 延迟 100ms 执行预取，避免快速滑过时触发
    const timer = setTimeout(prefetchFn, 100);
    return () => clearTimeout(timer);
  }, [prefetchFn]);

  return { onMouseEnter };
}

