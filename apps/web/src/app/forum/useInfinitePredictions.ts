import { useInfiniteQuery } from "@tanstack/react-query";

export type PredictionItem = {
  id: number;
  title: string;
  description?: string;
  category?: string;
  created_at?: string;
  followers_count?: number;
};

type CursorMeta = {
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
};

type PredictionsResponse = {
  success: boolean;
  data: PredictionItem[];
  cursor: CursorMeta;
  total: number;
};

type UseInfinitePredictionsParams = {
  category?: string;
  search?: string;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 20;

// 预取下一页的函数
async function fetchPredictionsPage(
  params: UseInfinitePredictionsParams,
  cursor?: string
): Promise<PredictionsResponse> {
  const { category, search, pageSize = DEFAULT_PAGE_SIZE } = params;
  const query = new URLSearchParams();
  query.set("limit", String(pageSize));

  if (category && category !== "all") {
    query.set("category", category);
  }
  if (search) {
    query.set("search", search);
  }
  if (cursor) {
    query.set("cursor", cursor);
  }

  const res = await fetch(`/api/predictions?${query.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch predictions");
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.message || "Failed to fetch predictions");
  }

  return json as PredictionsResponse;
}

/**
 * 无限滚动预测列表 Hook
 * 使用游标分页实现高效加载
 * 支持预取下一页提升体验
 */
export function useInfinitePredictions(params: UseInfinitePredictionsParams = {}) {
  const { category, search, pageSize = DEFAULT_PAGE_SIZE } = params;

  const queryResult = useInfiniteQuery({
    queryKey: ["predictions", "infinite", { category, search, pageSize }],
    queryFn: async ({ pageParam }): Promise<PredictionsResponse> => {
      return fetchPredictionsPage(params, pageParam);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.cursor?.hasMore ? lastPage.cursor.nextCursor : undefined;
    },
    initialPageParam: undefined as string | undefined,
    staleTime: 30 * 1000, // 30秒内不重新请求
    gcTime: 5 * 60 * 1000, // 5分钟缓存
  });

  return queryResult;
}

/**
 * 将分页数据展平为单一数组
 */
export function flattenInfiniteData(
  data: { pages: PredictionsResponse[] } | undefined
): PredictionItem[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.data);
}

/**
 * 获取总数
 */
export function getTotalFromInfiniteData(
  data: { pages: PredictionsResponse[] } | undefined
): number {
  if (!data?.pages?.[0]) return 0;
  return data.pages[0].total;
}
