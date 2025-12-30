"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ChevronUp, X, ChevronLeft, ChevronRight } from "lucide-react";
import GradientPage from "@/components/ui/GradientPage";
import { ForumSidebar } from "./ForumSidebar";
import { ForumChatFrame } from "./ForumChatFrame";
import { useForumData } from "./useForumData";
import { t } from "@/lib/i18n";

export default function ForumPage() {
  const {
    account,
    categories,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    filtered,
    loading,
    loadingMore,
    error,
    selectedTopicId,
    setSelectedTopicId,
    currentTopic,
    activeCat,
    displayName,
    hasNextPage,
    loadMore,
    total,
    // 实时更新
    newCount,
    refreshAndReset,
    isConnected,
    // 滚动位置
    saveScrollPosition,
    getSavedScrollPosition,
  } = useForumData();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleMobileTopicSelect: typeof setSelectedTopicId = (value) => {
    setSelectedTopicId(value);
    setMobileDrawerOpen(false);
  };

  return (
    <GradientPage className="h-screen w-full px-2 md:px-4 lg:px-6 py-4 md:py-6 lg:py-10 flex overflow-hidden overflow-x-hidden font-sans text-[var(--foreground)]">
      <div className="flex-1 w-full flex flex-col">
        <div className="flex-1 flex flex-col md:flex-row rounded-2xl md:rounded-3xl overflow-hidden shadow-inner bg-gradient-to-br from-white via-purple-50/40 to-fuchsia-50/30 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900 border border-purple-200/60 dark:border-slate-700/50">
          <div className="hidden md:flex">
            {!sidebarCollapsed && (
              <ForumSidebar
                categories={categories}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filtered={filtered}
                loading={loading}
                loadingMore={loadingMore}
                error={error}
                selectedTopicId={selectedTopicId}
                setSelectedTopicId={setSelectedTopicId}
                hasNextPage={hasNextPage}
                loadMore={loadMore}
                total={total}
                newCount={newCount}
                refreshAndReset={refreshAndReset}
                isConnected={isConnected}
                saveScrollPosition={saveScrollPosition}
                getSavedScrollPosition={getSavedScrollPosition}
              />
            )}
          </div>

          <div className="flex-1 flex flex-col relative">
            <ForumChatFrame
              account={account}
              currentTopic={currentTopic}
              activeCat={activeCat}
              displayName={displayName}
              loading={loading}
              error={error}
              onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
            />

            <button
              type="button"
              aria-label="Toggle sidebar"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="hidden md:flex absolute top-3 right-3 z-20 h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-slate-900/80 border border-purple-200/60 dark:border-slate-700/60 shadow-sm text-slate-500 hover:text-[var(--foreground)] hover:bg-white dark:hover:bg-slate-800 transition"
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* 移动端话题选择按钮 - 固定在底部 */}
      <button
        onClick={() => setMobileDrawerOpen(true)}
        className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-brand-accent text-white rounded-full shadow-lg shadow-brand/40 font-bold text-sm active:scale-95 transition-transform"
      >
        <MessageSquare size={18} />
        <span>{t("forum.selectTopicMobile")}</span>
        <ChevronUp size={16} />
      </button>

      {/* 移动端话题选择抽屉 */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-50"
            />
            {/* 抽屉内容 */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
            >
              {/* 抽屉头部 */}
              <div className="flex items-center justify-between p-4 border-b border-purple-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center">
                    <MessageSquare size={18} className="text-brand" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--foreground)]">
                      {t("forum.sidebarTitle")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t("forum.topicCount").replace("{count}", String(filtered.length))}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* 抽屉内容 - 使用 ForumSidebar 的内容部分 */}
              <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
                <ForumSidebar
                  categories={categories}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filtered={filtered}
                  loading={loading}
                  loadingMore={loadingMore}
                  error={error}
                  selectedTopicId={selectedTopicId}
                  setSelectedTopicId={handleMobileTopicSelect}
                  hasNextPage={hasNextPage}
                  loadMore={loadMore}
                  total={total}
                  newCount={newCount}
                  refreshAndReset={refreshAndReset}
                  isConnected={isConnected}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </GradientPage>
  );
}
