import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TrendingClient from "../TrendingClient";
import type { Prediction } from "@/features/trending/trendingModel";

vi.mock("../hooks/useTrendingPage", () => {
  return {
    useTrendingPage: () => ({
      canvas: {
        canvasRef: { current: null },
        canvasReady: false,
        showBackToTop: false,
        handleBackToTopClick: vi.fn(),
      },
      i18n: {
        tTrending: (key: string) => key,
        tNav: (key: string) => key,
        tEvents: (key: string) => key,
        tTrendingAdmin: (key: string) => key,
      },
      list: {
        searchQuery: "",
        setSearchQuery: vi.fn(),
        eventsSectionRef: { current: null },
        loading: false,
        error: null,
        filters: { category: null, sortBy: "trending" as const },
        setFilters: vi.fn(),
        sortedEvents: [],
        visibleEvents: [],
        hasMore: false,
        loadingMore: false,
        observerTargetRef: { current: null } as React.Ref<HTMLDivElement>,
      },
      follow: {
        categoryCounts: {},
        followError: null as string | null,
        followedEvents: new Set<number>(),
        toggleFollow: vi.fn(),
      },
      admin: {
        isAdmin: false,
        deleteBusyId: null as number | null,
        editOpen: false,
        editForm: {} as any,
        savingEdit: false,
        setEditField: vi.fn(),
        closeEdit: vi.fn(),
        submitEdit: vi.fn(),
        openEdit: vi.fn(),
        deleteEvent: vi.fn(),
      },
      hero: {
        categories: [],
        activeTitle: "hero.title",
        activeDescription: "hero.description",
        activeImage: "/hero.png",
        activeCategory: null as string | null,
        activeFollowers: 0,
        activeSlideId: null as number | null,
        currentHeroIndex: 0,
        heroSlideLength: 0,
        handlePrevHero: vi.fn(),
        handleNextHero: vi.fn(),
        handleHeroBulletClick: vi.fn(),
        handleViewAllCategoriesWithScroll: vi.fn(),
        handleCategoryClick: vi.fn(),
      },
      modals: {
        showLoginModal: false,
        handleCloseLoginModal: vi.fn(),
      },
      actions: {
        handleCreatePrediction: vi.fn(),
      },
    }),
  };
});

describe("TrendingClient", () => {
  it("renders hero, events section, footer and back-to-top button", () => {
    const predictions: Prediction[] = [];

    render(<TrendingClient initialPredictions={predictions} />);

    expect(screen.getByText("sections.hotEvents")).toBeInTheDocument();
    expect(screen.getByText("hero.title")).toBeInTheDocument();
    expect(screen.getByText("footer.copyright")).toBeInTheDocument();
    expect(screen.getByText("backToTop")).toBeInTheDocument();
  });
});
