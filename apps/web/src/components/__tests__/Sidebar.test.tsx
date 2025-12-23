/**
 * Sidebar 组件单元测试
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "../Sidebar";

// Router mocks（使用 vi.hoisted 保证可在工厂外复用）
const routerPushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/trending",
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

// Mock 上下文（同样使用 hoisted）
const useWalletMock = vi.hoisted(() =>
  vi.fn(() => ({
    account: null,
  }))
);

const useAuthMock = vi.hoisted(() =>
  vi.fn(() => ({
    user: null,
  }))
);

const useUserProfileOptionalMock = vi.hoisted(() =>
  vi.fn(() => ({
    isAdmin: false,
    profile: null,
  }))
);

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: useWalletMock,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: useAuthMock,
  useAuthOptional: () => null,
}));

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfileOptional: useUserProfileOptionalMock,
}));

describe("Sidebar Component", () => {
  describe("导航菜单渲染", () => {
    it("应该渲染所有导航项", () => {
      render(<Sidebar />);

      // 检查主要导航项
      expect(screen.getByText("trending")).toBeInTheDocument();
      expect(screen.getByText("leaderboard")).toBeInTheDocument();
      expect(screen.getByText("forum")).toBeInTheDocument();
      expect(screen.getByText("flags")).toBeInTheDocument();
    });

    it("应该显示导航图标", () => {
      render(<Sidebar />);

      expect(screen.getByTestId("trending-icon")).toBeInTheDocument();
      expect(screen.getByTestId("trophy-icon")).toBeInTheDocument();
      expect(screen.getByTestId("message-icon")).toBeInTheDocument();
      expect(screen.getByTestId("flag-icon")).toBeInTheDocument();
    });
  });

  describe("响应式行为", () => {
    it("应该在移动端显示菜单按钮", () => {
      render(<Sidebar />);

      const menuButton = screen.getByRole("button", { name: "menu" });
      expect(menuButton).toBeInTheDocument();
    });
  });

  describe("可访问性", () => {
    it("侧边栏应该有正确的 role 属性", () => {
      render(<Sidebar />);

      const nav = screen.getByRole("navigation", { name: /mainNav/i });
      expect(nav).toBeInTheDocument();
    });

    it("导航按钮应该可以键盘访问", () => {
      render(<Sidebar />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("活动状态与交互", () => {
    it("当前页面的导航项应该高亮", () => {
      render(<Sidebar />);

      const trendingButton = screen.getByRole("button", { name: "trending" });
      expect(trendingButton).toHaveAttribute("aria-current", "page");
    });

    it("点击导航项应该触发路由跳转", () => {
      routerPushMock.mockClear();

      render(<Sidebar />);

      const leaderboardButton = screen.getByRole("button", { name: "leaderboard" });
      fireEvent.click(leaderboardButton);

      expect(routerPushMock).toHaveBeenCalledWith("/leaderboard");
    });
  });
});
