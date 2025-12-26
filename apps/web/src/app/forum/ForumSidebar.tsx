import React from "react";
import { MessageSquare, Search, Users, TrendingUp } from "lucide-react";
import { normalizeCategory } from "@/features/trending/trendingModel";
import { getCategoryStyle } from "./forumConfig";
import type { ForumCategory, PredictionItem } from "./useForumList";

type ForumSidebarProps = {
  categories: ForumCategory[];
  activeCategory: string;
  setActiveCategory: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  filtered: PredictionItem[];
  loading: boolean;
  error: string | null;
  selectedTopicId: number | null;
  setSelectedTopicId: React.Dispatch<React.SetStateAction<number | null>>;
};

export function ForumSidebar({
  categories,
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  filtered,
  loading,
  error,
  selectedTopicId,
  setSelectedTopicId,
}: ForumSidebarProps) {
  const allCategory = categories.find((cat) => cat.id === "all");
  const otherCategories = categories.filter((cat) => cat.id !== "all");

  return (
    <div className="w-64 flex-shrink-0 border-r border-[var(--card-border)] flex flex-col overflow-x-hidden relative overflow-hidden bg-[var(--card-bg)]/55 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand/10 via-brand-accent/8 to-transparent dark:from-brand/12 dark:via-brand-accent/10 dark:to-transparent opacity-70" />
      <div className="pointer-events-none absolute -z-10 -top-24 -left-24 h-64 w-64 rounded-full bg-purple-500/12 blur-3xl dark:bg-purple-500/10" />
      <div className="pointer-events-none absolute -z-10 -bottom-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl dark:bg-fuchsia-500/10" />

      <div className="p-5 border-b border-[var(--card-border)] bg-[var(--card-bg)]/55 backdrop-blur-xl relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/10 via-brand-accent/10 to-transparent dark:from-brand/12 dark:via-brand-accent/10 dark:to-transparent opacity-60" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-[var(--card-bg)] rounded-xl flex items-center justify-center text-brand shadow-lg shadow-indigo-200/20 border border-[var(--card-border)]">
            <MessageSquare size={20} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--foreground)] leading-tight tracking-tight">
              Forum
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1 h-1 rounded-full bg-brand animate-pulse"></div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                Community
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          {allCategory && (
            <div>
              {(() => {
                const isActive = activeCategory === allCategory.id;
                return (
                  <button
                    key={allCategory.id}
                    onClick={() => setActiveCategory(allCategory.id)}
                    className={`w-full flex items-center justify-center px-4 py-2.5 rounded-full text-[12px] font-bold tracking-wide border-2 transition-all duration-200 ${
                      isActive
                        ? "bg-brand-accent text-white border-brand-accent shadow-md shadow-brand/40"
                        : "bg-brand-accent/15 text-brand-accent border-brand-accent/50 hover:bg-brand-accent/25"
                    }`}
                  >
                    {allCategory.name}
                  </button>
                );
              })()}
            </div>
          )}

          {otherCategories.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5">
              {otherCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                const label = cat.id === "加密货币" ? "加密货币" : cat.name;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full px-3 py-1.5 rounded-full text-[11px] font-bold border-2 text-center transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-brand-accent text-white border-brand-accent shadow-sm"
                        : "bg-[var(--card-bg)] text-brand-accent border-brand-accent/30 hover:bg-brand-accent/10 dark:bg-slate-900/25"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-black/5 rounded-xl blur-md group-focus-within:bg-brand/5 transition-all"></div>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors z-10"
            size={16}
          />
          <input
            type="text"
            placeholder="搜索话题或讨论..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 focus:ring-brand/10 focus:border-brand/40 transition-all outline-none relative z-0 shadow-sm group-hover:shadow-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
            {loading ? "加载话题中..." : error ? "暂无可用话题" : "暂无话题"}
          </div>
        ) : (
          filtered.map((topic) => {
            const catName = normalizeCategory(topic.category);
            const isActive = selectedTopicId === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 border group relative overflow-hidden bg-[var(--card-bg)]/65 backdrop-blur-xl border-[var(--card-border)] hover:shadow-sm ${
                  isActive
                    ? "ring-2 ring-brand/20 border-brand/20 shadow-brand"
                    : "ring-1 ring-transparent hover:border-brand/15"
                }`}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-brand-accent/8 to-transparent dark:from-brand/12 dark:via-brand-accent/10 dark:to-transparent opacity-55" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-brand/10 text-brand border border-brand/15">
                      {catName}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {topic.created_at ? new Date(topic.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold leading-snug mb-2 text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white line-clamp-2">
                    {topic.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {topic.followers_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp size={12} className="text-brand" /> {catName}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
