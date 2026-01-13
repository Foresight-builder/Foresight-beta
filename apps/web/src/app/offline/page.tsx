"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { motion } from "framer-motion";
import { RefreshCw, WifiOff, Home, TrendingUp, Users, Trophy } from "lucide-react";

const OfflinePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50/20 to-fuchsia-50/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6"
        >
          <WifiOff className="w-24 h-24 mx-auto text-violet-500" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">网络连接已断开</h1>

        <p className="text-gray-600 mb-8">
          您当前处于离线状态。请检查网络连接并重试，或浏览以下缓存页面。
        </p>

        <div className="space-y-3 mb-8">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重新连接
          </Button>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">缓存页面</h2>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/")}
              className="flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              首页
            </Button>

            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/trending")}
              className="flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              热门
            </Button>

            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/forum")}
              className="flex items-center justify-center gap-2"
            >
              <Users className="h-4 w-4" />
              论坛
            </Button>

            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/leaderboard")}
              className="flex items-center justify-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              排行榜
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-8 text-gray-500 text-sm"
      >
        Foresight - 去中心化预测市场
      </motion.p>
    </div>
  );
};

export default OfflinePage;
