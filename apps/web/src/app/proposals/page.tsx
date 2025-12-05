"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  TrendingUp,
  Clock,
  Flame,
  Zap,
  Loader2,
  MoreHorizontal,
  Shield,
  Sparkles,
  Trophy,
  ImageIcon,
  LinkIcon,
  Tag,
  Dices,
  Wand2,
} from "lucide-react";
import ProposalCard from "./ProposalCard";
import CreateProposalModal from "./CreateProposalModal";
import { useWallet } from "@/contexts/WalletContext";

// Fetch proposals (threads with eventId=0)
const fetchProposals = async () => {
  const res = await fetch("/api/forum?eventId=0");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.threads || [];
};

const INSPIRATIONS = [
  "Will AI achieve AGI by 2026?",
  "Will humans land on Mars before 2030?",
  "Is Bitcoin hitting $100k this year?",
  "Who wins the next World Cup?",
  "Will Apple release a folding iPhone?",
  "Is TikTok getting banned in US?",
  "Next big crypto airdrop?",
  "Will GTA 6 be delayed?",
];

export default function ProposalsPage() {
  const [filter, setFilter] = useState<"hot" | "new" | "top">("hot");
  const [category, setCategory] = useState("All");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const { account, connectWallet } = useWallet();
  const queryClient = useQueryClient();

  // Inspiration Widget State
  const [inspiration, setInspiration] = useState(INSPIRATIONS[0]);
  const [isRolling, setIsRolling] = useState(false);

  const rollInspiration = () => {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setInspiration(
        INSPIRATIONS[Math.floor(Math.random() * INSPIRATIONS.length)]
      );
      count++;
      if (count > 10) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 50);
  };

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: fetchProposals,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: "up" | "down" }) => {
      if (!account) {
        connectWallet();
        throw new Error("Please connect wallet");
      }
      const res = await fetch("/api/forum/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: 0,
          type: "thread",
          id,
          dir: type,
          walletAddress: account,
        }),
      });
      if (!res.ok) throw new Error("Vote failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  const filteredProposals = proposals.filter(
    (p: any) => category === "All" || p.category === category
  );

  const sortedProposals = [...filteredProposals].sort((a: any, b: any) => {
    if (filter === "hot") {
      const scoreA =
        (a.upvotes || 0) - (a.downvotes || 0) + (a.comments?.length || 0) * 2;
      const scoreB =
        (b.upvotes || 0) - (b.downvotes || 0) + (b.comments?.length || 0) * 2;
      return scoreB - scoreA;
    }
    if (filter === "new") {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    if (filter === "top") {
      return (
        (b.upvotes || 0) -
        (b.downvotes || 0) -
        ((a.upvotes || 0) - (a.downvotes || 0))
      );
    }
    return 0;
  });

  const categories = [
    {
      id: "All",
      label: "All Topics",
      icon: "🌈",
      color: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700",
    },
    {
      id: "Tech",
      label: "Technology",
      icon: "💻",
      color: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700",
    },
    {
      id: "Crypto",
      label: "Crypto",
      icon: "💰",
      color: "bg-gradient-to-r from-amber-100 to-orange-100 text-orange-700",
    },
    {
      id: "Politics",
      label: "Politics",
      icon: "⚖️",
      color: "bg-gradient-to-r from-red-100 to-rose-100 text-red-700",
    },
    {
      id: "Sports",
      label: "Sports",
      icon: "⚽",
      color: "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700",
    },
    {
      id: "Fun",
      label: "Just for Fun",
      icon: "🎉",
      color: "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-800 font-sans relative overflow-hidden">
      {/* Vivid Moving Background - Super Bright & Radiant */}
      <div className="fixed inset-0 -z-20 bg-white" />

      {/* Animated Color Orbs - Maximum Brightness & Saturation */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-10%] left-[-10%] w-[90vw] h-[90vw] bg-purple-400/50 rounded-full blur-[100px] -z-10"
      />
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="fixed top-[-10%] right-[-10%] w-[90vw] h-[90vw] bg-cyan-300/50 rounded-full blur-[100px] -z-10"
      />
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
        className="fixed bottom-[-20%] left-[20%] w-[90vw] h-[90vw] bg-pink-300/50 rounded-full blur-[100px] -z-10"
      />
      <motion.div
        animate={{
          x: [0, -50, 0],
          y: [0, -100, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 8,
        }}
        className="fixed bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-yellow-200/60 rounded-full blur-[100px] -z-10"
      />

      {/* Noise Overlay for Texture */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none -z-10" />

      <div className="max-w-[1200px] mx-auto px-4 py-12 relative z-10">
        {/* Page Header */}
        <div className="mb-10 text-center md:text-left relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block"
          >
            <h1 className="text-5xl font-black mb-3 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 animate-gradient-x drop-shadow-sm">
                Community Proposals
              </span>
            </h1>
            <p className="text-xl text-gray-700 font-bold max-w-2xl leading-relaxed">
              Pitch your wildest predictions, vote on the future, and create the
              markets you want to see.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Category Pills - More Vibrant */}
            <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {categories.map((cat) => (
                <motion.button
                  key={cat.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all shadow-sm border-2 ${
                    category === cat.id
                      ? "bg-gray-900 text-white border-gray-900 scale-105 shadow-lg shadow-purple-500/20"
                      : `bg-white/70 backdrop-blur-md border-white/40 text-gray-800 hover:bg-white hover:shadow-md hover:border-purple-300`
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  {cat.label}
                </motion.button>
              ))}
            </div>

            {/* Create Post Trigger - More Pop */}
            <motion.div
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-4 pr-6 flex items-center gap-4 shadow-xl shadow-purple-500/10 border-2 border-white/60 cursor-pointer group relative overflow-hidden"
              onClick={() => setCreateModalOpen(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-100/60 via-pink-100/60 to-orange-100/60 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform ring-4 ring-white/50">
                <Plus className="w-7 h-7 text-white" />
              </div>

              <div className="relative flex-1">
                <input
                  readOnly
                  placeholder="Create a new proposal..."
                  className="w-full bg-transparent text-xl font-bold text-gray-800 placeholder:text-gray-500 outline-none cursor-pointer"
                />
              </div>

              <div className="relative flex gap-3 opacity-70 group-hover:opacity-100 transition-opacity">
                <div className="p-2 bg-green-100 rounded-xl text-green-700">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="p-2 bg-blue-100 rounded-xl text-blue-700">
                  <LinkIcon className="w-5 h-5" />
                </div>
              </div>
            </motion.div>

            {/* Filters */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md p-1.5 rounded-full border border-white/50 shadow-sm">
                {[
                  {
                    id: "hot",
                    label: "Hot",
                    icon: Flame,
                    activeColor:
                      "text-orange-600 bg-orange-100/50 shadow-sm border border-orange-200",
                  },
                  {
                    id: "new",
                    label: "New",
                    icon: Clock,
                    activeColor:
                      "text-blue-600 bg-blue-100/50 shadow-sm border border-blue-200",
                  },
                  {
                    id: "top",
                    label: "Top",
                    icon: Trophy,
                    activeColor:
                      "text-yellow-700 bg-yellow-100/50 shadow-sm border border-yellow-200",
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id as any)}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                      filter === tab.id
                        ? `${tab.activeColor}`
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                    }`}
                  >
                    <tab.icon
                      className={`w-4 h-4 ${
                        filter === tab.id ? "fill-current" : ""
                      }`}
                    />
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="text-sm font-bold text-gray-600 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 shadow-sm">
                {sortedProposals.length} proposals
              </div>
            </div>

            {/* Posts List */}
            <div className="space-y-6 min-h-[50vh]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                  <p className="text-indigo-500 font-bold text-lg animate-pulse">
                    Summoning ideas...
                  </p>
                </div>
              ) : sortedProposals.length > 0 ? (
                sortedProposals.map((proposal: any, i: number) => (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: i * 0.05,
                      type: "spring",
                      stiffness: 100,
                    }}
                  >
                    <ProposalCard
                      proposal={proposal}
                      onVote={(id, type) => voteMutation.mutate({ id, type })}
                      onClick={(id) => console.log("Navigate to", id)}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="bg-white/70 backdrop-blur-md border-2 border-dashed border-indigo-300/50 rounded-[2.5rem] p-16 text-center shadow-sm">
                  <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Sparkles className="w-10 h-10 text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">
                    No proposals found
                  </h3>
                  <p className="text-gray-600 mb-8 font-medium">
                    Be the first to post in{" "}
                    {category === "All" ? "the community" : category}!
                  </p>
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="px-8 py-4 bg-gray-900 text-white rounded-full font-bold hover:scale-105 transition-all inline-flex items-center gap-2 shadow-xl shadow-gray-900/20"
                  >
                    <Plus className="w-5 h-5" /> Create Proposal
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Widgets */}
          <div className="hidden lg:block space-y-6 sticky top-24 self-start">
            {/* Magic Inspiration Widget - More Vibrant */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-purple-500/40 relative overflow-hidden group">
              {/* Animated Background Shapes */}
              <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-yellow-300/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-[-10%] left-[-10%] w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
                    <Wand2 className="w-6 h-6 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl tracking-tight">
                      Daily Oracle
                    </h3>
                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
                      Inspiration
                    </p>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-md rounded-[1.5rem] p-6 mb-6 border border-white/10 min-h-[120px] flex items-center justify-center text-center shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <p
                    className={`text-xl font-bold leading-snug transition-all duration-200 ${
                      isRolling
                        ? "blur-sm scale-95 opacity-50"
                        : "scale-100 opacity-100"
                    }`}
                  >
                    "{inspiration}"
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={rollInspiration}
                    disabled={isRolling}
                    className="flex-1 py-3.5 bg-white text-indigo-700 rounded-2xl font-black text-sm hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Dices
                      className={`w-5 h-5 ${isRolling ? "animate-spin" : ""}`}
                    />
                    Roll Dice
                  </button>
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="px-5 py-3.5 bg-white/20 text-white rounded-2xl font-bold text-sm hover:bg-white/30 transition-colors border border-white/20 backdrop-blur-sm"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Trending Topics - Cleaner & Brighter */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100/40 border border-white/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-black text-xl text-gray-900">Trending</h3>
              </div>
              <div className="space-y-4">
                {[
                  { tag: "Bitcoin ETF", count: "2.4k", trend: "+12%" },
                  { tag: "US Election", count: "1.8k", trend: "+8%" },
                  { tag: "SpaceX", count: "956", trend: "+5%" },
                  { tag: "AI Regulation", count: "542", trend: "+2%" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between group cursor-pointer hover:bg-blue-50/50 p-3 rounded-2xl transition-all -mx-3 border border-transparent hover:border-blue-100 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-gray-300 w-4">
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                          {item.tag}
                        </div>
                        <div className="text-xs font-bold text-green-500">
                          {item.trend} this week
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                      {item.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules - Softer Blue */}
            <div className="bg-gradient-to-br from-blue-50/90 to-cyan-50/90 backdrop-blur-xl rounded-[2.5rem] p-8 border border-blue-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white rounded-xl text-blue-500 shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-black text-xl text-blue-900">
                  House Rules
                </h3>
              </div>
              <ul className="space-y-4">
                {[
                  { text: "Be respectful", icon: "🤝" },
                  { text: "No spam", icon: "🚫" },
                  { text: "Cite sources", icon: "📚" },
                ].map((rule, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-4 text-sm font-bold text-blue-800/80 bg-white/60 p-3 rounded-xl border border-white/50 hover:bg-white/80 transition-colors"
                  >
                    <span className="text-lg">{rule.icon}</span>
                    {rule.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <CreateProposalModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["proposals"] })
        }
      />
    </div>
  );
}
