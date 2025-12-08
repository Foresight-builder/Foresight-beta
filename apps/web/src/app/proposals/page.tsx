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
  MessageCircle,
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
      {/* Background Gradients from Flags Page */}
      <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50/40 via-purple-50/40 to-pink-50/40 -z-20" />

      {/* Animated Orbs */}
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-purple-200/30 rounded-full blur-[100px] -z-10"
      />
      <motion.div
        animate={{
          x: [0, -30, 0],
          y: [0, 40, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="fixed top-[10%] right-[-5%] w-[35vw] h-[35vw] bg-blue-200/20 rounded-full blur-[100px] -z-10"
      />

      <div className="max-w-[1440px] mx-auto px-6 py-12 relative z-0">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2 flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                Proposals
              </span>
            </h1>
            <p className="text-gray-400 font-medium text-sm leading-relaxed">
              Shape the future of Foresight. Vote on ideas that matter.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-3 rounded-full bg-gray-900 text-white font-bold shadow-lg shadow-gray-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            <Plus className="w-5 h-5" />
            New Proposal
          </button>
        </div>

        {/* Navigation & Filters Bar (Unified) */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8 sticky top-4 z-30">
          {/* Categories (Horizontal Scrollable) */}
          <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-white/60 flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  category === cat.id
                    ? "bg-gray-100 text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort Filters */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-white/60 flex gap-1 shrink-0">
            {[
              { id: "hot", label: "Hot", icon: Flame },
              { id: "new", label: "New", icon: Clock },
              { id: "top", label: "Top", icon: Trophy },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                  filter === f.id
                    ? "bg-gray-100 text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                <f.icon
                  className={`w-4 h-4 ${
                    filter === f.id ? "text-purple-500" : ""
                  }`}
                />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  <p className="font-medium text-sm">Loading ideas...</p>
                </div>
              ) : sortedProposals.length > 0 ? (
                sortedProposals.map((proposal: any) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onVote={(id, type) => voteMutation.mutate({ id, type })}
                    onClick={(id) => {}}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-20 text-center"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No proposals found
                  </h3>
                  <p className="text-gray-500">
                    Be the first to propose something in this category!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Widgets */}
          <div className="space-y-6">
            {/* Inspiration Widget - Improved */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-bl-[4rem] opacity-50 -mr-8 -mt-8" />

              <div className="flex items-center gap-2 mb-4 relative">
                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Inspiration</h3>
              </div>

              <div className="relative min-h-[4rem] flex items-center justify-center text-center px-2 mb-4">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={inspiration}
                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                    className="text-base font-bold text-gray-800 leading-snug"
                  >
                    "{inspiration}"
                  </motion.p>
                </AnimatePresence>
              </div>

              <button
                onClick={rollInspiration}
                disabled={isRolling}
                className="w-full py-2.5 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Dices
                  className={`w-3 h-3 ${isRolling ? "animate-spin" : ""}`}
                />
                {isRolling ? "Rolling..." : "Roll Dice"}
              </button>
            </div>

            {/* Trending Tags - Improved */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Trending</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {["#Bitcoin", "#AI", "#SpaceX", "#Apple", "#Tesla"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-lg bg-gray-50 border border-transparent text-xs font-bold text-gray-600 hover:bg-white hover:border-purple-200 hover:text-purple-600 cursor-pointer transition-all"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateProposalModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["proposals"] });
          setFilter("new");
        }}
      />
    </div>
  );
}
