"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Medal,
  TrendingUp,
  Users,
  Crown,
  ArrowUpRight,
  Sparkles,
  Timer,
  Calendar,
} from "lucide-react";

// Enhanced Mock Data
const leaderboardData = [
  {
    rank: 1,
    name: "YangZ",
    profit: "+8,240",
    winRate: "82%",
    trades: 142,
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=YangZ&backgroundColor=FFD700",
    badge: "🏆 预测之神",
    trend: "+12%",
  },
  {
    rank: 2,
    name: "lkbhua24",
    profit: "+5,120",
    winRate: "75%",
    trades: 98,
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=lkbhua24&backgroundColor=C0C0C0",
    badge: "🥈 策略大师",
    trend: "+8%",
  },
  {
    rank: 3,
    name: "Dave_DeFi",
    profit: "+3,450",
    winRate: "68%",
    trades: 112,
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Dave_DeFi&backgroundColor=CD7F32",
    badge: "🥉 交易新星",
    trend: "+15%",
  },
  {
    rank: 4,
    name: "Eve_NFT",
    profit: "+2,890",
    winRate: "65%",
    trades: 87,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve_NFT",
    trend: "+5%",
  },
  {
    rank: 5,
    name: "Frank_Whale",
    profit: "+1,920",
    winRate: "59%",
    trades: 65,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Frank_Whale",
    trend: "-2%",
  },
  {
    rank: 6,
    name: "Grace_Yield",
    profit: "+1,240",
    winRate: "62%",
    trades: 45,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Grace_Yield",
    trend: "+3%",
  },
  {
    rank: 7,
    name: "Helen_Stake",
    profit: "+980",
    winRate: "55%",
    trades: 32,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Helen_Stake",
    trend: "+1%",
  },
  {
    rank: 8,
    name: "Ivan_Invest",
    profit: "+850",
    winRate: "51%",
    trades: 28,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ivan_Invest",
    trend: "+4%",
  },
  {
    rank: 9,
    name: "Jack_Trade",
    profit: "+720",
    winRate: "48%",
    trades: 22,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack_Trade",
    trend: "0%",
  },
  {
    rank: 10,
    name: "Kate_Hold",
    profit: "+540",
    winRate: "45%",
    trades: 18,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kate_Hold",
    trend: "-1%",
  },
];

const TopThreeCard = ({ user }: { user: any }) => {
  const isFirst = user.rank === 1;
  const isSecond = user.rank === 2;
  const isThird = user.rank === 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: user.rank * 0.1 }}
      className={`relative flex flex-col items-center p-6 rounded-[2rem] backdrop-blur-md border border-white/40 shadow-xl
        ${
          isFirst
            ? "bg-gradient-to-b from-yellow-100/80 to-white/60 order-2 -mt-8 z-20 w-full md:w-1/3 shadow-yellow-500/20 ring-1 ring-yellow-200"
            : isSecond
            ? "bg-gradient-to-b from-gray-100/80 to-white/60 order-1 mt-4 z-10 w-full md:w-[30%] shadow-gray-500/20"
            : "bg-gradient-to-b from-orange-100/80 to-white/60 order-3 mt-8 z-10 w-full md:w-[30%] shadow-orange-500/20"
        }
      `}
    >
      {/* Crown for #1 */}
      {isFirst && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
          <Crown className="w-12 h-12 text-yellow-500 drop-shadow-lg fill-yellow-200 animate-bounce" />
        </div>
      )}

      {/* Rank Badge */}
      <div
        className={`
        absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border-2
        ${isFirst ? "bg-yellow-400 border-yellow-200 text-yellow-900" : ""}
        ${isSecond ? "bg-gray-300 border-gray-200 text-gray-800" : ""}
        ${isThird ? "bg-orange-300 border-orange-200 text-orange-900" : ""}
      `}
      >
        {user.rank}
      </div>

      {/* Avatar */}
      <div className="relative mb-4">
        <div
          className={`
          p-1 rounded-full border-4 
          ${isFirst ? "border-yellow-400 shadow-lg shadow-yellow-200" : ""}
          ${isSecond ? "border-gray-300 shadow-lg shadow-gray-200" : ""}
          ${isThird ? "border-orange-300 shadow-lg shadow-orange-200" : ""}
        `}
        >
          <img
            src={user.avatar}
            alt={user.name}
            className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white object-cover"
          />
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-white rounded-full shadow-md text-[10px] font-bold text-gray-600 border border-gray-100">
          {user.badge}
        </div>
      </div>

      {/* Info */}
      <h3 className="text-xl font-bold text-gray-800 mb-1">{user.name}</h3>
      <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
        {user.profit} USDC
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="bg-white/50 rounded-xl p-2 text-center border border-white/50">
          <div className="text-xs text-gray-500 mb-1">胜率</div>
          <div className="text-sm font-bold text-gray-800">{user.winRate}</div>
        </div>
        <div className="bg-white/50 rounded-xl p-2 text-center border border-white/50">
          <div className="text-xs text-gray-500 mb-1">场次</div>
          <div className="text-sm font-bold text-gray-800">{user.trades}</div>
        </div>
      </div>
    </motion.div>
  );
};

const RankItem = ({ user, index }: { user: any; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex items-center gap-4 bg-white/70 hover:bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
    >
      <div className="flex-shrink-0 w-12 flex justify-center">
        <span className="text-lg font-bold text-gray-400 font-mono">
          #{user.rank}
        </span>
      </div>

      <img
        src={user.avatar}
        alt={user.name}
        className="w-12 h-12 rounded-full bg-gray-100 border-2 border-white shadow-sm group-hover:scale-110 transition-transform"
      />

      <div className="flex-grow min-w-0">
        <h4 className="font-bold text-gray-800 truncate">{user.name}</h4>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 胜率 {user.winRate}
          </span>
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          <span>{user.trades} 场预测</span>
        </div>
      </div>

      <div className="text-right">
        <div className="font-bold text-green-600 text-lg">{user.profit}</div>
        <div
          className={`text-xs flex items-center justify-end gap-1 ${
            user.trend.startsWith("+") ? "text-red-500" : "text-green-500"
          }`}
        >
          {user.trend.startsWith("+") ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : null}
          {user.trend}
        </div>
      </div>
    </motion.div>
  );
};

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState("weekly");

  const topThree = leaderboardData.slice(0, 3);
  const restRank = leaderboardData.slice(3);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-400/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-400/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fuchsia-300/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 pb-24">
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-purple-100 shadow-sm text-purple-700 font-medium text-sm mb-4"
          >
            <Sparkles className="w-4 h-4" />
            <span>本周高手云集，竞争激烈</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            收益排行榜
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            发现最顶尖的预测家，跟随他们的智慧，或者成为他们。
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm inline-flex gap-1">
            {[
              { id: "weekly", label: "本周", icon: Timer },
              { id: "monthly", label: "本月", icon: Calendar },
              { id: "all", label: "总榜", icon: Trophy },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                className={`
                  relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2
                  ${
                    timeRange === tab.id
                      ? "text-white shadow-lg shadow-purple-500/25"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }
                `}
              >
                {timeRange === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl"
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="flex flex-col md:flex-row justify-center items-end gap-6 mb-16 px-4">
          <TopThreeCard user={topThree[1]} />
          <TopThreeCard user={topThree[0]} />
          <TopThreeCard user={topThree[2]} />
        </div>

        {/* Rest of the List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: The List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between px-4 text-sm font-medium text-gray-400 mb-2">
              <span>排名 & 用户</span>
              <span>收益 & 趋势</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={timeRange}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {restRank.map((user, idx) => (
                  <RankItem key={user.name} user={user} index={idx} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Stats & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Personal Stats Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700" />

              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Users className="w-5 h-5" />
                我的战绩
              </h3>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border border-white/30">
                  -
                </div>
                <div>
                  <div className="text-white/80 text-sm">当前排名</div>
                  <div className="font-bold text-lg">暂无数据</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <div className="text-white/60 text-xs mb-1">累计收益</div>
                  <div className="font-mono font-bold text-lg">0 USDC</div>
                </div>
                <div>
                  <div className="text-white/60 text-xs mb-1">胜率</div>
                  <div className="font-mono font-bold text-lg">0%</div>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Medal className="w-5 h-5 text-yellow-500" />
                上榜规则
              </h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
                  排行榜每 15 分钟更新一次数据
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
                  收益计算基于已结算的预测事件
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
                  "预测之神"徽章需保持周榜第一 3 天
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
