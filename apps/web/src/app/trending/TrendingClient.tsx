"use client";

import React, { useRef, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { useUserProfileOptional } from "@/contexts/UserProfileContext";
import type { FilterSortState } from "@/components/FilterSort";
import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { usePersistedState } from "@/hooks/usePersistedState";
import { usePredictions } from "@/hooks/useQueries";
import { useTranslations } from "@/lib/i18n";
import {
  HERO_EVENTS,
  TRENDING_CATEGORIES,
  CATEGORY_MAPPING,
  type Prediction,
  type TrendingEvent,
} from "./trendingModel";
import { createSmartClickEffect, createCategoryParticlesAtCardClick } from "./trendingAnimations";
import { useTrendingCanvas, useBackToTop } from "./useTrendingCanvas";
import { TrendingHero } from "./TrendingHero";
import { TrendingEditModal } from "./TrendingEditModal";
import { TrendingLoginModal } from "./TrendingLoginModal";
import { TrendingEventsSection } from "./TrendingEventsSection";
import { useTrendingEvents } from "./hooks/useTrendingEvents";
import { useTrendingFollowState } from "./hooks/useTrendingFollowState";
import { useTrendingAdminEvents } from "./hooks/useTrendingAdminEvents";
import { useTrendingHero } from "./hooks/useTrendingHero";
import { useCategoryCounts } from "./hooks/useCategoryCounts";

type ActiveHeroSlideData = {
  activeTitle: string;
  activeDescription: string;
  activeImage: string;
  activeCategory: string;
  activeFollowers: number;
  activeSlideId: number | null;
};

function buildTrendingCategories(tTrending: (key: string) => string) {
  return TRENDING_CATEGORIES.map((cat) => {
    const id = CATEGORY_MAPPING[cat.name];
    const label = id ? tTrending(`category.${id}`) : cat.name;
    return { ...cat, label };
  });
}

function getActiveHeroSlideData(
  heroSlideEvents: any[],
  currentHeroIndex: number,
  tTrending: (key: string) => string,
  tEvents: (key: string) => string
): ActiveHeroSlideData {
  const hasHeroEvents = heroSlideEvents.length > 0;
  const activeSlide = hasHeroEvents
    ? heroSlideEvents[currentHeroIndex % heroSlideEvents.length]
    : null;
  const hasFallbackEvents = HERO_EVENTS.length > 0;
  const fallbackIndex = hasFallbackEvents ? currentHeroIndex % HERO_EVENTS.length : 0;
  const fallbackEvent = hasFallbackEvents ? HERO_EVENTS[fallbackIndex] : null;

  const rawActiveTitle = activeSlide
    ? String(activeSlide.title || "")
    : fallbackEvent
      ? tTrending(`hero.${fallbackEvent.id}.title`)
      : "";
  const activeTitle = activeSlide ? tEvents(rawActiveTitle) : rawActiveTitle;

  const activeDescription = activeSlide
    ? String(activeSlide.description || "")
    : fallbackEvent
      ? tTrending(`hero.${fallbackEvent.id}.description`)
      : "";

  const activeImage = activeSlide
    ? String(activeSlide.image || "")
    : fallbackEvent
      ? String(fallbackEvent.image || "")
      : "";

  const activeCategory = activeSlide
    ? String(activeSlide.tag || "")
    : fallbackEvent
      ? String(fallbackEvent.category || "")
      : "";

  const activeFollowers = activeSlide
    ? Number(activeSlide.followers_count || 0)
    : fallbackEvent
      ? Number(fallbackEvent.followers || 0)
      : 0;

  const activeSlideId = activeSlide ? Number(activeSlide.id) : null;

  return {
    activeTitle,
    activeDescription,
    activeImage,
    activeCategory,
    activeFollowers,
    activeSlideId,
  };
}

function useTrendingList(initialPredictions: Prediction[] | undefined): {
  predictions: Prediction[];
  loading: boolean;
  error: unknown;
  filters: FilterSortState;
  setFilters: (next: FilterSortState) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  displayEvents: TrendingEvent[];
  sortedEvents: TrendingEvent[];
  visibleEvents: TrendingEvent[];
  loadingMore: boolean;
  hasMore: boolean;
  observerTargetRef: ReturnType<typeof useTrendingEvents>["observerTargetRef"];
} {
  const {
    data: predictions = [],
    isLoading: loading,
    error,
  } = usePredictions(undefined, { initialData: initialPredictions });

  const [filters, setFilters] = usePersistedState<FilterSortState>("trending_filters", {
    category: null,
    sortBy: "trending",
  });

  const {
    searchQuery,
    setSearchQuery,
    displayEvents,
    sortedEvents,
    visibleEvents,
    loadingMore,
    hasMore,
    observerTargetRef,
  } = useTrendingEvents(predictions, filters);

  return {
    predictions: predictions as Prediction[],
    loading,
    error,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    displayEvents,
    sortedEvents,
    visibleEvents,
    loadingMore,
    hasMore,
    observerTargetRef,
  };
}

export default function TrendingPage({
  initialPredictions,
}: {
  initialPredictions?: Prediction[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWorkerRef = useRef<Worker | null>(null);
  const offscreenActiveRef = useRef<boolean>(false);
  const { canvasReady } = useTrendingCanvas(canvasRef, canvasWorkerRef, offscreenActiveRef);
  const { showBackToTop, scrollToTop } = useBackToTop();

  const tErrors = useTranslations("errors");
  const tTrending = useTranslations("trending");
  const tTrendingAdmin = useTranslations("trending.admin");
  const tNav = useTranslations("nav");
  const tEvents = useTranslations();
  const productsSectionRef = useRef<HTMLElement | null>(null);

  const {
    predictions,
    loading,
    error,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    displayEvents,
    sortedEvents,
    visibleEvents,
    loadingMore,
    hasMore,
    observerTargetRef,
  } = useTrendingList(initialPredictions as Prediction[] | undefined);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const { account, siweLogin } = useWallet();
  const profileCtx = useUserProfileOptional();
  const accountNorm = account?.toLowerCase();

  const categoryCounts = useCategoryCounts();

  // 从API获取预测事件数据
  /*
  const [predictions, setPredictions] = useState<any[]>(
    initialPredictions || []
  );
  const [loading, setLoading] = useState(!initialPredictions);
  const [error, setError] = useState<string | null>(null);

  // 获取预测事件数据
  useEffect(() => {
    // 如果有初始数据，则不再获取
    if (initialPredictions) {
      setTotalEventsCount(initialPredictions.length);
      if (initialPredictions.length < 6) {
        setDisplayCount(initialPredictions.length);
      }
      return;
    }

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const fetchWithRetry = async (
      url: string,
      opts: RequestInit = {},
      retries = 2,
      baseDelay = 300
    ) => {
      let attempt = 0;
      while (true) {
        try {
          const res = await fetch(url, opts);
          return res;
        } catch (err: any) {
          // 忽略 AbortError（热更新/页面切换常见），不进入失败状态
          if (err?.name === "AbortError") {
            throw err;
          }
          if (attempt >= retries) throw err;
          const delay = baseDelay * Math.pow(2, attempt);
          await sleep(delay);
          attempt++;
        }
      }
    };

    const fetchPredictions = async () => {
      try {
        setLoading(true);
        // 移除limit参数，获取所有事件数据；增加轻量重试与中断忽略
        const controller = new AbortController();
        const response = await fetchWithRetry(
          "/api/predictions",
          { signal: controller.signal },
          2,
          300
        );
        const result = await response.json();

        if (result.success) {
          setPredictions(result.data);
          setTotalEventsCount(result.data.length);
          // 确保displayCount不超过实际数据长度
          if (result.data.length < 6) {
            setDisplayCount(result.data.length);
          }
        } else {
          setError(result.message || "获取数据失败");
        }
      } catch (err) {
        // 热更新或主动取消时不显示失败
        if ((err as any)?.name === "AbortError") {
          console.warn("预测列表请求已中止（可能由热更新触发）");
        } else {
          setError("网络请求失败");
          console.error("获取预测事件失败:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);
  */

  const { followedEvents, followError, toggleFollow } = useTrendingFollowState(
    accountNorm,
    setShowLoginModal,
    tErrors,
    queryClient,
    visibleEvents
  );
  const {
    isAdmin,
    editOpen,
    editForm,
    savingEdit,
    deleteBusyId,
    openEdit,
    closeEdit,
    setEditField,
    submitEdit,
    deleteEvent,
  } = useTrendingAdminEvents({
    accountNorm,
    profileIsAdmin: profileCtx?.isAdmin,
    siweLogin,
    queryClient,
    tTrendingAdmin,
    tTrending,
  });

  const categories = useMemo(() => buildTrendingCategories(tTrending), [tTrending]);
  const {
    currentHeroIndex,
    heroSlideEvents,
    heroSlideLength,
    handlePrevHero,
    handleNextHero,
    handleHeroBulletClick,
    handleViewAllCategories,
    handleCategoryClick,
  } = useTrendingHero(displayEvents, categories, setFilters);

  const {
    activeTitle,
    activeDescription,
    activeImage,
    activeCategory,
    activeFollowers,
    activeSlideId,
  } = getActiveHeroSlideData(heroSlideEvents, currentHeroIndex, tTrending, tEvents);
  const handleViewAllCategoriesWithScroll = () => {
    handleViewAllCategories();
    productsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-rose-100 overflow-x-hidden text-gray-900">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-500 ease-out ${
          canvasReady ? "opacity-40" : "opacity-0"
        }`}
      />
      <TrendingHero
        categories={categories}
        categoryCounts={categoryCounts}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        activeTitle={activeTitle}
        activeDescription={activeDescription}
        activeImage={activeImage}
        activeCategory={activeCategory}
        activeFollowers={activeFollowers}
        activeSlideId={activeSlideId}
        currentHeroIndex={currentHeroIndex}
        heroSlideLength={heroSlideLength}
        onPrevHero={handlePrevHero}
        onNextHero={handleNextHero}
        onHeroBulletClick={handleHeroBulletClick}
        onViewAllCategories={handleViewAllCategoriesWithScroll}
        onCategoryClick={handleCategoryClick}
        tTrending={tTrending}
        tNav={tNav}
      />

      <section
        ref={productsSectionRef}
        className="relative z-10 px-10 py-12 bg-white/40 backdrop-blur-xl rounded-t-[3rem] border-t border-white/50"
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center flex items-center justify-center gap-3">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          {tTrending("sections.hotEvents")}
          <span className="w-2 h-2 rounded-full bg-purple-500" />
        </h3>
        <TrendingEventsSection
          loading={loading}
          error={error}
          filters={filters}
          onFilterChange={setFilters}
          followError={followError}
          sortedEvents={sortedEvents}
          visibleEvents={visibleEvents}
          followedEvents={followedEvents}
          isAdmin={isAdmin}
          deleteBusyId={deleteBusyId}
          hasMore={hasMore}
          loadingMore={loadingMore}
          observerTargetRef={observerTargetRef}
          toggleFollow={toggleFollow}
          createCategoryParticlesAtCardClick={createCategoryParticlesAtCardClick}
          openEdit={openEdit}
          deleteEvent={deleteEvent}
          onCreatePrediction={() => router.push("/prediction/new")}
          tTrending={tTrending}
          tTrendingAdmin={tTrendingAdmin}
          tEvents={tEvents}
        />
      </section>

      <TrendingEditModal
        open={editOpen}
        editForm={editForm}
        savingEdit={savingEdit}
        onChangeField={setEditField}
        onClose={closeEdit}
        onSubmit={submitEdit}
        tTrendingAdmin={tTrendingAdmin}
        tTrending={tTrending}
      />

      <TrendingLoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        tTrending={tTrending}
      />

      <footer className="relative z-10 text-center py-8 text-black text-sm">
        © 2025 Foresight. All rights reserved.
      </footer>

      {/* 返回顶部按钮 */}
      <BackToTopButton
        show={showBackToTop}
        onClick={(e) => {
          scrollToTop();
          createSmartClickEffect(e);
        }}
        label="返回顶部"
      />
    </div>
  );
}
