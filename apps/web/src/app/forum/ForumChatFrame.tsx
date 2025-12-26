import React from "react";
import Link from "next/link";
import {
  MessageSquare,
  Sparkles,
  Users,
  TrendingUp,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import { getCategoryStyle } from "./forumConfig";
import type { PredictionItem } from "./useForumList";

type ForumChatFrameProps = {
  account: string | null | undefined;
  currentTopic: PredictionItem | null;
  activeCat: string;
  displayName: (addr: string) => string;
  loading: boolean;
  error: string | null;
};

export function ForumChatFrame({
  account,
  currentTopic,
  activeCat,
  displayName,
  loading,
  error,
}: ForumChatFrameProps) {
  const style = getCategoryStyle(activeCat);

  return (
    <div className="flex-1 flex flex-col">
      <header
        className="h-16 px-6 border-b border-[var(--card-border)] flex items-center justify-between sticky top-0 z-20 bg-[var(--card-bg)] backdrop-blur-xl shadow-none relative overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/10 via-brand-accent/10 to-transparent dark:from-brand/12 dark:via-brand-accent/10 dark:to-transparent opacity-70" />
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-brand/15 shadow-inner">
            <MessageSquare className="w-5 h-5 text-brand drop-shadow" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[var(--foreground)] truncate text-lg tracking-tight">
                {currentTopic?.title || "聊天室"}
              </h2>
              <Sparkles className="w-4 h-4 text-brand/80" />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 bg-brand/10 text-brand px-2 py-0.5 rounded-full border border-brand/20 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Discussion
              </span>
              <span>•</span>
              <span className="font-mono text-slate-400 dark:text-slate-500">
                #{currentTopic?.id ?? "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-xs font-medium bg-[var(--card-bg)] text-[var(--foreground)] px-3 py-1.5 rounded-xl border border-[var(--card-border)]">
            {account ? `你：${displayName(account)}` : "未连接钱包"}
          </div>

          <div className="w-px h-8 bg-[var(--card-border)]" />

          {currentTopic?.id && (
            <>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                  关联预测
                </span>
                <Link
                  href={`/prediction/${currentTopic.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline whitespace-nowrap"
                >
                  查看市场
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="w-px h-8 bg-[var(--card-border)]" />
            </>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
              Followers
            </span>
            <span className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1">
              <Users size={14} className={style.accentText} />
              {currentTopic?.followers_count ?? 0}
            </span>
          </div>

          <div className="w-px h-8 bg-[var(--card-border)]" />

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
              Category
            </span>
            <span className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1 min-w-0 max-w-[9rem]">
              <TrendingUp size={14} className={style.accentText} />
              <span
                className="min-w-0 truncate whitespace-nowrap"
                title={currentTopic?.category || ""}
              >
                {currentTopic?.category}
              </span>
            </span>
          </div>

          <div className="w-px h-8 bg-[var(--card-border)]" />

          <button className="p-2 text-slate-500 hover:text-[var(--foreground)] hover:bg-white/10 dark:hover:bg-white/5 rounded-xl transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col px-4 pb-4 pt-3">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-brand-accent/10 to-transparent dark:from-brand/15 dark:via-brand-accent/10 dark:to-transparent opacity-60" />
        <div className="flex-1 flex flex-col z-10 relative">
          {currentTopic?.id ? (
            <ChatPanel
              eventId={currentTopic.id}
              roomTitle={currentTopic.title}
              roomCategory={currentTopic.category}
              hideHeader={true}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-300 backdrop-blur-md">
              {loading
                ? "加载话题中..."
                : error
                  ? "加载失败，请稍后重试"
                  : "请选择一个话题开始讨论"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
