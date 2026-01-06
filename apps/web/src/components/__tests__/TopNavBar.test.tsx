/**
 * TopNavBar 组件单元测试
 */

import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TopNavBar from "../TopNavBar";

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

let mockNav: MockNav;

vi.mock("../topNavBar/useTopNavBarLogic", () => ({
  useTopNavBarLogic: () => mockNav,
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
        <button type="button" aria-label="openUserMenu" onClick={() => setMenuOpen((v) => !v)}>
          openUserMenu
        </button>
        {menuOpen && (
          <div role="menu" aria-expanded="true">
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
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="wallet-modal">WalletModal</div> : null,
}));

vi.mock("../LanguageSwitcher", () => ({
  default: () => <div data-testid="language-switcher">LanguageSwitcher</div>,
}));

vi.mock("../MobileMenu", () => ({
  default: () => <div data-testid="mobile-menu">MobileMenu</div>,
}));

describe("TopNavBar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    window.open = vi.fn();

    mockNav = {
      mounted: true,
      modal: null,
      walletModalOpen: false,
      setWalletModalOpen: (next) => {
        mockNav.walletModalOpen = next;
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
        mockNav.notificationsOpen = next;
      },
    };
  });

  it("应该显示语言切换器", () => {
    render(<TopNavBar />);
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("点击登录按钮应该打开 WalletModal", async () => {
    render(<TopNavBar />);
    fireEvent.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("wallet-modal")).toBeInTheDocument();
    });
  });

  it("点击头像应该打开钱包菜单", async () => {
    mockNav.account = "0x1234567890123456789012345678901234567890";
    render(<TopNavBar />);

    fireEvent.click(screen.getByLabelText("openUserMenu"));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    expect(screen.getByText("copyAddress")).toBeInTheDocument();
    expect(screen.getByText("viewOnExplorer")).toBeInTheDocument();
    expect(screen.getByText("disconnectWallet")).toBeInTheDocument();
  });

  it("应该能够复制钱包地址", async () => {
    mockNav.account = "0x1234567890123456789012345678901234567890";
    mockNav.copyAddress = vi.fn(async () => {
      await navigator.clipboard.writeText(mockNav.account!);
    });

    render(<TopNavBar />);
    fireEvent.click(screen.getByLabelText("openUserMenu"));
    await waitFor(() => expect(screen.getByText("copyAddress")).toBeInTheDocument());

    fireEvent.click(screen.getByText("copyAddress"));

    await waitFor(() => {
      expect(mockNav.copyAddress).toHaveBeenCalled();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "0x1234567890123456789012345678901234567890"
      );
      expect(screen.getByText("addressCopied")).toBeInTheDocument();
    });
  });

  it("点击浏览器链接应该打开新窗口", async () => {
    mockNav.account = "0x1234567890123456789012345678901234567890";
    mockNav.openOnExplorer = vi.fn(() => {
      window.open(
        "https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890",
        "_blank"
      );
    });

    render(<TopNavBar />);
    fireEvent.click(screen.getByLabelText("openUserMenu"));
    await waitFor(() => expect(screen.getByText("viewOnExplorer")).toBeInTheDocument());

    fireEvent.click(screen.getByText("viewOnExplorer"));

    await waitFor(() => {
      expect(mockNav.openOnExplorer).toHaveBeenCalled();
      expect(window.open).toHaveBeenCalledWith(
        "https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890",
        "_blank"
      );
    });
  });

  it("错误网络时应该显示切网按钮", async () => {
    mockNav.account = "0x1234567890123456789012345678901234567890";
    mockNav.isSepolia = false;
    mockNav.switchToSepolia = vi.fn(async () => {});

    render(<TopNavBar />);
    fireEvent.click(screen.getByLabelText("openUserMenu"));

    await waitFor(() => {
      expect(screen.getByText("switchNetwork - Sepolia")).toBeInTheDocument();
    });
  });

  it("should render portal modal when provided", () => {
    mockNav.modal = <div data-testid="nav-modal">Modal</div>;
    render(<TopNavBar />);
    expect(screen.getByTestId("nav-modal")).toBeInTheDocument();
  });

  it("在移动端应该有合适的样式", () => {
    render(<TopNavBar />);
    const navBar = screen.getByRole("banner");
    expect(navBar).toHaveClass("fixed", "top-0", "w-full");
  });
});
