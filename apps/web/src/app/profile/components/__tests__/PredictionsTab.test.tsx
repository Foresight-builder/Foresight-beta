import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { PredictionsTab } from "../PredictionsTab";

vi.mock("@/lib/i18n", () => ({
  useTranslations: vi.fn((namespace?: string) => {
    return (key: string) => (namespace ? `${namespace}.${key}` : key);
  }),
  formatTranslation: (template: string) => template,
}));

vi.mock("lucide-react", () => ({
  TrendingUp: () => <svg data-testid="trending-icon" />,
  Users: () => <svg data-testid="users-icon" />,
  Wallet: () => <svg data-testid="wallet-icon" />,
  Trophy: () => <svg data-testid="trophy-icon" />,
  Activity: () => <svg data-testid="activity-icon" />,
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/EmptyState", () => ({
  __esModule: true,
  default: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <div>{title}</div>
      {description && <div>{description}</div>}
    </div>
  ),
}));

describe("PredictionsTab 组件", () => {
  const baseProps = {
    address: "0x123",
    positions: [],
    portfolioStats: null,
    loading: false,
    error: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("加载中时应显示加载指示器", () => {
    render(<PredictionsTab {...baseProps} loading />);

    expect(document.querySelector(".animate-spin")).not.toBeNull();
  });

  it("未提供地址时应显示空状态", () => {
    render(<PredictionsTab {...baseProps} address={null} />);

    expect(screen.getByText("profile.predictions.empty.title")).toBeInTheDocument();
    expect(screen.getByText("profile.predictions.empty.description")).toBeInTheDocument();
  });

  it("请求失败时应显示错误提示", () => {
    render(<PredictionsTab {...baseProps} error />);

    expect(screen.getByText("profile.predictions.errors.loadFailed")).toBeInTheDocument();
  });

  it("有持仓时应显示统计卡片和列表标题", () => {
    const props = {
      ...baseProps,
      positions: [
        {
          id: 1,
          title: "event-1",
          image_url: null,
          outcome: "Yes",
          stake: 100,
          pnl: "+10",
          status: "active",
          stats: {
            yesProbability: 0.7,
            noProbability: 0.3,
            totalAmount: 500,
            participantCount: 10,
          },
        },
      ] as any[],
      portfolioStats: {
        total_invested: 100,
        realized_pnl: 10,
        win_rate: "50%",
        active_count: 1,
      } as any,
    };

    render(<PredictionsTab {...props} />);

    expect(screen.getByText("profile.overview.cards.totalInvested")).toBeInTheDocument();
    expect(screen.getByText("profile.overview.cards.totalPnl")).toBeInTheDocument();
    expect(screen.getByText("profile.overview.cards.winRate")).toBeInTheDocument();
    expect(screen.getByText("profile.overview.cards.eventsCount")).toBeInTheDocument();

    expect(screen.getByText("profile.predictions.header")).toBeInTheDocument();
  });
});
