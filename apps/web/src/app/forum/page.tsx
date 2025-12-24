"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getCategoryStyle } from "./forumConfig";
import { ForumSidebar } from "./ForumSidebar";
import { ForumChatFrame } from "./ForumChatFrame";
import { useForumData } from "./useForumData";

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
    error,
    selectedTopicId,
    setSelectedTopicId,
    currentTopic,
    activeCat,
    displayName,
  } = useForumData();

  return (
    <div className="h-screen w-full bg-[#f8faff] p-4 lg:p-6 flex overflow-hidden overflow-x-hidden font-sans text-slate-800 relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-200/30 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200/30 blur-[100px]" />
      </div>

      <div className="relative z-10 mb-4 max-w-3xl mx-auto">
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-5 border border-white/50 shadow-sm">
          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            Foresight
            讨论区是预测市场参与者交流观点、分享策略的核心社区，你可以创建主题讨论现实世界事件，或参与现有预测的深度分析。
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            前往{" "}
            <Link
              href="/trending"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              热门预测
            </Link>{" "}
            发现可讨论的事件，或在{" "}
            <Link
              href="/proposals"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              提案广场
            </Link>{" "}
            发起新预测。
          </p>
        </div>
      </div>

      {/* TV Frame: unify left cards and chat into one frame */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex-1 flex rounded-[32px] bg-gradient-to-br ${
          getCategoryStyle(activeCat).frameSurfaceGradient
        } backdrop-blur-xl border border-white/30 shadow-2xl shadow-indigo-100/50 overflow-hidden z-10`}
      >
        <ForumSidebar
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filtered={filtered}
          loading={loading}
          error={error}
          selectedTopicId={selectedTopicId}
          setSelectedTopicId={setSelectedTopicId}
        />
        <ForumChatFrame
          account={account}
          currentTopic={currentTopic}
          activeCat={activeCat}
          displayName={displayName}
          loading={loading}
          error={error}
        />
      </motion.div>
    </div>
  );
}
