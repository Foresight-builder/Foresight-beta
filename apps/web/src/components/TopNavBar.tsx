"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import Link from "next/link";
import WalletModal from "./WalletModal";
import LanguageSwitcher from "./LanguageSwitcher";
import MobileMenu from "./MobileMenu";
import { useTopNavBarLogic } from "./topNavBar/useTopNavBarLogic";
import { WalletSection } from "./topNavBar/WalletSection";
import { useTranslations, useLocale } from "@/lib/i18n";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";

export default function TopNavBar() {
  const nav = useTopNavBarLogic();
  const { mounted, modal, walletModalOpen, setWalletModalOpen } = nav;
  const tNotifications = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const { locale } = useLocale();
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const [confirmState, setConfirmState] = useState<null | {
    message: string;
    onConfirm: () => void;
  }>(null);

  const closeConfirm = useCallback(() => setConfirmState(null), []);

  const confirmBusy =
    nav.archiveAllNotificationsLoading || nav.archiveNotificationIdLoading !== null;
  const runConfirm = useCallback(() => {
    if (!confirmState || confirmBusy) return;
    const action = confirmState.onConfirm;
    closeConfirm();
    action();
  }, [closeConfirm, confirmBusy, confirmState]);

  const badgeText = useMemo(() => {
    if (!nav.notificationsCount) return "";
    if (nav.notificationsCount > 99) return "99+";
    return String(nav.notificationsCount);
  }, [nav.notificationsCount]);

  const headerSummaryText = useMemo(() => {
    if (!nav.notificationsCount) return "";
    return tNotifications("summary").replace("{count}", String(nav.notificationsCount));
  }, [nav.notificationsCount, tNotifications]);

  const filteredNotifications = useMemo(
    () =>
      nav.notifications.filter((item) => {
        if (nav.notificationsFilter === "all") return true;
        if (nav.notificationsFilter === "review") {
          return item.type === "pending_review" || item.type === "checkin_review";
        }
        if (nav.notificationsFilter === "challenge") {
          return item.type === "witness_invite";
        }
        return (
          item.type !== "pending_review" &&
          item.type !== "checkin_review" &&
          item.type !== "witness_invite"
        );
      }),
    [nav.notifications, nav.notificationsFilter]
  );

  useEffect(() => {
    if (!nav.notificationsOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (notificationsButtonRef.current?.contains(target)) return;
      if (notificationsPanelRef.current?.contains(target)) return;
      nav.setNotificationsOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      nav.setNotificationsOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [nav.notificationsOpen, nav.setNotificationsOpen]);

  return (
    <header role="banner" className="fixed top-0 left-0 right-0 w-full z-50 pointer-events-none">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="lg:hidden pointer-events-auto">
          <MobileMenu />
        </div>

        <div className="ml-auto flex items-center space-x-3 pointer-events-auto">
          <LanguageSwitcher />
          <div className="relative">
            <button
              type="button"
              ref={notificationsButtonRef}
              aria-label={tNotifications("ariaLabel")}
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/80 border border-gray-200 shadow-sm hover:bg-gray-50"
              onClick={nav.handleNotificationsToggle}
            >
              <Bell className="w-4 h-4 text-gray-700" />
              {nav.notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-center text-white">
                  {badgeText}
                </span>
              )}
            </button>
            {nav.notificationsOpen && (
              <div
                ref={notificationsPanelRef}
                className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
              >
                <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span>{tNotifications("centerTitle")}</span>
                    {headerSummaryText && (
                      <span className="text-[11px] font-normal text-gray-400">
                        {headerSummaryText}
                      </span>
                    )}
                    <div className="ml-2 flex items-center gap-1">
                      <button
                        type="button"
                        className={`px-1.5 py-0.5 rounded-full border text-[11px] ${
                          nav.notificationsFilter === "all"
                            ? "border-blue-500 text-blue-600 bg-blue-50"
                            : "border-transparent text-gray-500 hover:bg-gray-100"
                        }`}
                        onClick={() => nav.setNotificationsFilter("all")}
                      >
                        {tNotifications("filterAll")}
                      </button>
                      <button
                        type="button"
                        className={`px-1.5 py-0.5 rounded-full border text-[11px] ${
                          nav.notificationsFilter === "system"
                            ? "border-blue-500 text-blue-600 bg-blue-50"
                            : "border-transparent text-gray-500 hover:bg-gray-100"
                        }`}
                        onClick={() => nav.setNotificationsFilter("system")}
                      >
                        {tNotifications("filterSystem")}
                      </button>
                      <button
                        type="button"
                        className={`px-1.5 py-0.5 rounded-full border text-[11px] ${
                          nav.notificationsFilter === "review"
                            ? "border-blue-500 text-blue-600 bg-blue-50"
                            : "border-transparent text-gray-500 hover:bg-gray-100"
                        }`}
                        onClick={() => nav.setNotificationsFilter("review")}
                      >
                        {tNotifications("filterReview")}
                      </button>
                      <button
                        type="button"
                        className={`px-1.5 py-0.5 rounded-full border text-[11px] ${
                          nav.notificationsFilter === "challenge"
                            ? "border-blue-500 text-blue-600 bg-blue-50"
                            : "border-transparent text-gray-500 hover:bg-gray-100"
                        }`}
                        onClick={() => nav.setNotificationsFilter("challenge")}
                      >
                        {tNotifications("filterChallenge")}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {nav.notificationsCount > 0 && (
                      <button
                        type="button"
                        onClick={nav.handleMarkAllNotificationsRead}
                        disabled={nav.markAllNotificationsLoading}
                        className="text-[11px] font-normal text-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {nav.markAllNotificationsLoading
                          ? tNotifications("markAllReadLoading")
                          : tNotifications("markAllRead")}
                      </button>
                    )}
                    {nav.notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmState({
                            message: tNotifications("confirmArchiveAll"),
                            onConfirm: () => nav.handleArchiveAllNotifications(),
                          });
                        }}
                        disabled={nav.archiveAllNotificationsLoading}
                        className="text-[11px] font-normal text-gray-500 hover:text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {nav.archiveAllNotificationsLoading
                          ? tNotifications("archiveAllLoading")
                          : tNotifications("archiveAll")}
                      </button>
                    )}
                  </div>
                </div>
                {nav.notificationsLoading && nav.notifications.length === 0 && (
                  <div className="px-3 py-4 text-xs text-gray-500">{tNotifications("loading")}</div>
                )}
                {!nav.notificationsLoading &&
                  nav.notificationsError &&
                  nav.notifications.length === 0 && (
                    <div className="px-3 py-4 text-xs text-gray-500 flex items-center justify-between gap-2">
                      <span>{tNotifications("loadFailed")}</span>
                      <button
                        type="button"
                        className="text-[11px] text-blue-600 hover:text-blue-700"
                        onClick={nav.handleReloadNotifications}
                      >
                        {tNotifications("retry")}
                      </button>
                    </div>
                  )}
                {!nav.notificationsLoading &&
                  !nav.notificationsError &&
                  nav.notifications.length === 0 &&
                  nav.notificationsCount === 0 && (
                    <div className="px-3 py-4 text-xs text-gray-500">{tNotifications("empty")}</div>
                  )}
                {!nav.notificationsLoading &&
                  !nav.notificationsError &&
                  nav.notifications.length > 0 &&
                  filteredNotifications.length === 0 && (
                    <div className="px-3 py-4 text-xs text-gray-500">
                      {tNotifications("emptyFiltered")}
                    </div>
                  )}
                {filteredNotifications.length > 0 && (
                  <div className="max-h-72 overflow-y-auto">
                    {filteredNotifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.url || "/flags"}
                        className="block px-3 py-2 hover:bg-gray-50"
                        onClick={() => nav.setNotificationsOpen(false)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`text-xs truncate ${
                                  item.unread
                                    ? "font-bold text-gray-900"
                                    : "font-semibold text-gray-900"
                                }`}
                              >
                                {item.title}
                              </div>
                              {item.unread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              )}
                            </div>
                            {item.message && (
                              <div className="mt-0.5 text-[11px] text-gray-600 line-clamp-2">
                                {item.message}
                              </div>
                            )}
                            <div className="mt-0.5 text-[10px] text-gray-400">
                              {formatRelativeTime(item.created_at, new Date(), locale, {
                                numeric: "auto",
                                style: "short",
                              }) || formatDateTime(item.created_at, locale)}
                            </div>
                          </div>
                          {item.type !== "pending_review" && (
                            <button
                              type="button"
                              className="ml-2 text-[11px] text-gray-400 hover:text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmState({
                                  message: tNotifications("confirmArchiveOne"),
                                  onConfirm: () =>
                                    nav.handleArchiveNotification(item.id, item.unread),
                                });
                              }}
                              disabled={nav.archiveNotificationIdLoading === item.id}
                            >
                              {tNotifications("archive")}
                            </button>
                          )}
                        </div>
                      </Link>
                    ))}
                    {nav.notificationsHasMore && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-[11px] text-blue-600 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={nav.notificationsLoading}
                        onClick={nav.handleLoadMoreNotifications}
                      >
                        {nav.notificationsLoading
                          ? tNotifications("loading")
                          : tNotifications("loadMore")}
                      </button>
                    )}
                  </div>
                )}
                {nav.notificationsCount > 0 && (
                  <div className="px-3 py-2 border-t border-gray-100 text-[11px] text-gray-500">
                    {tNotifications("summary").replace("{count}", String(nav.notificationsCount))}
                  </div>
                )}
              </div>
            )}
          </div>
          <WalletSection nav={nav} />
        </div>
      </div>

      <Modal
        open={confirmState !== null}
        onClose={closeConfirm}
        role="alertdialog"
        ariaLabelledby="notifications-confirm-title"
        ariaDescribedby="notifications-confirm-desc"
      >
        <div className="bg-white rounded-xl shadow-xl p-5 w-[92vw] max-w-sm border border-gray-100">
          <h3 id="notifications-confirm-title" className="text-sm font-semibold text-gray-900">
            {tCommon("confirm")}
          </h3>
          <p
            id="notifications-confirm-desc"
            className="mt-2 text-sm text-gray-600 whitespace-pre-wrap"
          >
            {confirmState?.message || ""}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={closeConfirm}
              disabled={confirmBusy}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={runConfirm}
              disabled={confirmBusy}
            >
              {tCommon("confirm")}
            </button>
          </div>
        </div>
      </Modal>

      {mounted && modal && createPortal(modal, document.body)}

      {mounted && (
        <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
      )}
    </header>
  );
}
