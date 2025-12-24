"use client";
import React, { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useWallet } from "@/contexts/WalletContext";
import { fetchUsernamesByAddresses, getDisplayName } from "@/lib/userProfiles";
import { MessageSquare, Sparkles, Loader2, Smile } from "lucide-react";
import ForumSection from "@/components/ForumSection";
import EmptyState from "@/components/EmptyState";
import { useTranslations } from "@/lib/i18n";

interface ChatPanelProps {
  eventId: number;
  roomTitle?: string;
  roomCategory?: string;
  isProposalRoom?: boolean;
  minHeightPx?: number;
  minHeightVh?: number;
  hideHeader?: boolean;
}

interface ChatMessageView {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export default function ChatPanel({
  eventId,
  roomTitle,
  roomCategory,
  isProposalRoom,
  minHeightPx,
  minHeightVh,
  hideHeader = false,
}: ChatPanelProps) {
  const {
    account,
    connectWallet,
    formatAddress,
    siweLogin,
    requestWalletPermissions,
    multisigSign,
  } = useWallet();
  const tChat = useTranslations("chat");
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [forumMessages, setForumMessages] = useState<ChatMessageView[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  const displayName = (addr: string) => getDisplayName(addr, nameMap, formatAddress);

  const quickPrompts = [
    tChat("quickPrompt.reason"),
    tChat("quickPrompt.update"),
    tChat("quickPrompt.opinion"),
  ];

  useEffect(() => {
    let channel: any = null;
    let isSubscribed = true;

    const load = async () => {
      try {
        if (!isSubscribed) return;

        if (supabase) {
          const { data, error } = await supabase
            .from("discussions")
            .select("*")
            .eq("proposal_id", eventId)
            .order("created_at", { ascending: true });
          if (!error && isSubscribed) {
            const list = Array.isArray(data) ? data : [];
            setMessages(
              list.map((r: any) => ({
                id: String(r.id),
                user_id: String(r.user_id),
                content: String(r.content),
                created_at: String(r.created_at),
              }))
            );
            return;
          }
        }
        const res = await fetch(`/api/discussions?proposalId=${eventId}`);
        const data = await res.json();
        if (!isSubscribed) return;

        const list = Array.isArray(data?.discussions) ? data.discussions : [];
        setMessages(
          list.map((r: any) => ({
            id: String(r.id),
            user_id: String(r.user_id),
            content: String(r.content),
            created_at: String(r.created_at),
          }))
        );
      } catch {}
    };

    load();

    if (supabase) {
      channel = supabase
        .channel(`discussions:${eventId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "discussions",
            filter: `proposal_id=eq.${eventId}`,
          },
          (payload) => {
            if (!isSubscribed) return;
            const r: any = payload.new;
            const m = {
              id: String(r.id),
              user_id: String(r.user_id),
              content: String(r.content),
              created_at: String(r.created_at),
            };
            setMessages((prev) => {
              const merged = [...prev];
              if (!merged.find((x) => x.id === m.id)) merged.push(m);
              merged.sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              return merged;
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "discussions",
            filter: `proposal_id=eq.${eventId}`,
          },
          (payload) => {
            if (!isSubscribed) return;
            const r: any = payload.new;
            const m = {
              id: String(r.id),
              user_id: String(r.user_id),
              content: String(r.content),
              created_at: String(r.created_at),
            };
            setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "discussions",
            filter: `proposal_id=eq.${eventId}`,
          },
          (payload) => {
            if (!isSubscribed) return;
            const r: any = payload.old;
            setMessages((prev) => prev.filter((x) => x.id !== String(r.id)));
          }
        )
        .subscribe();
    }

    // 清理函数
    return () => {
      isSubscribed = false;

      if (channel) {
        try {
          // 先取消订阅
          channel.unsubscribe();
          // 再移除频道
          supabase?.removeChannel(channel);
          channel = null;
        } catch (error) {
          console.error("Failed to cleanup WebSocket channel:", error);
        }
      }
    };
  }, [eventId]);

  useEffect(() => {
    const loadForum = async () => {
      try {
        const res = await fetch(`/api/forum?eventId=${eventId}`);
        const data = await res.json();
        const threads = Array.isArray(data?.threads) ? data.threads : [];
        setForumThreads(threads);
        const fm: ChatMessageView[] = [];
        threads.forEach((t: any) => {
          fm.push({
            id: `thread:${t.id}`,
            user_id: String(t.user_id || ""),
            content: `${String(t.title || "")}\n${String(t.content || "")}`.trim(),
            created_at: String(t.created_at || ""),
          });
          (Array.isArray(t.comments) ? t.comments : []).forEach((c: any) => {
            fm.push({
              id: `comment:${c.id}`,
              user_id: String(c.user_id || ""),
              content: String(c.content || ""),
              created_at: String(c.created_at || ""),
            });
          });
        });
        fm.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setForumMessages(fm);
      } catch {}
    };
    loadForum();
  }, [eventId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    const run = async () => {
      const addrs = new Set<string>();
      messages.forEach((m) => {
        if (m.user_id) addrs.add(String(m.user_id));
      });
      forumMessages.forEach((m) => {
        if (m.user_id) addrs.add(String(m.user_id));
      });
      if (account) addrs.add(String(account));
      const unknown = Array.from(addrs).filter((a) => !nameMap[String(a || "").toLowerCase()]);
      if (unknown.length === 0) return;
      const next = await fetchUsernamesByAddresses(unknown);
      if (Object.keys(next).length === 0) return;
      setNameMap((prev) => ({ ...prev, ...next }));
    };
    run();
  }, [messages, forumMessages, account, nameMap]);

  const mergedMessages = React.useMemo(() => {
    const all = [...messages, ...forumMessages];
    const byId: Record<string, ChatMessageView> = {};
    all.forEach((m) => {
      byId[m.id] = m;
    });
    const arr = Object.values(byId);
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return arr;
  }, [messages, forumMessages]);

  const roomLabel = React.useMemo(() => {
    const t = String(roomTitle || "").trim();
    if (!t) return tChat("header.title");
    return tChat("header.withTopic").replace("{title}", t);
  }, [roomTitle, tChat]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!account) {
      setError(tChat("errors.walletRequired"));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: eventId,
          content: input,
          userId: account,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      setInput("");
    } catch (e: any) {
      setError(e?.message || tChat("errors.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const catCls = (cat?: string) => {
    const c = String(cat || "").toLowerCase();
    if (c.includes("科技")) return "bg-sky-50 text-sky-700 border-sky-100";
    if (c.includes("体育")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (c.includes("娱乐")) return "bg-pink-50 text-pink-700 border-pink-100";
    if (c.includes("时政") || c.includes("政治"))
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (c.includes("天气")) return "bg-cyan-50 text-cyan-700 border-cyan-100";
    if (c.includes("加密") || c.includes("crypto"))
      return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (c.includes("生活")) return "bg-rose-50 text-rose-700 border-rose-100";
    if (c.includes("更多")) return "bg-slate-50 text-slate-700 border-slate-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  const getAccentColor = () => {
    const c = String(roomCategory || "").toLowerCase();
    if (c.includes("体育")) return "text-emerald-600 border-emerald-100";
    if (c.includes("娱乐")) return "text-rose-600 border-rose-100";
    if (c.includes("时政") || c.includes("政治")) return "text-teal-600 border-teal-100";
    if (c.includes("天气")) return "text-sky-600 border-sky-100";
    if (c.includes("科技")) return "text-violet-600 border-violet-100";
    if (c.includes("更多")) return "text-slate-600 border-slate-100";
    return "text-indigo-600 border-indigo-100";
  };

  const containerCls =
    "flex flex-col h-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl text-slate-900 shadow-sm";
  const minH = String(
    minHeightPx && minHeightPx > 0
      ? `${minHeightPx}px`
      : minHeightVh && minHeightVh > 0
        ? `${minHeightVh}vh`
        : "100%"
  );

  return (
    <div className={containerCls} style={{ minHeight: minH }}>
      {!hideHeader && (
        <ChatHeader
          roomLabel={roomLabel}
          roomCategory={roomCategory}
          account={account}
          displayName={displayName}
          tChat={tChat}
          accentClass={getAccentColor()}
        />
      )}

      <AnnouncementBar
        roomCategory={roomCategory}
        forumThreads={forumThreads}
        tChat={tChat}
        badgeClass={catCls(roomCategory)}
      />

      {isProposalRoom ? (
        <div className="mx-4 mt-3 mb-4 rounded-3xl border-2 border-pink-400 bg-pink-50/80 shadow-sm">
          <div className="px-4 pb-4">
            <ForumSection eventId={eventId} />
          </div>
        </div>
      ) : null}

      <MessagesList
        mergedMessages={mergedMessages}
        account={account}
        displayName={displayName}
        tChat={tChat}
        setInput={setInput}
        listRef={listRef}
      />

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
        error={error}
      />
    </div>
  );
}

type ChatHeaderProps = {
  roomLabel: string;
  roomCategory?: string;
  account: string | null | undefined;
  displayName: (addr: string) => string;
  tChat: (key: string) => string;
  accentClass: string;
};

function ChatHeader({
  roomLabel,
  roomCategory,
  account,
  displayName,
  tChat,
  accentClass,
}: ChatHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-white/90 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 border border-slate-200">
          <MessageSquare className="w-4 h-4 text-slate-700" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm text-slate-900 truncate">{roomLabel}</span>
            <Sparkles className="w-3 h-3 text-amber-500" />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${accentClass}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {roomCategory || tChat("header.title")}
            </span>
            <span className="text-slate-400">·</span>
            <span className="truncate">
              {account
                ? tChat("header.youLabel").replace("{name}", displayName(account))
                : tChat("header.walletDisconnected")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type AnnouncementBarProps = {
  roomCategory?: string;
  forumThreads: any[];
  tChat: (key: string) => string;
  badgeClass: string;
};

function AnnouncementBar({ roomCategory, forumThreads, tChat, badgeClass }: AnnouncementBarProps) {
  return (
    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-[11px] text-slate-500">
      <span className={`px-2 py-0.5 rounded-full border ${badgeClass} text-xs`}>
        {tChat("announcement.badge")}
      </span>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-3 whitespace-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {forumThreads.slice(0, 3).map((t) => (
            <span key={t.id} className="opacity-80 text-xs truncate">
              {String(t.title || "").slice(0, 40)}
            </span>
          ))}
          {forumThreads.length === 0 && (
            <span className="opacity-75">{tChat("announcement.empty")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

type MessagesListProps = {
  mergedMessages: ChatMessageView[];
  account: string | null | undefined;
  displayName: (addr: string) => string;
  tChat: (key: string) => string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  listRef: React.RefObject<HTMLDivElement | null>;
};

function MessagesList({
  mergedMessages,
  account,
  displayName,
  tChat,
  setInput,
  listRef,
}: MessagesListProps) {
  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4 bg-white/40 custom-scrollbar"
    >
      {mergedMessages.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title={tChat("empty.title")}
          description={tChat("empty.description")}
          action={
            account
              ? {
                  label: tChat("empty.actionLabel"),
                  onClick: () => {
                    const inputEl = document.querySelector("textarea") as HTMLTextAreaElement;
                    if (inputEl) {
                      inputEl.focus();
                      setInput(tChat("empty.defaultInput"));
                    }
                  },
                }
              : undefined
          }
        />
      )}
      {mergedMessages.map((m, i) => {
        const mine =
          !!account &&
          !!m.user_id &&
          String(account).toLowerCase() === String(m.user_id).toLowerCase();
        const prev = i > 0 ? mergedMessages[i - 1] : null;
        const dateChanged =
          prev &&
          new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
        return (
          <React.Fragment key={m.id}>
            {dateChanged && (
              <div className="flex justify-center">
                <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-3 py-0.5">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold">
                  {displayName(m.user_id).slice(0, 2)}
                </div>
              </div>
              <div
                className={`flex flex-col gap-1 max-w-[80%] ${
                  mine ? "items-end text-right" : "items-start text-left"
                }`}
              >
                <div className="flex items-baseline gap-2 text-[11px] text-slate-500">
                  <span className="font-medium">{displayName(m.user_id)}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                </div>
                <div
                  className={`rounded-2xl px-3 py-2 leading-relaxed border ${
                    mine
                      ? "bg-indigo-50 text-slate-900 border-indigo-100"
                      : "bg-white text-slate-900 border-slate-100"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

type ChatInputAreaProps = {
  account: string | null | undefined;
  tChat: (key: string) => string;
  connectWallet: () => Promise<void>;
  requestWalletPermissions: () => Promise<{ success: boolean; error?: string }>;
  siweLogin: () => Promise<{ success: boolean; address?: string; error?: string }>;
  multisigSign: (data?: {
    verifyingContract?: string;
    action?: string;
    nonce?: number;
  }) => Promise<{ success: boolean; signature?: string; error?: string }>;
  quickPrompts: string[];
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => Promise<void>;
  sending: boolean;
  showEmojis: boolean;
  setShowEmojis: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
};

function ChatInputArea({
  account,
  tChat,
  connectWallet,
  requestWalletPermissions,
  siweLogin,
  multisigSign,
  quickPrompts,
  input,
  setInput,
  sendMessage,
  sending,
  showEmojis,
  setShowEmojis,
  error,
}: ChatInputAreaProps) {
  return (
    <div className="p-3 border-t border-slate-100 bg-white/90 relative pb-[env(safe-area-inset-bottom)] text-slate-800">
      {!account ? (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-700 font-medium">{tChat("input.walletRequired")}</div>
          <Button
            size="sm"
            variant="cta"
            onClick={async () => {
              await connectWallet();
              await requestWalletPermissions();
              await siweLogin();
              await multisigSign();
            }}
          >
            {tChat("input.connectAndSign")}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInput(p)}
                className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white/60 text-slate-600 hover:bg-white hover:text-brand transition-colors shadow-sm"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={tChat("input.placeholder")}
                rows={2}
                className="input-base w-full resize-none px-3 py-2 bg-white/90 text-slate-900 placeholder:text-slate-400"
              />
              <div className="absolute right-2 bottom-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100/50 text-gray-400 hover:text-indigo-600 transition-colors"
                  onClick={() => setShowEmojis((v) => !v)}
                  aria-label={tChat("input.toggleEmojisAria")}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <Smile className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showEmojis && (
                <div className="absolute right-0 bottom-14 z-10 bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl shadow-xl p-3 grid grid-cols-6 gap-1">
                  {["🙂", "🔥", "🚀", "💡", "🎯", "👏", "📈", "🤔", "✅", "❗", "✨", "📌"].map(
                    (emo) => (
                      <button
                        key={emo}
                        className="text-base px-1 py-1 hover:bg-gray-100 rounded"
                        type="button"
                        onClick={() => setInput((prev) => prev + emo)}
                      >
                        {emo}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
            <Button onClick={sendMessage} disabled={sending} size="sm" variant="primary">
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tChat("input.sending")}
                </span>
              ) : (
                tChat("input.send")
              )}
            </Button>
          </div>
        </>
      )}
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </div>
  );
}
