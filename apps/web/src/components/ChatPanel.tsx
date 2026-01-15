"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useUserProfileOptional } from "@/contexts/UserProfileContext";
import { getDisplayName } from "@/lib/userProfiles";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import type { ChatPanelProps, ChatMessageView } from "./chatPanel/types";
import { useDiscussionMessages } from "./chatPanel/hooks/useDiscussionMessages";
import { useForumThreads } from "./chatPanel/hooks/useForumThreads";
import { useNameMap } from "./chatPanel/hooks/useNameMap";
import { getAccentClass } from "./chatPanel/utils/colors";
import { mergeMessages } from "./chatPanel/utils/mergeMessages";
import { ChatHeader } from "./chatPanel/ui/ChatHeader";
import { MessagesList } from "./chatPanel/ui/MessagesList";
import { ChatInputArea } from "./chatPanel/ui/ChatInputArea";
import EmptyState from "@/components/EmptyState";
import { AlertTriangle, Loader2 } from "lucide-react";

function buildDebatePrefix(
  stance: NonNullable<ChatMessageView["debate_stance"]>,
  kind: NonNullable<ChatMessageView["debate_kind"]>
) {
  return `[debate:stance=${stance};kind=${kind}]`;
}

function parseDebatePrefs(raw: string | null) {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Partial<{
      debateMode: boolean;
      debateStance: ChatMessageView["debate_stance"];
      debateKind: ChatMessageView["debate_kind"];
      debateFilter: "all" | "debate" | "normal";
      partition: "chat" | "debate" | "forum";
      stanceFilter: "all" | "pro" | "con" | "uncertain";
      kindFilter: "all" | "claim" | "evidence" | "rebuttal" | "question" | "summary";
    }>;
    if (typeof obj !== "object" || obj === null) return null;
    const next: {
      debateMode?: boolean;
      debateStance?: NonNullable<ChatMessageView["debate_stance"]>;
      debateKind?: NonNullable<ChatMessageView["debate_kind"]>;
      partition?: "chat" | "debate" | "forum";
      stanceFilter?: "all" | "pro" | "con" | "uncertain";
      kindFilter?: "all" | "claim" | "evidence" | "rebuttal" | "question" | "summary";
    } = {};
    if (typeof obj.debateMode === "boolean") next.debateMode = obj.debateMode;
    if (
      obj.debateStance === "pro" ||
      obj.debateStance === "con" ||
      obj.debateStance === "uncertain"
    ) {
      next.debateStance = obj.debateStance;
    }
    if (
      obj.debateKind === "claim" ||
      obj.debateKind === "evidence" ||
      obj.debateKind === "rebuttal" ||
      obj.debateKind === "question" ||
      obj.debateKind === "summary"
    ) {
      next.debateKind = obj.debateKind;
    }
    if (obj.partition === "chat" || obj.partition === "debate") {
      next.partition = obj.partition;
    } else if (obj.partition === "forum") {
      next.partition = "forum";
    } else if (obj.debateFilter === "debate") {
      next.partition = "debate";
    } else if (obj.debateFilter === "normal" || obj.debateFilter === "all") {
      next.partition = "chat";
    }
    if (
      obj.stanceFilter === "all" ||
      obj.stanceFilter === "pro" ||
      obj.stanceFilter === "con" ||
      obj.stanceFilter === "uncertain"
    ) {
      next.stanceFilter = obj.stanceFilter;
    }
    if (
      obj.kindFilter === "all" ||
      obj.kindFilter === "claim" ||
      obj.kindFilter === "evidence" ||
      obj.kindFilter === "rebuttal" ||
      obj.kindFilter === "question" ||
      obj.kindFilter === "summary"
    ) {
      next.kindFilter = obj.kindFilter;
    }
    return next;
  } catch {
    return null;
  }
}

export default function ChatPanel({
  eventId,
  roomTitle,
  roomCategory,
  hideHeader = false,
  className,
}: ChatPanelProps) {
  const {
    account,
    connectWallet,
    formatAddress,
    siweLogin,
    requestWalletPermissions,
    multisigSign,
  } = useWallet();
  const profileCtx = useUserProfileOptional();
  const viewerIsAdmin = !!profileCtx?.isAdmin;
  const tChat = useTranslations("chat");
  const tCommon = useTranslations("common");

  const {
    messages,
    setMessages,
    loading: discussionLoading,
    error: discussionError,
    refresh: refreshDiscussion,
  } = useDiscussionMessages(eventId);
  const {
    forumMessages,
    loading: forumLoading,
    error: forumError,
    refresh: refreshForum,
  } = useForumThreads(eventId);
  const { nameMap } = useNameMap({ messages, forumMessages, account });

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [partition, setPartition] = useState<"chat" | "debate" | "forum">("chat");
  const [stanceFilter, setStanceFilter] = useState<"all" | "pro" | "con" | "uncertain">("all");
  const [kindFilter, setKindFilter] = useState<
    "all" | "claim" | "evidence" | "rebuttal" | "question" | "summary"
  >("all");
  const [debateMode, setDebateMode] = useState(false);
  const [debateStance, setDebateStance] =
    useState<NonNullable<ChatMessageView["debate_stance"]>>("pro");
  const [debateKind, setDebateKind] =
    useState<NonNullable<ChatMessageView["debate_kind"]>>("claim");

  const displayName = (addr: string) => getDisplayName(addr, nameMap, formatAddress);

  const [mutedUsers, setMutedUsers] = useState<Record<string, true>>({});

  useEffect(() => {
    const key = "chat:mutedUsers";
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      if (!Array.isArray(arr)) return;
      const next: Record<string, true> = {};
      arr.forEach((x) => {
        const a = typeof x === "string" ? x : "";
        const k = a.trim().toLowerCase();
        if (k) next[k] = true;
      });
      setMutedUsers(next);
    } catch {}
  }, []);

  const isMuted = useCallback(
    (addr?: string | null) => {
      const k = String(addr || "")
        .trim()
        .toLowerCase();
      if (!k) return false;
      return !!mutedUsers[k];
    },
    [mutedUsers]
  );

  const setMute = useCallback((addr: string, muted: boolean) => {
    const key = "chat:mutedUsers";
    const k = String(addr || "")
      .trim()
      .toLowerCase();
    if (!k) return;
    setMutedUsers((prev) => {
      const next = { ...prev };
      if (muted) next[k] = true;
      else delete next[k];
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(Object.keys(next)));
        }
      } catch {}
      return next;
    });
  }, []);

  const quickPrompts = [
    tChat("quickPrompt.reason"),
    tChat("quickPrompt.update"),
    tChat("quickPrompt.opinion"),
  ];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, forumMessages.length]);

  useEffect(() => {
    const key = `chat:debatePrefs:${eventId}`;
    const prefs = parseDebatePrefs(
      typeof window !== "undefined" ? window.localStorage.getItem(key) : null
    );
    if (!prefs) return;
    if (prefs.debateMode !== undefined) setDebateMode(prefs.debateMode);
    if (prefs.debateStance) setDebateStance(prefs.debateStance);
    if (prefs.debateKind) setDebateKind(prefs.debateKind);
    if (prefs.partition) setPartition(prefs.partition);
    if (prefs.stanceFilter) setStanceFilter(prefs.stanceFilter);
    if (prefs.kindFilter) setKindFilter(prefs.kindFilter);
  }, [eventId]);

  useEffect(() => {
    const key = `chat:debatePrefs:${eventId}`;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          debateMode,
          debateStance,
          debateKind,
          partition,
          stanceFilter,
          kindFilter,
        })
      );
    } catch {}
  }, [eventId, debateMode, debateStance, debateKind, partition, stanceFilter, kindFilter]);

  useEffect(() => {
    if (partition === "debate") {
      setDebateMode(true);
    } else {
      setDebateMode(false);
    }
  }, [partition]);

  const mergedMessages = useMemo(
    () => mergeMessages(messages, forumMessages),
    [messages, forumMessages]
  );

  const filteredMessages = useMemo(
    () =>
      mergedMessages.filter((m) => {
        if (account && String(m.user_id).toLowerCase() === String(account).toLowerCase()) {
          return true;
        }
        return !isMuted(m.user_id);
      }),
    [mergedMessages, account, isMuted]
  );

  const discussionOnly = useMemo(() => mergeMessages(messages, []), [messages]);
  const forumOnly = useMemo(() => mergeMessages([], forumMessages), [forumMessages]);

  const displayedMessages = useMemo(() => {
    const source = partition === "forum" ? forumOnly : discussionOnly;
    const base = source.filter((m) => {
      if (account && String(m.user_id).toLowerCase() === String(account).toLowerCase()) {
        return true;
      }
      return !isMuted(m.user_id);
    });
    if (partition === "forum") return base;
    const filtered = base.filter((m) => {
      const isDebate = !!(m.debate_kind || m.debate_stance);
      return partition === "debate" ? isDebate : !isDebate;
    });
    if (partition !== "debate") return filtered;
    return filtered.filter((m) => {
      if (stanceFilter !== "all" && m.debate_stance !== stanceFilter) return false;
      if (kindFilter !== "all" && m.debate_kind !== kindFilter) return false;
      return true;
    });
  }, [partition, forumOnly, discussionOnly, account, isMuted, stanceFilter, kindFilter]);

  const roomLabel = useMemo(() => {
    const t = String(roomTitle || "").trim();
    if (!t) return tChat("header.title");
    return tChat("header.withTopic").replace("{title}", t);
  }, [roomTitle, tChat]);

  const loadFailed = discussionError || forumError;
  const loadLoading = discussionLoading || forumLoading;
  const retryLoad = useCallback(() => {
    refreshDiscussion();
    refreshForum();
  }, [refreshDiscussion, refreshForum]);

  const sendMessage = async (imageUrl?: string) => {
    if (!input.trim() && !imageUrl) return;
    if (!account) {
      const msg = tChat("errors.walletRequired");
      setSendError(msg);
      toast.error(tCommon("error"), msg);
      return;
    }
    if (partition === "forum") {
      const msg = tChat("forum.readOnlyHint");
      setSendError(msg);
      toast.error(tCommon("error"), msg);
      return;
    }
    const effectiveDebateMode = partition === "debate" || debateMode;
    const contentToSend = effectiveDebateMode
      ? `${buildDebatePrefix(debateStance, debateKind)} ${input}`
      : input;
    setSending(true);
    setSendError(null);
    try {
      const replyToId =
        replyTo?.id && /^\d+$/.test(replyTo.id) ? Number(replyTo.id) : (null as any);
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: eventId,
          content: contentToSend,
          userId: account,
          image_url: imageUrl,
          replyToId,
          replyToUser: replyTo?.user_id || null,
          replyToContent: replyTo?.content ? replyTo.content.slice(0, 100) : null,
          topic: null,
        }),
      });
      if (!res.ok) {
        throw new Error("send_failed");
      }
      setInput("");
      setReplyTo(null);
      setPartition(effectiveDebateMode ? "debate" : "chat");
    } catch (e: any) {
      const msg = tChat("errors.sendFailed");
      setSendError(msg);
      toast.error(tCommon("error"), msg);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = useCallback(
    async (msg: ChatMessageView) => {
      if (!account) return;
      if (!/^\d+$/.test(String(msg.id || ""))) return;
      try {
        const res = await fetch(`/api/discussions/${msg.id}`, { method: "DELETE" });
        if (!res.ok) {
          const contentType = String(res.headers.get("content-type") || "");
          const json = contentType.includes("application/json")
            ? await res.json().catch(() => null)
            : null;
          const serverMsg = String(
            (json as any)?.error?.message || (json as any)?.message || ""
          ).trim();
          throw new Error(serverMsg || "delete_failed");
        }
        setMessages((prev) => prev.filter((m) => String(m.id) !== String(msg.id)));
        toast.success(tCommon("success"), tChat("message.deleted"));
      } catch (e: any) {
        const msg = String(e?.message || "").trim();
        toast.error(
          tCommon("error"),
          msg && msg !== "delete_failed" ? msg : tChat("message.deleteFailed")
        );
      }
    },
    [account, setMessages, tCommon, tChat]
  );

  const reportMessage = useCallback(
    async (msg: ChatMessageView, reason: string) => {
      if (!account) return;
      if (!/^\d+$/.test(String(msg.id || ""))) return;
      try {
        const res = await fetch("/api/discussions/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discussionId: Number(msg.id),
            reason,
          }),
        });
        if (!res.ok) {
          const contentType = String(res.headers.get("content-type") || "");
          const json = contentType.includes("application/json")
            ? await res.json().catch(() => null)
            : null;
          const serverMsg = String(
            (json as any)?.error?.message || (json as any)?.message || ""
          ).trim();
          throw new Error(serverMsg || "report_failed");
        }
        toast.success(tCommon("success"), tChat("message.reported"));
      } catch (e: any) {
        const msg = String(e?.message || "").trim();
        toast.error(
          tCommon("error"),
          msg && msg !== "report_failed" ? msg : tChat("message.reportFailed")
        );
      }
    },
    [account, tCommon, tChat]
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-3xl text-[var(--foreground)] glass-card shadow-md shadow-brand/20 relative overflow-hidden",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand/10 via-brand-accent/10 to-transparent dark:from-brand/15 dark:via-brand-accent/10 dark:to-transparent opacity-70" />
      <div className="pointer-events-none absolute -z-10 -top-24 -left-24 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl dark:bg-purple-500/10" />
      <div className="pointer-events-none absolute -z-10 -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl dark:bg-fuchsia-500/10" />
      {!hideHeader && (
        <ChatHeader
          roomLabel={roomLabel}
          roomCategory={roomCategory}
          account={account}
          displayName={displayName}
          tChat={tChat}
          accentClass={getAccentClass(roomCategory)}
        />
      )}

      <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--card-bg)]/60 backdrop-blur-md flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
          {tChat("topics.sectionTitle")}
        </span>
        {(
          [
            { value: "chat", labelKey: "topics.chat" },
            { value: "debate", labelKey: "topics.debate" },
            { value: "forum", labelKey: "topics.forum" },
          ] as const
        ).map((t) => {
          const isActive = partition === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setPartition(t.value)}
              className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                isActive
                  ? "bg-brand/10 border-brand/40 text-brand-700 dark:text-brand-300"
                  : "bg-[var(--card-bg)] border-[var(--card-border)] text-slate-500 hover:border-brand/30 hover:text-brand-700 dark:hover:text-brand-300"
              }`}
            >
              {tChat(t.labelKey)}
            </button>
          );
        })}
      </div>

      {loadFailed ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 bg-transparent custom-scrollbar">
          <EmptyState
            icon={AlertTriangle}
            title={tCommon("loadFailed")}
            description={tChat("empty.description")}
            action={{
              label: tCommon("retry"),
              onClick: retryLoad,
            }}
          />
        </div>
      ) : loadLoading && filteredMessages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4 py-10 bg-transparent">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{tCommon("loading")}</span>
          </div>
        </div>
      ) : (
        <MessagesList
          mergedMessages={displayedMessages}
          account={account}
          viewerIsAdmin={viewerIsAdmin}
          displayName={displayName}
          tChat={tChat}
          setInput={setInput}
          listRef={listRef}
          setReplyTo={setReplyTo}
          isUserMuted={isMuted}
          onMuteUser={(addr) => setMute(addr, true)}
          onUnmuteUser={(addr) => setMute(addr, false)}
          onDeleteMessage={deleteMessage}
          onReportMessage={reportMessage}
        />
      )}

      {partition === "forum" ? (
        <div className="p-3 border-t border-[var(--card-border)] bg-[var(--card-bg)]/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            {tChat("forum.readOnlyHint")}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPartition("chat")}
              className="px-3 py-1.5 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-brand/25 hover:bg-brand/10 transition-colors"
            >
              {tChat("forum.switchToChat")}
            </button>
            <button
              type="button"
              onClick={() => setPartition("debate")}
              className="px-3 py-1.5 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-brand/25 hover:bg-brand/10 transition-colors"
            >
              {tChat("forum.switchToDebate")}
            </button>
          </div>
        </div>
      ) : (
        <ChatInputArea
          account={account}
          tChat={tChat}
          connectWallet={connectWallet}
          requestWalletPermissions={requestWalletPermissions}
          siweLogin={siweLogin}
          multisigSign={multisigSign}
          quickPrompts={quickPrompts}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          sending={sending}
          showEmojis={showEmojis}
          setShowEmojis={setShowEmojis}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          displayName={displayName}
          error={sendError}
          debateMode={debateMode}
          setDebateMode={setDebateMode}
          debateStance={debateStance}
          setDebateStance={setDebateStance}
          debateKind={debateKind}
          setDebateKind={setDebateKind}
          forceDebateMode={partition === "debate"}
        />
      )}
    </div>
  );
}
