"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Hash,
  Users,
  TrendingUp,
  Clock,
  Zap,
  MessageCircle,
  MoreHorizontal,
  Activity,
  BarChart3,
  Shield,
  Info,
  Menu,
  Loader2,
} from "lucide-react";

interface EventData {
  id: number;
  title: string;
  category?: string;
  status?: string;
  followers_count?: number;
  end_date?: string;
  image_url?: string;
}

export default function ForumPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState<string>("");
  const [isSidebarOpen, setSidebarOpen] = useState(true); // Mobile toggle

  const searchParams = useSearchParams();

  // Fetch Events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/predictions");
        const json = await res.json();
        const list: any[] = Array.isArray(json?.data) ? json.data : [];
        const mapped = list
          .filter((x) => Number.isFinite(Number(x?.id)))
          .map((x) => ({
            id: Number(x.id),
            title: String(x.title || `Event #${x.id}`),
            category: String(x.category || "General"),
            status: String(x.status || "active"),
            followers_count: Number(x.followers_count || 0),
            end_date: x.end_date,
            image_url: x.image_url,
          }));
        setEvents(mapped);
        if (!selectedId && mapped.length > 0) setSelectedId(mapped[0].id);
      } catch (e) {
        console.error("Failed to fetch events", e);
      }
    };
    fetchEvents();
  }, []);

  // Handle URL params
  useEffect(() => {
    const idStr = searchParams?.get("id");
    const idNum = Number(idStr);
    if (Number.isFinite(idNum) && idNum > 0) {
      setSelectedId(idNum);
    }
  }, [searchParams, events.length]);

  const activeEvent = events.find((e) => e.id === selectedId) || events[0];
  const activeId = activeEvent?.id || 0;

  // Category Styles
  const getCategoryStyle = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("tech"))
      return { bg: "bg-blue-100", text: "text-blue-600", icon: "💻" };
    if (c.includes("crypto"))
      return { bg: "bg-orange-100", text: "text-orange-600", icon: "💰" };
    if (c.includes("sport"))
      return { bg: "bg-green-100", text: "text-green-600", icon: "⚽" };
    if (c.includes("politic"))
      return { bg: "bg-red-100", text: "text-red-600", icon: "⚖️" };
    if (c.includes("entertainment"))
      return { bg: "bg-pink-100", text: "text-pink-600", icon: "🎬" };
    return { bg: "bg-purple-100", text: "text-purple-600", icon: "✨" };
  };

  // Filtered Events
  const filteredEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes(q.toLowerCase()) ||
      e.category?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#F0F2F5] text-gray-800 font-sans overflow-hidden relative flex">
      {/* Vivid Background */}
      <div className="fixed inset-0 -z-20 bg-white" />
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-blue-400/30 rounded-full blur-[100px] -z-10"
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="fixed bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-purple-400/30 rounded-full blur-[100px] -z-10"
      />

      {/* Left Sidebar - Channels */}
      <div
        className={`w-80 bg-white/80 backdrop-blur-xl border-r border-white/50 flex flex-col transition-all duration-300 absolute md:relative z-20 h-full ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <MessageCircle className="w-6 h-6 fill-current" />
            </div>
            <h1 className="font-black text-xl tracking-tight text-gray-900">
              Forum
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search channels..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
          <div className="px-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Active Channels
          </div>
          {filteredEvents.map((event) => {
            const style = getCategoryStyle(event.category || "");
            const isActive = selectedId === event.id;
            return (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedId(event.id);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`w-full text-left p-3 rounded-2xl transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md shadow-blue-500/20"
                    : "hover:bg-white hover:shadow-sm text-gray-700"
                }`}
              >
                <div className="flex items-start gap-3 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      isActive ? "bg-white/20 text-white" : style.bg
                    }`}
                  >
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-bold text-sm truncate ${
                        isActive ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {event.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs truncate ${
                          isActive ? "text-blue-100" : "text-gray-400"
                        }`}
                      >
                        {event.category}
                      </span>
                      {event.status === "active" && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* User Stats Footer */}
        <div className="p-4 border-t border-gray-100/50 bg-gray-50/50 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {events.length} Channels
            </div>
            <div>v1.0</div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Chat Header */}
        <header className="h-20 bg-white/60 backdrop-blur-md border-b border-white/50 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl shadow-inner">
              {activeEvent
                ? getCategoryStyle(activeEvent.category || "").icon
                : "💬"}
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-lg text-gray-900 truncate flex items-center gap-2">
                {activeEvent?.title}
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded-full uppercase tracking-wider">
                  Beta
                </span>
              </h2>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />{" "}
                  {activeEvent?.followers_count || 0} Members
                </span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="text-green-600 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> High Activity
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2.5 bg-white hover:bg-gray-50 text-gray-400 hover:text-blue-500 rounded-xl border border-gray-200 transition-colors shadow-sm">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2.5 bg-white hover:bg-gray-50 text-gray-400 hover:text-purple-500 rounded-xl border border-gray-200 transition-colors shadow-sm">
              <Info className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Chat Content */}
        <main className="flex-1 overflow-hidden relative flex">
          <div className="flex-1 flex flex-col min-w-0 bg-white/30 backdrop-blur-sm">
            {activeId ? (
              <ChatPanel
                key={activeId}
                eventId={activeId}
                roomTitle={activeEvent?.title}
                roomCategory={activeEvent?.category}
                isProposalRoom={false}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Loading Channel...</p>
              </div>
            )}
          </div>

          {/* Right Sidebar - Market Intel (Desktop Only) */}
          <div className="w-80 bg-white/60 backdrop-blur-xl border-l border-white/50 hidden xl:flex flex-col p-6 gap-6 overflow-y-auto">
            {/* Market Sentiment Widget */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2rem] p-6 text-white shadow-xl shadow-gray-900/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 opacity-80">
                  <BarChart3 className="w-5 h-5" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">
                    Market Sentiment
                  </h3>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-black text-green-400">
                    68%
                  </span>
                  <span className="text-sm font-bold text-green-400 mb-1">
                    Bullish
                  </span>
                </div>

                {/* Sentiment Bar */}
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                  <div className="w-[68%] bg-gradient-to-r from-green-400 to-emerald-500" />
                  <div className="flex-1 bg-red-500/50" />
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400">
                  <span>Bullish</span>
                  <span>Bearish</span>
                </div>
              </div>
            </div>

            {/* Active Participants */}
            <div className="bg-white/80 rounded-[2rem] p-6 border border-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-gray-900">Live Traders</h3>
                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {Math.floor(Math.random() * 50) + 10} Online
                </span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-white shadow-sm" />
                    <div className="flex-1">
                      <div className="h-2.5 w-24 bg-gray-200 rounded-full mb-1" />
                      <div className="h-2 w-16 bg-gray-100 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                  Total Volume
                </div>
                <div className="text-xl font-black text-blue-900">$124,592</div>
              </div>
              <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                  Prediction End
                </div>
                <div className="text-lg font-black text-purple-900 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {activeEvent?.end_date
                    ? new Date(activeEvent.end_date).toLocaleDateString()
                    : "TBA"}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
