"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { getDisplayName } from "@/lib/userProfiles";
import ForumSection from "@/components/ForumSection";
import { useTranslations } from "@/lib/i18n";
import type { ChatPanelProps } from "./chatPanel/types";
import { useDiscussionMessages } from "./chatPanel/hooks/useDiscussionMessages";
import { useForumThreads } from "./chatPanel/hooks/useForumThreads";
import { useNameMap } from "./chatPanel/hooks/useNameMap";
import { catCls, getAccentClass } from "./chatPanel/utils/colors";
import { mergeMessages } from "./chatPanel/utils/mergeMessages";
import { ChatHeader } from "./chatPanel/ui/ChatHeader";
import { AnnouncementBar } from "./chatPanel/ui/AnnouncementBar";
import { MessagesList } from "./chatPanel/ui/MessagesList";
import { ChatInputArea } from "./chatPanel/ui/ChatInputArea";

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

  const { messages } = useDiscussionMessages(eventId);
  const { forumThreads, forumMessages } = useForumThreads(eventId);
  const { nameMap } = useNameMap({ messages, forumMessages, account });

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);

  const displayName = (addr: string) => getDisplayName(addr, nameMap, formatAddress);

  const quickPrompts = [
    tChat("quickPrompt.reason"),
    tChat("quickPrompt.update"),
    tChat("quickPrompt.opinion"),
  ];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const mergedMessages = useMemo(
    () => mergeMessages(messages, forumMessages),
    [messages, forumMessages]
  );

  const roomLabel = useMemo(() => {
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
        body: JSON.stringify({ proposalId: eventId, content: input, userId: account }),
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

  const containerCls =
    "flex flex-col h-full rounded-3xl text-[var(--foreground)] glass-card shadow-md shadow-brand/20 relative overflow-hidden";
  const minH = String(
    minHeightPx && minHeightPx > 0
      ? `${minHeightPx}px`
      : minHeightVh && minHeightVh > 0
        ? `${minHeightVh}vh`
        : "100%"
  );

  return (
    <div className={containerCls} style={{ minHeight: minH }}>
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

      <AnnouncementBar
        roomCategory={roomCategory}
        forumThreads={forumThreads}
        tChat={tChat}
        badgeClass={catCls(roomCategory)}
      />

      {isProposalRoom ? (
        <div className="mx-4 mt-3 mb-4 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-xl shadow-sm">
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
