import React from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  ArrowBigUp,
  ArrowBigDown,
  Share2,
  MoreHorizontal,
  Clock,
  Sparkles,
  TrendingUp,
  Hash,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface ProposalCardProps {
  proposal: any;
  onVote: (id: number, type: "up" | "down") => void;
  onClick: (id: number) => void;
}

export default function ProposalCard({ proposal, onVote, onClick }: ProposalCardProps) {
  const upvotes = proposal.upvotes || 0;
  const downvotes = proposal.downvotes || 0;
  const totalVotes = upvotes + downvotes;
  const score = upvotes - downvotes;

  // Calculate percentage for progress bar
  const upvotePercent = totalVotes === 0 ? 50 : Math.round((upvotes / totalVotes) * 100);

  // Determine status color based on category or heat
  const isHot = score > 10 || (proposal.comments?.length || 0) > 5;

  const categoryConfig: Record<string, { color: string; bg: string; border: string }> = {
    General: { color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
    Tech: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    Crypto: { color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
    Sports: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    Politics: { color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-100" },
  };

  const cat = categoryConfig[proposal.category] || categoryConfig.General;

  return (
    <div className="relative h-full group cursor-pointer" onClick={() => onClick(proposal.id)}>
      <div className="h-full rounded-2xl bg-white border border-gray-100 hover:border-purple-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col relative">
        {/* Hover Highlight */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-400 to-pink-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

        <div className="p-5 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${cat.bg} ${cat.color} border ${cat.border}`}
              >
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  Category
                </div>
                <div className="text-xs font-bold text-gray-700">
                  {proposal.category || "General"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isHot && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100">
                  <FlameIcon className="w-3 h-3" />
                  <span>HOT</span>
                </div>
              )}
              <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                {new Date(proposal.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4 flex-grow">
            <h3 className="text-base font-black text-gray-800 tracking-tight mb-2 leading-snug group-hover:text-purple-600 transition-colors line-clamp-2">
              {proposal.title}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 font-medium">
              {proposal.content}
            </p>
          </div>

          {/* Voting Bar - Styled */}
          <div className="mb-4">
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-100">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full"
                style={{ width: `${upvotePercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] font-bold text-purple-600">
                {upvotePercent}% Support
              </span>
              <span className="text-[10px] font-bold text-gray-400">{totalVotes} Votes</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 group-hover:text-purple-500 transition-colors">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{proposal.comments?.length || 0}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(proposal.id, "up");
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all border ${
                  proposal.userVote === "up"
                    ? "bg-purple-100 text-purple-700 border-purple-200"
                    : "bg-white text-gray-500 border-gray-100 hover:border-purple-200 hover:text-purple-600"
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{upvotes}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(proposal.id, "down");
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all border ${
                  proposal.userVote === "down"
                    ? "bg-gray-200 text-gray-700 border-gray-300"
                    : "bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:text-gray-600"
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{downvotes}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
