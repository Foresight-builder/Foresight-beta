"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfileOptional } from "@/contexts/UserProfileContext";
import { useTranslations } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export function useTopNavBarLogic() {
  const {
    account,
    isConnecting,
    connectError,
    hasProvider,
    chainId,
    balanceEth,
    balanceLoading,
    refreshBalance,
    connectWallet,
    disconnectWallet,
    formatAddress,
    availableWallets,
    currentWalletType,
    switchNetwork,
  } = useWallet();
  const { user, loading: authLoading, signOut } = useAuth();
  const userProfile = useUserProfileOptional();
  const tWallet = useTranslations("wallet");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tNotifications = useTranslations("notifications");

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const walletSelectorRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<HTMLImageElement | null>(null);
  const menuContentRef = useRef<HTMLDivElement | null>(null);
  const walletButtonRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [walletSelectorPos, setWalletSelectorPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [inviteUnreadCount, setInviteUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      created_at: string;
      url?: string;
      unread?: boolean;
    }>
  >([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsIdSetRef = useRef<Set<string>>(new Set());
  const seenDiscussionIdsRef = useRef<Set<string>>(new Set());
  const pollingInFlightRef = useRef(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    notificationsIdSetRef.current = new Set(notifications.map((n) => n.id));
  }, [notifications]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const update = () => {
      setPageVisible(!document.hidden);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    if (connectError) body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [connectError, mounted]);

  const viewerId = useMemo(() => String(account || "").toLowerCase(), [account]);
  const notificationsSeenStorageKey = useMemo(() => {
    if (!viewerId) return "";
    return `foresight:notifications:seen:${viewerId}`;
  }, [viewerId]);

  const safeUrl = useCallback((candidate: unknown) => {
    if (typeof candidate !== "string") return "/flags";
    const trimmed = candidate.trim();
    if (!trimmed.startsWith("/")) return "/flags";
    return trimmed;
  }, []);

  const persistSeenDiscussionIds = useCallback(() => {
    if (!notificationsSeenStorageKey) return;
    try {
      const ids = Array.from(seenDiscussionIdsRef.current).slice(-500);
      localStorage.setItem(notificationsSeenStorageKey, JSON.stringify(ids));
    } catch {}
  }, [notificationsSeenStorageKey]);

  const markDiscussionIdsSeen = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      let changed = false;
      const set = seenDiscussionIdsRef.current;
      for (const id of ids) {
        if (!set.has(id)) {
          set.add(id);
          changed = true;
        }
      }
      if (changed) persistSeenDiscussionIds();
    },
    [persistSeenDiscussionIds]
  );

  useEffect(() => {
    if (!viewerId) {
      seenDiscussionIdsRef.current = new Set();
      setInviteUnreadCount(0);
      setPendingReviewCount(0);
      return;
    }
    try {
      const raw = localStorage.getItem(notificationsSeenStorageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      const ids = Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
      seenDiscussionIdsRef.current = new Set(ids);
    } catch {
      seenDiscussionIdsRef.current = new Set();
    }
  }, [viewerId, notificationsSeenStorageKey]);

  const notificationsCount = useMemo(
    () => pendingReviewCount + inviteUnreadCount,
    [pendingReviewCount, inviteUnreadCount]
  );

  useEffect(() => {
    if (!pageVisible) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delayMs: number) => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void tick();
      }, delayMs);
    };

    const load = async () => {
      if (!viewerId) {
        if (!cancelled) {
          setNotifications([]);
          setPendingReviewCount(0);
          setInviteUnreadCount(0);
        }
        return;
      }
      try {
        let pendingCount = 0;
        try {
          const res = await fetch(`/api/flags?viewer_id=${encodeURIComponent(viewerId)}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}) as any);
            const list = Array.isArray(data?.flags) ? data.flags : [];
            pendingCount = list.filter(
              (f: any) =>
                String(f.status || "") === "pending_review" &&
                String(f.verification_type || "") === "witness" &&
                String(f.witness_id || "").toLowerCase() === viewerId
            ).length;
          }
        } catch {}
        let inviteCount = 0;
        let notificationItems: Array<{
          id: string;
          type: string;
          title: string;
          message: string;
          created_at: string;
          url?: string;
          unread?: boolean;
        }> | null = null;
        if (supabase) {
          try {
            const res = await supabase
              .from("discussions")
              .select("id, content, created_at")
              .eq("user_id", viewerId)
              .order("created_at", { ascending: false })
              .limit(20);
            const rows = Array.isArray(res.data) ? res.data : [];
            const seen = seenDiscussionIdsRef.current;
            notificationItems = rows.map((row: any) => {
              let raw = row.content as any;
              let parsed: any = {};
              if (typeof raw === "string") {
                try {
                  parsed = JSON.parse(raw);
                } catch {
                  parsed = {};
                }
              } else if (raw && typeof raw === "object") {
                parsed = raw;
              }
              const type = typeof parsed.type === "string" ? parsed.type : "";
              const titleFallback =
                type === "witness_invite"
                  ? tNotifications("fallbackWitnessInviteTitle")
                  : type === "checkin_review"
                    ? tNotifications("fallbackCheckinReviewTitle")
                    : tNotifications("fallbackGenericTitle");
              const title =
                typeof parsed.title === "string" && parsed.title.trim()
                  ? parsed.title
                  : titleFallback;
              const message = typeof parsed.message === "string" ? parsed.message : "";
              const url = safeUrl(parsed.url);
              const id = String(row.id);
              return {
                id,
                type,
                title,
                message,
                created_at: String(row.created_at),
                url,
                unread: !seen.has(id),
              };
            });
            inviteCount = notificationItems.length;
          } catch {}
        }
        if (!cancelled) {
          setPendingReviewCount(pendingCount);

          const pendingItems =
            pendingCount > 0
              ? [
                  {
                    id: `pending_review:${viewerId}`,
                    type: "pending_review",
                    title: tNotifications("pendingReviewTitle"),
                    message: tNotifications("pendingReviewMessage").replace(
                      "{count}",
                      String(pendingCount)
                    ),
                    created_at: new Date().toISOString(),
                    url: "/flags",
                    unread: true,
                  },
                ]
              : [];

          const list = notificationItems ?? [];
          if (notificationsOpen && list.length) {
            markDiscussionIdsSeen(list.map((x) => x.id));
            for (const item of list) item.unread = false;
          }
          const combined = [...pendingItems, ...list];
          setNotifications(combined);
          const unreadInvites = notificationsOpen
            ? 0
            : (notificationItems ?? []).reduce((acc, x) => acc + (x.unread ? 1 : 0), 0);
          setInviteUnreadCount(unreadInvites);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setPendingReviewCount(0);
          setInviteUnreadCount(0);
        }
      }
    };

    const tick = async () => {
      if (cancelled) return;
      if (!pageVisible) return;
      if (!viewerId) {
        await load();
        return;
      }
      if (pollingInFlightRef.current) {
        schedule(2500);
        return;
      }
      pollingInFlightRef.current = true;
      try {
        await load();
      } finally {
        pollingInFlightRef.current = false;
        schedule(60000);
      }
    };

    schedule(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [viewerId, tNotifications, safeUrl, notificationsOpen, markDiscussionIdsSeen, pageVisible]);

  useEffect(() => {
    if (!viewerId || !supabase) return;
    const client = supabase;
    const channel = client
      .channel(`discussions:nav:${viewerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discussions",
          filter: `user_id=eq.${viewerId}`,
        },
        (payload) => {
          const row: any = payload.new;
          if (!row) return;
          let raw = row.content as any;
          let parsed: any = {};
          if (typeof raw === "string") {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = {};
            }
          } else if (raw && typeof raw === "object") {
            parsed = raw;
          }
          const type = typeof parsed.type === "string" ? parsed.type : "";
          const titleFallback =
            type === "witness_invite"
              ? tNotifications("fallbackWitnessInviteTitle")
              : type === "checkin_review"
                ? tNotifications("fallbackCheckinReviewTitle")
                : tNotifications("fallbackGenericTitle");
          const title =
            typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : titleFallback;
          const message = typeof parsed.message === "string" ? parsed.message : "";
          const url = safeUrl(parsed.url);
          const id = String(row.id);
          const unread = !notificationsOpen && !seenDiscussionIdsRef.current.has(id);
          const item = {
            id,
            type,
            title,
            message,
            created_at: String(row.created_at),
            url,
            unread,
          };
          if (notificationsIdSetRef.current.has(item.id)) return;
          notificationsIdSetRef.current.add(item.id);
          if (notificationsOpen) {
            markDiscussionIdsSeen([item.id]);
          } else if (unread) {
            setInviteUnreadCount((prev) => prev + 1);
          }
          setNotifications((prev) => {
            const exists = prev.some((x) => x.id === item.id);
            if (exists) return prev;
            return [item, ...prev].slice(0, 50);
          });
        }
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [viewerId, tNotifications, safeUrl, notificationsOpen, markDiscussionIdsSeen]);

  const handleNotificationsToggle = useCallback(() => {
    if (!viewerId) return;
    if (notificationsOpen) {
      setNotificationsOpen(false);
      return;
    }
    const ids = notifications.filter((n) => n.type !== "pending_review").map((n) => n.id);
    markDiscussionIdsSeen(ids);
    setInviteUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => (n.type === "pending_review" ? n : { ...n, unread: false }))
    );
    setNotificationsOpen(true);
  }, [viewerId, notificationsOpen, notifications, markDiscussionIdsSeen]);

  const handleConnectWallet = useCallback(
    async (walletType?: "metamask" | "coinbase" | "binance") => {
      await connectWallet(walletType);
      setWalletSelectorOpen(false);
    },
    [connectWallet]
  );

  const handleWalletSelectorToggle = useCallback(() => {
    setWalletSelectorOpen(!walletSelectorOpen);
  }, [walletSelectorOpen]);

  const handleDisconnectWallet = useCallback(async () => {
    await disconnectWallet();
    try {
      await fetch("/api/siwe/logout", { method: "GET" });
    } catch {}
    setMenuOpen(false);
  }, [disconnectWallet]);

  const copyAddress = useCallback(async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [account]);

  const networkName = (id: string | null) => {
    if (!id) return tWallet("unknownNetwork");
    switch (id.toLowerCase()) {
      case "0x1":
        return "Ethereum";
      case "0xaa36a7":
        return "Sepolia";
      case "0x5":
        return "Goerli";
      case "0x89":
        return "Polygon";
      case "0x38":
        return "BSC";
      default:
        return id;
    }
  };

  const walletTypeLabel = useMemo(() => {
    if (currentWalletType === "metamask") return "MetaMask";
    if (currentWalletType === "coinbase") return "Coinbase";
    if (currentWalletType === "okx") return "OKX";
    if (currentWalletType === "binance") return "Binance";
    return "";
  }, [currentWalletType]);

  const isSepolia = useMemo(() => {
    if (!chainId) return false;
    return chainId.toLowerCase() === "0xaa36a7";
  }, [chainId]);

  const explorerBase = (id: string | null) => {
    const low = id?.toLowerCase();
    switch (low) {
      case "0x1":
        return "https://etherscan.io";
      case "0xaa36a7":
        return "https://sepolia.etherscan.io";
      case "0x5":
        return "https://goerli.etherscan.io";
      case "0x89":
        return "https://polygonscan.com";
      case "0x38":
        return "https://bscscan.com";
      default:
        return "https://etherscan.io";
    }
  };

  const updateNetworkInfo = useCallback(async () => {
    await refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    updateNetworkInfo();
  }, [account, updateNetworkInfo]);

  const openOnExplorer = () => {
    if (!account) return;
    const url = `${explorerBase(chainId)}/address/${account}`;
    window.open(url, "_blank");
    setMenuOpen(false);
  };

  const switchToSepolia = async () => {
    try {
      await switchNetwork(11155111);
      updateNetworkInfo();
    } catch (e) {
      console.error("Switch chain failed:", e);
    } finally {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (avatarRef.current && avatarRef.current.contains(target)) return;
      if (menuContentRef.current && menuContentRef.current.contains(target)) return;
      if (walletButtonRef.current && walletButtonRef.current.contains(target)) return;
      if (walletSelectorRef.current && walletSelectorRef.current.contains(target)) return;
      setMenuOpen(false);
      setWalletSelectorOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setWalletSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const updateMenuPosition = () => {
      if (!avatarRef.current) return;
      const rect = avatarRef.current.getBoundingClientRect();
      const menuWidth = 256;
      const gap = 8;
      let left = rect.right - menuWidth;
      let top = rect.bottom + gap;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      left = Math.max(8, Math.min(left, vw - menuWidth - 8));
      top = Math.max(8, Math.min(top, vh - 8));
      setMenuPos({ top, left });
    };

    if (menuOpen) {
      updateMenuPosition();
      const handler = () => updateMenuPosition();
      window.addEventListener("resize", handler);
      window.addEventListener("scroll", handler, true);
      return () => {
        window.removeEventListener("resize", handler);
        window.removeEventListener("scroll", handler, true);
      };
    }
  }, [menuOpen]);

  useEffect(() => {
    const updateWalletSelectorPosition = () => {
      if (!walletButtonRef.current) return;
      const rect = walletButtonRef.current.getBoundingClientRect();
      const selectorWidth = 200;
      const gap = 8;
      let left = rect.left;
      let top = rect.bottom + gap;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      left = Math.max(8, Math.min(left, vw - selectorWidth - 8));
      top = Math.max(8, Math.min(top, vh - 8));
      setWalletSelectorPos({ top, left });
    };

    if (walletSelectorOpen) {
      updateWalletSelectorPosition();
      const handler = () => updateWalletSelectorPosition();
      window.addEventListener("resize", handler);
      window.addEventListener("scroll", handler, true);
      return () => {
        window.removeEventListener("resize", handler);
        window.removeEventListener("scroll", handler, true);
      };
    }
  }, [walletSelectorOpen]);

  const modal = connectError ? (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center"
      onClick={() => {}}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-[90%]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-black mb-2">{tWallet("connectFailedTitle")}</h3>
        <p className="text-sm text-black mb-4">{connectError}</p>
        {!hasProvider && (
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-black underline"
          >
            {tWallet("installMetaMaskExtension")}
          </a>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="px-3 py-2 rounded-md border border-gray-300 text-black"
            onClick={() => {
              location.reload();
            }}
          >
            {tCommon("close")}
          </button>
          <button
            className="px-3 py-2 rounded-md bg-blue-500 text-black"
            onClick={() => connectWallet()}
          >
            {tCommon("retry")}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return {
    account,
    isConnecting,
    connectError,
    hasProvider,
    chainId,
    balanceEth,
    balanceLoading,
    refreshBalance,
    connectWallet,
    disconnectWallet,
    formatAddress,
    availableWallets,
    currentWalletType,
    switchNetwork,
    user,
    authLoading,
    signOut,
    userProfile,
    tWallet,
    tAuth,
    tCommon,
    mounted,
    menuOpen,
    setMenuOpen,
    copied,
    showBalance,
    setShowBalance,
    walletSelectorOpen,
    setWalletSelectorOpen,
    walletModalOpen,
    setWalletModalOpen,
    menuRef,
    walletSelectorRef,
    avatarRef,
    menuContentRef,
    walletButtonRef,
    menuPos,
    walletSelectorPos,
    handleConnectWallet,
    handleWalletSelectorToggle,
    handleDisconnectWallet,
    copyAddress,
    networkName,
    walletTypeLabel,
    isSepolia,
    explorerBase,
    updateNetworkInfo,
    openOnExplorer,
    switchToSepolia,
    modal,
    notifications,
    notificationsCount,
    notificationsOpen,
    setNotificationsOpen,
    handleNotificationsToggle,
  };
}

export type TopNavBarState = ReturnType<typeof useTopNavBarLogic>;
