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

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-gray-100 cursor-pointer overflow-hidden group hover:shadow-[0_8px_30px_rgba(124,58,237,0.06)] hover:border-purple-100 transition-all duration-300"
      onClick={() => onClick(proposal.id)}
    >
      {/* Accent Color Bar based on category/id */}
      <div
        className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity`}
      />

      <div className="flex gap-5 relative z-10">
        {/* Left Voting Column - Simplified */}
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onVote(proposal.id, "up");
            }}
            className={`p-1.5 rounded-lg transition-all ${
              proposal.userVote === "up"
                ? "text-purple-600 bg-purple-50"
                : "text-gray-300 hover:text-purple-500 hover:bg-purple-50"
            }`}
          >
            <ArrowBigUp className="w-6 h-6 fill-current" />
          </motion.button>

          <span
            className={`font-bold text-xs ${
              totalVotes > 0
                ? "text-purple-600"
                : totalVotes < 0
                ? "text-blue-600"
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
            className={`p-1.5 rounded-lg transition-all ${
              proposal.userVote === "down"
                ? "text-blue-600 bg-blue-50"
                : "text-gray-300 hover:text-blue-500 hover:bg-blue-50"
            }`}
          >
            <ArrowBigDown className="w-6 h-6 fill-current" />
          </motion.button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Meta Info - Cleaner */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              r/{proposal.category || "General"}
            </span>
            <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
            <span className="text-[10px] font-bold text-gray-400">
              {new Date(proposal.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Title & Content */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-purple-700 transition-colors">
            {proposal.title}
          </h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2 mb-4 group-hover:text-gray-600 transition-colors">
            {proposal.content}
          </p>

          {/* Action Bar - Minimal */}
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-purple-600 transition-colors group/btn">
              <MessageCircle className="w-4 h-4" />
              {proposal.comments?.length || 0}
            </button>

            <button className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors group/btn">
              <Share2 className="w-4 h-4" />
              Share
            </button>

            {(proposal.upvotes || 0) > 10 && (
              <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-amber-500">
                <Sparkles className="w-3 h-3 fill-current" /> Hot
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
