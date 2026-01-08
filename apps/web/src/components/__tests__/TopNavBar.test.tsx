/**
 * TopNavBar 组件单元测试
 */

import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

type MockNav = {
  mounted: boolean;
  modal: React.ReactNode | null;
  walletModalOpen: boolean;
  setWalletModalOpen: (next: boolean) => void;
  account: string | null;
  isSepolia: boolean;
  copyAddress: () => Promise<void> | void;
  updateNetworkInfo: () => Promise<void> | void;
  openOnExplorer: () => void;
  switchToSepolia: () => Promise<void> | void;
  handleNotificationsToggle: () => void;
  notificationsOpen: boolean;
  notifications: Array<{ id: string }>;
  notificationsCount: number;
  setNotificationsOpen: (next: boolean) => void;
};

const mockNavRef = vi.hoisted(() => ({ current: null as MockNav | null }));
let TopNavBar: React.ComponentType;

vi.mock("../topNavBar/useTopNavBarLogic", () => ({
  useTopNavBarLogic: () => {
    const [walletModalOpen, setWalletModalOpen] = React.useState<boolean>(
      Boolean(mockNavRef.current?.walletModalOpen)
    );
    const [notificationsOpen, setNotificationsOpen] = React.useState<boolean>(
      Boolean(mockNavRef.current?.notificationsOpen)
    );
    const base = (mockNavRef.current ?? {}) as any;

    return {
      ...base,
      walletModalOpen,
      setWalletModalOpen: (next: boolean) => {
        setWalletModalOpen(next);
        if (mockNavRef.current) mockNavRef.current.walletModalOpen = next;
      },
      notificationsOpen,
      setNotificationsOpen: (next: boolean) => {
        setNotificationsOpen(next);
        if (mockNavRef.current) mockNavRef.current.notificationsOpen = next;
      },
    } as MockNav;
  },
}));

vi.mock("../topNavBar/WalletSection", () => ({
  WalletSection: ({ nav }: { nav: MockNav }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!nav.account) {
      return (
        <button type="button" onClick={() => nav.setWalletModalOpen(true)}>
          login
        </button>
      );
    }

    return (
      <div>
        <button
          type="button"
          aria-label="openUserMenu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          openUserMenu
        </button>
        {menuOpen && (
          <div role="menu">
            <button
              type="button"
              onClick={async () => {
                await nav.updateNetworkInfo();
              }}
            >
              refreshBalance
            </button>
            <button
              type="button"
              onClick={async () => {
                await nav.copyAddress();
                setCopied(true);
              }}
            >
              {copied ? "addressCopied" : "copyAddress"}
            </button>
            <button type="button" onClick={() => nav.openOnExplorer()}>
              viewOnExplorer
            </button>
            {!nav.isSepolia && (
              <button type="button" onClick={() => nav.switchToSepolia()}>
                switchNetwork - Sepolia
              </button>
            )}
            <button type="button">disconnectWallet</button>
          </div>
        )}
      </div>
    );
  },
}));

vi.mock("../WalletModal", () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="wallet-modal">WalletModal</div> : null,
}));

vi.mock("../LanguageSwitcher", () => ({
  __esModule: true,
  default: () => <div data-testid="language-switcher">LanguageSwitcher</div>,
}));

vi.mock("../MobileMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-menu">MobileMenu</div>,
}));

vi.mock("lucide-react", () => ({
  Bell: (props: any) => <svg data-testid="bell-icon" {...props} />,
}));

describe("TopNavBar Component", () => {
  beforeAll(async () => {
    TopNavBar = (await import("../TopNavBar")).default;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    window.open = vi.fn();

    mockNavRef.current = {
      mounted: true,
      modal: null,
      walletModalOpen: false,
      setWalletModalOpen: (next) => {
        if (mockNavRef.current) mockNavRef.current.walletModalOpen = next;
      },
      account: null,
      isSepolia: true,
      copyAddress: async () => {},
      updateNetworkInfo: async () => {},
      openOnExplorer: () => {},
      switchToSepolia: async () => {},
      handleNotificationsToggle: () => {},
      notificationsOpen: false,
      notifications: [],
      notificationsCount: 0,
      setNotificationsOpen: (next) => {
        if (mockNavRef.current) mockNavRef.current.notificationsOpen = next;
      },
    };
  });

  it("应该显示语言切换器", () => {
    render(<TopNavBar />);
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("点击登录按钮应该打开 WalletModal", async () => {
    render(<TopNavBar />);
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByTestId("wallet-modal")).toBeInTheDocument();
  });

  it("点击头像应该打开钱包菜单", async () => {
    if (mockNavRef.current) {
      mockNavRef.current.account = "0x1234567890123456789012345678901234567890";
    }
    render(<TopNavBar />);

    fireEvent.click(screen.getByLabelText("openUserMenu"));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "copyAddress" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "viewOnExplorer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "disconnectWallet" })).toBeInTheDocument();
  });

  it("应该能够复制钱包地址", async () => {
    if (mockNavRef.current) {
      mockNavRef.current.account = "0x1234567890123456789012345678901234567890";
      mockNavRef.current.copyAddress = vi.fn(async () => {
        await navigator.clipboard.writeText(mockNavRef.current?.account!);
      });
    }

    render(<TopNavBar />);
    fireEvent.click(screen.getByLabelText("openUserMenu"));
    expect(await screen.findByRole("button", { name: "copyAddress" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "copyAddress" }));

    expect(mockNavRef.current?.copyAddress).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "0x1234567890123456789012345678901234567890"
    );
    expect(await screen.findByText("addressCopied")).toBeInTheDocument();
  });

  it("点击浏览器链接应该打开新窗口", async () => {
    if (mockNavRef.current) {
      mockNavRef.current.account = "0x1234567890123456789012345678901234567890";
      mockNavRef.current.openOnExplorer = vi.fn(() => {
        window.open(
          "https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890",
          "_blank"
        );
      });
    }

    render(<TopNavBar />);
    fireEvent.click(screen.getByLabelText("openUserMenu"));
    expect(await screen.findByRole("button", { name: "viewOnExplorer" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "viewOnExplorer" }));

    expect(mockNavRef.current?.openOnExplorer).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith(
      "https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890",
      "_blank"
    );
  });

  it("错误网络时应该显示切网按钮", async () => {
    if (mockNavRef.current) {
      mockNavRef.current.account = "0x1234567890123456789012345678901234567890";
      mockNavRef.current.isSepolia = false;
      mockNavRef.current.switchToSepolia = vi.fn(async () => {});
    }

    render(<TopNavBar />);
    fireEvent.click(screen.getByLabelText("openUserMenu"));

    expect(
      await screen.findByRole("button", { name: "switchNetwork - Sepolia" })
    ).toBeInTheDocument();
  });

  it("should render portal modal when provided", () => {
    if (mockNavRef.current) {
      mockNavRef.current.modal = <div data-testid="nav-modal">Modal</div>;
    }
    render(<TopNavBar />);
    expect(screen.getByTestId("nav-modal")).toBeInTheDocument();
  });

  it("顶部导航栏应该固定在页面顶部", () => {
    render(<TopNavBar />);
    const navBar = screen.getByRole("banner");
    expect(navBar).toHaveClass("fixed", "top-0");
  });
});
