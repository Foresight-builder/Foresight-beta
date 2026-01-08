import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type React from "react";
import { FollowersTab } from "../FollowersTab";

const useFollowersUsersMock = vi.fn();

vi.mock("@/lib/i18n", () => ({
  useTranslations: vi.fn((namespace?: string) => {
    return (key: string) => (namespace ? `${namespace}.${key}` : key);
  }),
}));

vi.mock("lucide-react", () => ({
  Users: () => <svg data-testid="users-icon" />,
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

vi.mock("@/components/ui/UserHoverCard", () => ({
  UserHoverCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useQueries", () => ({
  useFollowersUsers: (...args: unknown[]) => useFollowersUsersMock(...args),
}));

vi.mock("@/lib/cn", () => ({
  formatAddress: (addr: string) => addr,
}));

describe("FollowersTab 组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useFollowersUsersMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    });
  });

  it("加载中时应显示加载指示器", () => {
    useFollowersUsersMock.mockReturnValue({
      isLoading: true,
      isError: false,
      data: [],
      refetch: vi.fn(),
    });

    const { container } = render(<FollowersTab address="0x123" />);

    expect(container.textContent || "").not.toContain("profile.followers.empty.title");
    expect(container.textContent || "").not.toContain("profile.sidebar.stats.followers");
  });

  it("请求失败时应显示错误提示并支持重试", () => {
    const refetch = vi.fn();

    useFollowersUsersMock.mockReturnValue({
      isLoading: false,
      isError: true,
      data: [],
      refetch,
    });

    render(<FollowersTab address="0x123" />);

    expect(screen.getByText("common.loadFailed")).toBeInTheDocument();
    expect(screen.getByText("common.retry")).toBeInTheDocument();

    fireEvent.click(screen.getByText("common.retry"));
    expect(refetch).toHaveBeenCalled();
  });

  it("没有用户时应显示空状态", () => {
    useFollowersUsersMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    });

    render(<FollowersTab address="0x123" />);

    expect(screen.getByText("profile.followers.empty.title")).toBeInTheDocument();
    expect(screen.getByText("profile.followers.empty.description")).toBeInTheDocument();
  });

  it("有用户时应显示用户列表和标题", () => {
    const users = [
      {
        wallet_address: "0xabc",
        username: "user-1",
        avatar: "/avatar.png",
      },
    ];

    useFollowersUsersMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: users,
      refetch: vi.fn(),
    });

    render(<FollowersTab address="0x123" />);

    expect(screen.getByText("profile.sidebar.stats.followers")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("0xabc")).toBeInTheDocument();
  });
});
