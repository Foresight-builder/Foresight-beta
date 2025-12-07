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

  const activeCat = normalizeCategory(currentTopic?.category);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "体育":
        return "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200";
      case "娱乐":
        return "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200";
      case "时政":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200";
      case "天气":
        return "bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200";
      case "科技":
        return "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
    }
  };

  const getCategoryActiveColor = (cat: string) => {
    switch (cat) {
      case "体育":
        return "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-200 shadow-md border-transparent";
      case "娱乐":
        return "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-200 shadow-md border-transparent";
      case "时政":
        return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-200 shadow-md border-transparent";
      case "天气":
        return "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-200 shadow-md border-transparent";
      case "科技":
        return "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-violet-200 shadow-md border-transparent";
      default:
        return "bg-gradient-to-r from-violet-400 to-fuchsia-400 text-white shadow-purple-200 shadow-md border-transparent";
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case "体育":
        return "bg-orange-200 text-orange-800";
      case "娱乐":
        return "bg-pink-200 text-pink-800";
      case "时政":
        return "bg-emerald-200 text-emerald-800";
      case "天气":
        return "bg-cyan-200 text-cyan-800";
      case "科技":
        return "bg-violet-200 text-violet-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const getCategoryBorder = (cat: string) => {
    switch (cat) {
      case "体育":
        return "border-orange-200 hover:border-orange-300";
      case "娱乐":
        return "border-pink-200 hover:border-pink-300";
      case "时政":
        return "border-emerald-200 hover:border-emerald-300";
      case "天气":
        return "border-cyan-200 hover:border-cyan-300";
      case "科技":
        return "border-violet-200 hover:border-violet-300";
      default:
        return "border-slate-200 hover:border-slate-300";
    }
  };

  const getCategorySoftBg = (cat: string) => {
    switch (cat) {
      case "体育":
        return "bg-gradient-to-br from-orange-100/60 to-white/0";
      case "娱乐":
        return "bg-gradient-to-br from-pink-100/60 to-white/0";
      case "时政":
        return "bg-gradient-to-br from-emerald-100/60 to-white/0";
      case "天气":
        return "bg-gradient-to-br from-cyan-100/60 to-white/0";
      case "科技":
        return "bg-gradient-to-br from-violet-100/60 to-white/0";
      default:
        return "bg-gradient-to-br from-slate-100/60 to-white/0";
    }
  };

  const getCategoryAccentText = (cat: string) => {
    switch (cat) {
      case "体育":
        return "text-orange-600";
      case "娱乐":
        return "text-pink-600";
      case "时政":
        return "text-emerald-600";
      case "天气":
        return "text-cyan-600";
      case "科技":
        return "text-violet-600";
      default:
        return "text-slate-600";
    }
  };

  const getCategoryActiveCardStyle = (cat: string) => {
    switch (cat) {
      case "体育":
        return "bg-orange-50/90 border-orange-200 shadow-md shadow-orange-100/50 scale-[1.02]";
      case "娱乐":
        return "bg-pink-50/90 border-pink-200 shadow-md shadow-pink-100/50 scale-[1.02]";
      case "时政":
        return "bg-emerald-50/90 border-emerald-200 shadow-md shadow-emerald-100/50 scale-[1.02]";
      case "天气":
        return "bg-cyan-50/90 border-cyan-200 shadow-md shadow-cyan-100/50 scale-[1.02]";
      case "科技":
        return "bg-violet-50/90 border-violet-200 shadow-md shadow-violet-100/50 scale-[1.02]";
      default:
        return "bg-indigo-50/90 border-indigo-200 shadow-md shadow-indigo-100/50 scale-[1.02]";
    }
  };

  const getCategoryAccentBarBg = (cat: string) => {
    switch (cat) {
      case "体育":
        return "bg-orange-500";
      case "娱乐":
        return "bg-pink-500";
      case "时政":
        return "bg-emerald-500";
      case "天气":
        return "bg-cyan-500";
      case "科技":
        return "bg-violet-500";
      default:
        return "bg-indigo-500";
    }
  };

  const getChatFrameGradient = (cat: string) => {
    switch (cat) {
      case "体育":
        return "from-orange-400 via-amber-300 to-orange-100";
      case "娱乐":
        return "from-pink-400 via-rose-300 to-pink-100";
      case "时政":
        return "from-emerald-400 via-teal-300 to-emerald-100";
      case "天气":
        return "from-cyan-400 via-blue-300 to-cyan-100";
      case "科技":
        return "from-[#c084fc] via-[#d8b4fe] to-[#f3e8ff]";
      default:
        return "from-indigo-400 via-purple-300 to-indigo-100";
    }
  };

  const getStrongHeaderGradient = (cat: string) => {
    switch (cat) {
      case "体育":
        return "from-orange-500/90 to-amber-600/90";
      case "娱乐":
        return "from-pink-500/90 to-rose-600/90";
      case "时政":
        return "from-emerald-500/90 to-teal-600/90";
      case "天气":
        return "from-cyan-500/90 to-blue-600/90";
      case "科技":
        return "from-violet-500/90 to-purple-600/90";
      default:
        return "from-indigo-500/90 to-purple-600/90";
    }
  };

  const getFrameSurfaceGradient = (cat: string) => {
    switch (cat) {
      case "体育":
        return "from-orange-100/70 via-amber-100/60 to-white/0";
      case "娱乐":
        return "from-pink-100/70 via-rose-100/60 to-white/0";
      case "时政":
        return "from-emerald-100/70 via-teal-100/60 to-white/0";
      case "天气":
        return "from-cyan-100/70 via-blue-100/60 to-white/0";
      case "科技":
        return "from-violet-100/70 via-purple-100/60 to-white/0";
      default:
        return "from-indigo-100/70 via-purple-100/60 to-white/0";
    }
  };

  return (
    <div className="h-screen w-full bg-[#f0f4f9] p-4 lg:p-6 flex overflow-hidden overflow-x-hidden font-sans text-slate-800 relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-200/30 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200/30 blur-[100px]" />
      </div>
      {/* TV Frame: unify left cards and chat into one frame */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex-1 flex rounded-[32px] bg-gradient-to-br ${getFrameSurfaceGradient(
          activeCat
        )} backdrop-blur-xl border border-white/60 shadow-2xl shadow-indigo-100/50 overflow-hidden z-10`}
      >
        {/* LEFT PANEL */}
        <div className="w-80 flex-shrink-0 border-r border-white/30 flex flex-col overflow-x-hidden">
          <div className="p-4 border-b border-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-8 h-8 bg-gradient-to-r ${getStrongHeaderGradient(
                  activeCat
                )} rounded-lg flex items-center justify-center text-white shadow-md`}
              >
                <MessageSquare size={16} fill="currentColor" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">
                  Forum
                </h2>
                <p className="text-[11px] text-slate-500">
                  Community Discussions
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 border ${
                    activeCategory === cat.id
                      ? getCategoryActiveColor(cat.name)
                      : getCategoryColor(cat.name)
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="relative group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Search topics..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900/5 border border-slate-200/50 rounded-xl text-sm focus:ring-2 focus:ring-slate-200 focus:bg-white/50 transition-all outline-none placeholder:text-slate-400 text-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 custom-scrollbar">
            {filtered.map((topic) => {
              const catName = normalizeCategory(topic.category);
              const isActive = selectedTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 border group relative overflow-hidden ${getCategorySoftBg(
                    catName
                  )} ${
                    isActive
                      ? getCategoryActiveCardStyle(catName)
                      : `border-transparent hover:ring-1 hover:ring-white/40 hover:shadow-sm ${getCategoryBorder(
                          catName
                        )}`
                  }`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${getCategoryAccentBarBg(
                      catName
                    )} ${isActive ? "" : "opacity-40"}`}
                  />
                  <div className="flex justify-between items-start mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getCategoryBadgeColor(
                        catName
                      )}`}
                    >
                      {catName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {topic.created_at
                        ? new Date(topic.created_at).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  <h3
                    className={`text-sm font-bold leading-snug mb-2 text-slate-700 group-hover:text-slate-900 line-clamp-2`}
                  >
                    {topic.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {topic.followers_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp
                        size={12}
                        className={getCategoryAccentText(catName)}
                      />{" "}
                      {catName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col">
          {/* Chat Content inside frame */}
          <div className="flex-1 relative px-4 py-4 overflow-x-hidden bg-transparent">
            <div
              className={`relative h-full rounded-3xl border border-white/50 shadow-sm overflow-hidden`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${getChatFrameGradient(
                  activeCat
                )}`}
              />
              <div className="absolute inset-0 flex flex-col z-10">
                {currentTopic?.id ? (
                  <ChatPanel
                    eventId={currentTopic.id}
                    roomTitle={currentTopic.title}
                    roomCategory={activeCat}
                    followersCount={currentTopic.followers_count ?? 0}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
