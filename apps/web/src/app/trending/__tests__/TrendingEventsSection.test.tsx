import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendingEventsSection } from "../TrendingEventsSection";

function createBaseProps() {
  return {
    loading: false,
    error: null as unknown,
    filters: { category: null, sortBy: "trending" as const },
    onFilterChange: () => {},
    followError: null as string | null,
    sortedEvents: [],
    visibleEvents: [],
    followedEvents: new Set<number>(),
    isAdmin: false,
    deleteBusyId: null as number | null,
    hasMore: false,
    loadingMore: false,
    observerTargetRef: { current: null } as React.Ref<HTMLDivElement>,
    toggleFollow: () => {},
    createCategoryParticlesAtCardClick: () => {},
    openEdit: () => {},
    deleteEvent: () => {},
    onCreatePrediction: () => {},
    tTrending: (key: string) => key,
    tTrendingAdmin: (key: string) => key,
    tEvents: (key: string) => key,
  };
}

describe("TrendingEventsSection", () => {
  it("renders loading state", () => {
    const props = { ...createBaseProps(), loading: true };
    render(<TrendingEventsSection {...props} />);
    expect(screen.getByText("state.loading")).toBeInTheDocument();
  });

  it("renders error state", () => {
    const props = { ...createBaseProps(), error: new Error("Load failed") };
    render(<TrendingEventsSection {...props} />);
    expect(screen.getByText("state.errorTitle")).toBeInTheDocument();
    expect(screen.getByText("Load failed")).toBeInTheDocument();
  });

  it("renders empty state when no events", () => {
    const props = createBaseProps();
    render(<TrendingEventsSection {...props} />);
    expect(screen.getByText("empty.title")).toBeInTheDocument();
    expect(screen.getByText("empty.description")).toBeInTheDocument();
  });
});
