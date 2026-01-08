import React from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("lucide-react", () => ({
  TrendingUp: (props: any) => <svg data-testid="trending-up-icon" {...props} />,
  Sparkles: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
}));

vi.mock("framer-motion", () => {
  const motionHandler: ProxyHandler<Record<string, any>> = {
    get(_target, prop: string) {
      const tag = prop === "button" ? "button" : "div";
      return ({ children, ...rest }: any) => React.createElement(tag, rest, children);
    },
  };
  return {
    motion: new Proxy({}, motionHandler),
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/FilterSort", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/ui/AnimatedNumber", () => ({
  AnimatedCounter: () => null,
}));

vi.mock("@/components/ui/VirtualizedGrid", () => ({
  VirtualizedGrid: () => null,
}));

vi.mock("@/components/ui/ListStates", () => ({
  AllLoadedNotice: () => null,
  InfiniteScrollSentinel: () => null,
  ListError: ({ title, error }: any) => (
    <div>
      <div>{title}</div>
      <div>{error instanceof Error ? error.message : String(error)}</div>
    </div>
  ),
}));

vi.mock("@/components/EmptyState", () => ({
  __esModule: true,
  default: ({ title, description }: any) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

let TrendingEventsSection: React.ComponentType<any>;

beforeAll(async () => {
  TrendingEventsSection = (await import("../TrendingEventsSection")).TrendingEventsSection;
});

function createBaseProps() {
  return {
    loading: false,
    error: null as unknown,
    filters: { category: null, sortBy: "trending" as const },
    onFilterChange: () => {},
    searchQuery: "",
    totalEvents: 0,
    onClearSearch: () => {},
    followError: null as string | null,
    sortedEvents: [],
    visibleEvents: [],
    followedEvents: new Set<number>(),
    pendingFollows: new Set<number>(),
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
