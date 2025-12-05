import React from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  ArrowBigUp,
  ArrowBigDown,
  Share2,
  Flag,
  MoreHorizontal,
  Clock,
  Sparkles,
} from "lucide-react";

interface ProposalCardProps {
  proposal: any;
  onVote: (id: number, type: "up" | "down") => void;
  onClick: (id: number) => void;
}

export default function ProposalCard({
  proposal,
  onVote,
  onClick,
}: ProposalCardProps) {
  const totalVotes = (proposal.upvotes || 0) - (proposal.downvotes || 0);

  // Enhanced gradients for better visuals
  const gradients = [
    {
      bg: "from-pink-100 to-rose-100",
      border: "group-hover:border-pink-200",
      icon: "text-pink-500",
      hoverBg: "group-hover:bg-pink-50/30",
    },
    {
      bg: "from-blue-100 to-cyan-100",
      border: "group-hover:border-blue-200",
      icon: "text-blue-500",
      hoverBg: "group-hover:bg-blue-50/30",
    },
    {
      bg: "from-purple-100 to-violet-100",
      border: "group-hover:border-purple-200",
      icon: "text-purple-500",
      hoverBg: "group-hover:bg-purple-50/30",
    },
    {
      bg: "from-amber-100 to-orange-100",
      border: "group-hover:border-orange-200",
      icon: "text-orange-500",
      hoverBg: "group-hover:bg-orange-50/30",
    },
    {
      bg: "from-emerald-100 to-teal-100",
      border: "group-hover:border-emerald-200",
      icon: "text-emerald-500",
      hoverBg: "group-hover:bg-emerald-50/30",
    },
  ];

  const style = gradients[proposal.id % gradients.length];

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02, rotate: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative bg-white rounded-[2.5rem] p-5 shadow-sm border border-gray-100 cursor-pointer overflow-hidden group transition-all duration-300 ${style.border} ${style.hoverBg} hover:shadow-lg`}
      onClick={() => onClick(proposal.id)}
    >
      {/* Decorative Background Blob */}
      <div
        className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${style.bg} opacity-40 rounded-bl-[5rem] -mr-12 -mt-12 transition-all duration-500 group-hover:scale-110 group-hover:opacity-60`}
      />

      <div className="flex gap-5 relative z-10">
        {/* Left Voting Pill */}
        <div className="flex flex-col items-center bg-gray-50/80 backdrop-blur-sm rounded-full py-3 px-1.5 gap-1 h-fit shrink-0 border border-gray-100 shadow-inner">
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onVote(proposal.id, "up");
            }}
            className={`p-2 rounded-full transition-colors ${
              proposal.userVote === "up"
                ? "bg-orange-100 text-orange-500"
                : "hover:bg-white hover:text-orange-500 text-gray-400"
            }`}
          >
            <ArrowBigUp className="w-7 h-7 fill-current" />
          </motion.button>

          <span
            className={`font-black text-sm py-1 ${
              totalVotes > 0
                ? "text-orange-500"
                : totalVotes < 0
                ? "text-blue-500"
                : "text-gray-400"
            }`}
          >
            {Math.abs(totalVotes) < 1000
              ? totalVotes
              : `${(totalVotes / 1000).toFixed(1)}k`}
          </span>

          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onVote(proposal.id, "down");
            }}
            className={`p-2 rounded-full transition-colors ${
              proposal.userVote === "down"
                ? "bg-blue-100 text-blue-500"
                : "hover:bg-white hover:text-blue-500 text-gray-400"
            }`}
          >
            <ArrowBigDown className="w-7 h-7 fill-current" />
          </motion.button>
        </div>

        {/* Content Area */}
        <div className="flex-1 pt-1">
          {/* Meta Info */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div
              className={`bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-black border border-gray-100 flex items-center gap-1.5 shadow-sm ${style.icon}`}
            >
              <div
                className={`w-2 h-2 rounded-full animate-pulse bg-current`}
              />
              r/{proposal.category || "General"}
            </div>
            <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(proposal.created_at).toLocaleDateString()}
            </span>
            {(proposal.upvotes || 0) > 10 && (
              <div className="flex items-center gap-1 text-xs font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                <Sparkles className="w-3 h-3 fill-current" /> Hot
              </div>
            )}
          </div>

          {/* Title & Content */}
          <h3 className="text-xl font-black text-gray-800 mb-3 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 transition-all">
            {proposal.title}
          </h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-3 mb-5 pr-4">
            {proposal.content}
          </p>

          {/* Action Bar */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold hover:bg-white hover:shadow-md hover:text-blue-500 transition-all group/btn border border-transparent hover:border-gray-100">
              <MessageCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              {proposal.comments?.length || 0} Comments
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold hover:bg-white hover:shadow-md hover:text-pink-500 transition-all group/btn border border-transparent hover:border-gray-100">
              <Share2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              Share
            </button>
            <div className="ml-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                <Flag className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
