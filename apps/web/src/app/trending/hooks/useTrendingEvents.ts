"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { FilterSortState } from "@/components/FilterSort";
import {
  type Prediction,
  type TrendingEvent,
  mapPredictionToEvent,
  filterEventsByCategory,
  filterEventsByStatus,
  sortEvents,
} from "@/features/trending/trendingModel";

// 搜索防抖延迟（毫秒）
const SEARCH_DEBOUNCE_DELAY = 300;

export function useTrendingEvents(predictions: Prediction[], filters: FilterSortState) {
  const [displayCount, setDisplayCount] = useState(12);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  // 防抖搜索词 - 避免每次击键都触发筛选计算
  const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_DELAY);

  const allEvents: TrendingEvent[] = useMemo(
    () => predictions.map((prediction) => mapPredictionToEvent(prediction as Prediction)),
    [predictions]
  );

  // 使用防抖后的搜索词进行筛选
  const displayEvents: TrendingEvent[] = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return allEvents;
    const q = debouncedSearchQuery.toLowerCase();
    return allEvents.filter((e) => {
      const title = String(e.title || "").toLowerCase();
      const description = String(e.description || "").toLowerCase();
      const tag = String(e.tag || "").toLowerCase();
      return title.includes(q) || description.includes(q) || tag.includes(q);
    });
  }, [allEvents, debouncedSearchQuery]);

  const sortedEvents: TrendingEvent[] = useMemo(() => {
    const filteredByCategory = filterEventsByCategory(displayEvents, filters.category || null);
    const filteredByStatus = filterEventsByStatus(filteredByCategory, filters.status || null);
    return sortEvents(filteredByStatus, filters.sortBy);
  }, [displayEvents, filters.category, filters.sortBy, filters.status]) as TrendingEvent[];

  const visibleEvents = useMemo(
    () => sortedEvents.slice(0, Math.max(0, displayCount)),
    [sortedEvents, displayCount]
  );

  const totalEventsCount = displayEvents.length;
  const hasMore = displayCount < totalEventsCount;

  // 筛选条件变化时重置分页（使用防抖后的搜索词）
  useEffect(() => {
    setDisplayCount(12);
  }, [filters.category, filters.sortBy, filters.status, debouncedSearchQuery]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + 6, totalEventsCount));
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMore, totalEventsCount]);

  const observerTargetRef = useInfiniteScroll({
    loading: loadingMore,
    hasNextPage: hasMore,
    onLoadMore: handleLoadMore,
    threshold: 0.1,
  });

  return {
    searchQuery,
    setSearchQuery,
    allEvents,
    displayEvents,
    sortedEvents,
    visibleEvents,
    totalEventsCount,
    loadingMore,
    hasMore,
    observerTargetRef,
  };
}
