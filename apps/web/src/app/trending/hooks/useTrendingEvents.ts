"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { FilterSortState } from "@/components/FilterSort";
import {
  type Prediction,
  type TrendingEvent,
  mapPredictionToEvent,
  filterEventsByCategory,
  filterEventsByStatus,
  sortEvents,
} from "../trendingModel";

export function useTrendingEvents(predictions: Prediction[], filters: FilterSortState) {
  const [displayCount, setDisplayCount] = useState(12);
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const allEvents: TrendingEvent[] = useMemo(
    () => predictions.map((prediction) => mapPredictionToEvent(prediction as Prediction)),
    [predictions]
  );

  const displayEvents = useMemo(() => {
    if (!searchQuery.trim()) return allEvents;
    const q = searchQuery.toLowerCase();
    return allEvents.filter(
      (e: any) =>
        (e.title || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.tag || "").toLowerCase().includes(q)
    );
  }, [allEvents, searchQuery]);

  useEffect(() => {
    setTotalEventsCount(displayEvents.length);
  }, [displayEvents]);

  const sortedEvents: TrendingEvent[] = useMemo(() => {
    const filteredByCategory = filterEventsByCategory(
      displayEvents as TrendingEvent[],
      filters.category || null
    );
    const filteredByStatus = filterEventsByStatus(filteredByCategory, filters.status || null);
    return sortEvents(filteredByStatus, filters.sortBy);
  }, [displayEvents, filters.category, filters.sortBy, filters.status]) as TrendingEvent[];

  const visibleEvents = useMemo(
    () => sortedEvents.slice(0, Math.max(0, displayCount)),
    [sortedEvents, displayCount]
  );

  const hasMore = displayCount < totalEventsCount;

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
