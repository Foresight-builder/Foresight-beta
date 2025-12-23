"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";
import { useUserProfileOptional } from "@/contexts/UserProfileContext";
import { useTranslations } from "@/lib/i18n";
import { type Prediction, buildTrendingCategories } from "../trendingModel";
import { createSmartClickEffect } from "../trendingAnimations";
import { useTrendingCanvas, useBackToTop } from "../useTrendingCanvas";
import { useTrendingList } from "./useTrendingList";
import { useTrendingFollowState } from "./useTrendingFollowState";
import { useTrendingAdminEvents } from "./useTrendingAdminEvents";
import { useTrendingHero } from "./useTrendingHero";
import { useCategoryCounts } from "./useCategoryCounts";

type ScrollToSectionOptions = {
  onBeforeScroll?: () => void;
  targetRef: React.RefObject<HTMLElement | null>;
};

function scrollToSectionWithBehavior(options: ScrollToSectionOptions) {
  if (options.onBeforeScroll) options.onBeforeScroll();
  const target = options.targetRef.current;
  if (target) {
    target.scrollIntoView({ behavior: "smooth" });
  }
}

export function useTrendingPage(initialPredictions?: Prediction[]) {
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
  } = useTrendingList(initialPredictions);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const { account, siweLogin } = useWallet();
  const profileCtx = useUserProfileOptional();
  const accountNorm = account?.toLowerCase();

  const categoryCounts = useCategoryCounts();

  const { followedEvents, followError, toggleFollow } = useTrendingFollowState(
    accountNorm,
    () => setShowLoginModal(true),
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
  } = useTrendingHero(displayEvents, categories, setFilters, tTrending, tEvents);

  const handleViewAllCategoriesWithScroll = useCallback(() => {
    scrollToSectionWithBehavior({
      onBeforeScroll: handleViewAllCategories,
      targetRef: productsSectionRef,
    });
  }, [handleViewAllCategories, productsSectionRef]);

  const handleBackToTopClick = useCallback(
    (e: React.MouseEvent) => {
      scrollToTop();
      createSmartClickEffect(e);
    },
    [scrollToTop]
  );

  const handleCreatePrediction = useCallback(() => {
    router.push("/prediction/new");
  }, [router]);

  return {
    canvasRef,
    canvasReady,
    showBackToTop,
    handleBackToTopClick,
    tTrending,
    tTrendingAdmin,
    tNav,
    tEvents,
    productsSectionRef,
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
    showLoginModal,
    setShowLoginModal,
    categoryCounts,
    followedEvents,
    followError,
    toggleFollow,
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
    categories,
    currentHeroIndex,
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
    handleViewAllCategoriesWithScroll,
    handleCategoryClick,
    handleCreatePrediction,
  };
}

export type TrendingPageViewModel = ReturnType<typeof useTrendingPage>;
