"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { HERO_EVENTS, CATEGORY_MAPPING } from "../trendingModel";

export function useTrendingHero(displayEvents: any[], categories: any[], setFilters: any) {
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prevIndex) => prevIndex + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const heroSlideEvents = useMemo(() => {
    const pool = displayEvents;
    if (pool.length === 0) return [] as any[];
    const now = Date.now();

    const popularitySorter = (a: any, b: any) => {
      const fa = Number(a?.followers_count || 0);
      const fb = Number(b?.followers_count || 0);
      if (fb !== fa) return fb - fa;
      const da = new Date(String(a?.deadline || 0)).getTime() - now;
      const db = new Date(String(b?.deadline || 0)).getTime() - now;
      const ta = da <= 0 ? Number.POSITIVE_INFINITY : da;
      const tb = db <= 0 ? Number.POSITIVE_INFINITY : db;
      return ta - tb;
    };

    const tags = Array.from(new Set(pool.map((e: any) => String(e.tag || "")).filter(Boolean)));
    const picks = tags
      .map((tag) => {
        const group = pool.filter((e: any) => String(e.tag || "") === tag);
        if (group.length === 0) return null as any;
        return [...group].sort(popularitySorter)[0];
      })
      .filter(Boolean);

    return [...picks].sort((a, b) => {
      const tagA = String(a.tag || "");
      const tagB = String(b.tag || "");
      const indexA = categories.findIndex((c: any) => c.name === tagA);
      const indexB = categories.findIndex((c: any) => c.name === tagB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return popularitySorter(a, b);
    });
  }, [displayEvents, categories]);

  const heroSlideLength = heroSlideEvents.length || HERO_EVENTS.length;

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
    setFilters((prev: any) => ({ ...prev, category: "all" }));
  };

  const handleCategoryClick = (categoryName: string) => {
    const idx = heroSlideEvents.findIndex((ev: any) => String(ev?.tag || "") === categoryName);
    if (idx >= 0) {
      setCurrentHeroIndex(idx);
    } else {
      const fallbackIdx = HERO_EVENTS.findIndex((ev) => ev.category === categoryName);
      if (fallbackIdx >= 0) setCurrentHeroIndex(fallbackIdx);
    }
    const categoryId = CATEGORY_MAPPING[categoryName as keyof typeof CATEGORY_MAPPING];
    if (categoryId) {
      setFilters((prev: any) => ({ ...prev, category: categoryId }));
    }
  };

  return {
    currentHeroIndex,
    heroSlideEvents,
    heroSlideLength,
    handlePrevHero,
    handleNextHero,
    handleHeroBulletClick,
    handleViewAllCategories,
    handleCategoryClick,
    setCurrentHeroIndex,
  };
}
