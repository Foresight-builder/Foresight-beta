"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  TrendingUp,
  Users,
  Search,
  Filter,
  Hash,
  MoreHorizontal,
  ArrowUpRight,
  Activity,
  BarChart3,
  MessageCircle,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import ChatPanel from "@/components/ChatPanel";

type PredictionItem = {
  id: number;
  title: string;
  description?: string;
  category?: string;
  created_at?: string;
  followers_count?: number;
};

const ALLOWED_CATEGORIES = ["体育", "娱乐", "时政", "天气", "科技"] as const;
const CATEGORIES = [{ id: "all", name: "All Topics", icon: Globe }].concat(
  ALLOWED_CATEGORIES.map((c) => ({ id: c, name: c, icon: Activity }))
);

function normalizeCategory(raw?: string): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return "科技";
  if (["tech", "technology", "ai", "人工智能", "机器人", "科技"].includes(s))
    return "科技";
  if (["entertainment", "media", "娱乐", "综艺", "影视"].includes(s))
    return "娱乐";
  if (
    [
      "politics",
      "时政",
      "政治",
      "news",
      "国际",
      "finance",
      "经济",
      "宏观",
      "market",
      "stocks",
    ].includes(s)
  )
    return "时政";
  if (["weather", "气象", "天气", "climate", "气候"].includes(s)) return "天气";
  if (["sports", "体育", "football", "soccer", "basketball", "nba"].includes(s))
    return "体育";
  return "科技";
}

export default function ForumPage() {
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/predictions?includeOutcomes=0");
        const data = await res.json();
        const list: PredictionItem[] = Array.isArray(data?.data)
          ? data.data
          : [];
        if (!cancelled) {
          setPredictions(list);
          setSelectedTopicId((prev) => prev ?? list[0]?.id ?? null);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = CATEGORIES;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return predictions.filter((p) => {
      const cat = normalizeCategory(p.category);
      const catOk = activeCategory === "all" || cat === activeCategory;
      const qOk =
        !q ||
        String(p.title || "")
          .toLowerCase()
          .includes(q);
      return catOk && qOk;
    });
  }, [predictions, activeCategory, searchQuery]);

  const currentTopic = useMemo(() => {
    const id = selectedTopicId;
    if (!id && filtered.length) return filtered[0];
    return predictions.find((p) => p.id === id) || filtered[0] || null;
  }, [predictions, filtered, selectedTopicId]);

  return (
    <div className="h-screen w-full bg-white p-4 lg:p-6 flex gap-6 overflow-hidden font-sans text-slate-800">
      {/* LEFT COLUMN: Navigation & Topic List */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 flex-shrink-0 flex flex-col gap-4"
      >
        {/* Brand / Header Area */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <MessageSquare size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">
                Forum
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Community Discussions
              </p>
            </div>
          </div>

          {/* Category Nav */}
          <nav className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-purple-50 hover:text-purple-700"
                }`}
              >
                <cat.icon size={18} />
                {cat.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Search & Topic List */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search topics..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-purple-100 transition-all outline-none placeholder:text-gray-400 text-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filtered.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 border ${
                  selectedTopicId === topic.id
                    ? "bg-purple-50/50 border-purple-100 shadow-sm"
                    : "bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-50"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedTopicId === topic.id
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {normalizeCategory(topic.category)}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {topic.created_at
                      ? new Date(topic.created_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>
                <h3
                  className={`text-sm font-semibold leading-snug mb-2 ${
                    selectedTopicId === topic.id
                      ? "text-purple-900"
                      : "text-slate-700"
                  }`}
                >
                  {topic.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {topic.followers_count ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} className="text-purple-500" />{" "}
                    {normalizeCategory(topic.category)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* RIGHT COLUMN: Main Chat Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative"
      >
        {/* Header with Integrated Stats */}
        <header className="h-16 px-6 border-b border-gray-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex flex-col min-w-0">
              <h2 className="font-bold text-slate-900 truncate">
                {currentTopic?.title || ""}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1 text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
                <span>•</span>
                <span>ID: #{currentTopic?.id ?? "-"}</span>
              </div>
            </div>
          </div>

          {/* Key Metrics integrated into Header */}
          <div className="flex items-center gap-6">
            {/* Followers Stat */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Followers
              </span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                <Users size={14} className="text-purple-500" />
                {currentTopic?.followers_count ?? 0}
              </span>
            </div>

            <div className="w-px h-8 bg-gray-100" />

            {/* Category Stat */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Category
              </span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                <TrendingUp size={14} className="text-purple-500" />
                {normalizeCategory(currentTopic?.category)}
              </span>
            </div>

            <div className="w-px h-8 bg-gray-100" />

            <button className="p-2 text-gray-400 hover:text-slate-700 hover:bg-gray-50 rounded-lg transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </header>

        {/* Chat Content */}
        <div className="flex-1 relative bg-white/50">
          {/* Using the existing ChatPanel component but we might need to wrap it to fit fully */}
          <div className="absolute inset-0 flex flex-col">
            {currentTopic?.id ? (
              <ChatPanel
                eventId={currentTopic.id}
                roomTitle={currentTopic.title}
                roomCategory={currentTopic.category}
                minHeightVh={88}
              />
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
