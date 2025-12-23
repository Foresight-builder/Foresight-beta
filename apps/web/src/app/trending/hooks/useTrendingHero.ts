"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FilterSortState } from "@/components/FilterSort";
import {
  HERO_EVENTS,
  CATEGORY_MAPPING,
  getActiveHeroSlideData,
  type TrendingEvent,
  type TrendingCategory,
} from "../trendingModel";

type HeroCategories = TrendingCategory[];

type SetFiltersFn = Dispatch<SetStateAction<FilterSortState>>;

export function useTrendingHero(
  displayEvents: TrendingEvent[],
  categories: HeroCategories,
  setFilters: SetFiltersFn,
  tTrending: (key: string) => string,
  tEvents: (key: string) => string
) {
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prevIndex) => prevIndex + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const heroSlideEvents = useMemo<TrendingEvent[]>(() => {
    const pool = displayEvents;
    if (pool.length === 0) return [];
    const now = Date.now();

    const popularitySorter = (a: TrendingEvent, b: TrendingEvent) => {
      const fa = Number(a.followers_count || 0);
      const fb = Number(b.followers_count || 0);
      if (fb !== fa) return fb - fa;
      const da = new Date(String(a?.deadline || 0)).getTime() - now;
      const db = new Date(String(b?.deadline || 0)).getTime() - now;
      const ta = da <= 0 ? Number.POSITIVE_INFINITY : da;
      const tb = db <= 0 ? Number.POSITIVE_INFINITY : db;
      return ta - tb;
    };

    const tags = Array.from(new Set(pool.map((e) => String(e.tag || "")).filter(Boolean)));
    const picks = tags
      .map<TrendingEvent | null>((tag) => {
        const group = pool.filter((e) => String(e.tag || "") === tag);
        if (group.length === 0) return null;
        return [...group].sort(popularitySorter)[0];
      })
      .filter((ev): ev is TrendingEvent => ev !== null);

    return [...picks].sort((a, b) => {
      const tagA = String(a.tag || "");
      const tagB = String(b.tag || "");
      const indexA = categories.findIndex((c) => c.name === tagA);
      const indexB = categories.findIndex((c) => c.name === tagB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return popularitySorter(a, b);
    });
  }, [displayEvents, categories]);

  const heroSlideLength = heroSlideEvents.length || HERO_EVENTS.length;

  const {
    activeTitle,
    activeDescription,
    activeImage,
    activeCategory,
    activeFollowers,
    activeSlideId,
  } = useMemo(
    () => getActiveHeroSlideData(heroSlideEvents, currentHeroIndex, tTrending, tEvents),
    [heroSlideEvents, currentHeroIndex, tTrending, tEvents]
  );

  const handlePrevHero = useCallback(() => {
    setCurrentHeroIndex((prev) =>
      prev === 0 ? (heroSlideEvents.length || HERO_EVENTS.length) - 1 : prev - 1
    );
  }, [heroSlideEvents.length]);

  const handleNextHero = useCallback(() => {
    setCurrentHeroIndex((prev) => prev + 1);
  }, []);

  const handleHeroBulletClick = (idx: number) => {
    setCurrentHeroIndex(idx);
  };

  const handleViewAllCategories = () => {
    setFilters((prev) => ({ ...prev, category: "all" }));
  };

  const handleCategoryClick = (categoryName: string) => {
    const idx = heroSlideEvents.findIndex((ev) => String(ev?.tag || "") === categoryName);
    if (idx >= 0) {
      setCurrentHeroIndex(idx);
    } else {
      const fallbackIdx = HERO_EVENTS.findIndex((ev) => ev.category === categoryName);
      if (fallbackIdx >= 0) setCurrentHeroIndex(fallbackIdx);
    }
    const categoryId = CATEGORY_MAPPING[categoryName as keyof typeof CATEGORY_MAPPING];
    if (categoryId) {
      setFilters((prev) => ({ ...prev, category: categoryId }));
    }
  };

  return {
    currentHeroIndex,
    heroSlideEvents,
    heroSlideLength,
    activeTitle,
    activeDescription,
    activeImage,
    activeCategory,
    activeFollowers,
    activeSlideId,
    handlePrevHero,
    handleNextHero,
    handleHeroBulletClick,
    handleViewAllCategories,
    handleCategoryClick,
    setCurrentHeroIndex,
  };
}
