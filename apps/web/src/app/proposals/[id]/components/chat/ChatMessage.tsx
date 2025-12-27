"use client";

import React from "react";
import { ThumbsUp, ThumbsDown, MessageCircle, MoreHorizontal } from "lucide-react";
import { useTranslations } from "@/lib/i18n";

interface ChatMessageProps {
  isMainProposal?: boolean;
  authorName: string;
  content: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  userVote?: "up" | "down";
  onVote: (dir: "up" | "down") => void;
  onReply?: () => void;
  isMe?: boolean;
}

export function ChatMessage({
  isMainProposal,
  authorName,
  content,
  timestamp,
  upvotes,
  downvotes,
  userVote,
  onVote,
  onReply,
  isMe,
}: ChatMessageProps) {
  const tChat = useTranslations("chat");

  return (
    <div
      className={`group flex gap-3 sm:gap-4 px-4 py-3 sm:px-6 hover:bg-slate-50/50 transition-colors ${isMainProposal ? "bg-white border-b border-slate-100 pb-6 mb-2" : ""}`}
    >
      <div className="shrink-0 pt-1">
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold border shadow-sm transition-transform hover:scale-105 cursor-default ${
            isMainProposal
              ? "bg-gradient-to-br from-purple-100 to-blue-100 text-purple-700 border-purple-100"
              : isMe
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-slate-600 border-slate-200"
          }`}
        >
          {authorName.slice(0, 2).toUpperCase()}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-slate-900 text-xs sm:text-sm hover:underline cursor-pointer">
            {authorName}
          </span>
          {isMainProposal && (
            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200">
              {tChat("message.opBadge")}
            </span>
          )}
          <span className="text-[10px] sm:text-xs text-slate-400">{timestamp}</span>
        </div>

        <div
          className={`text-sm text-slate-800 leading-relaxed break-words ${isMainProposal ? "text-base font-medium" : ""}`}
        >
          <div className="whitespace-pre-wrap">{content}</div>
        </div>

        <div className="flex items-center gap-4 pt-2 opacity-80 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => onVote("up")}
              className={`p-1 rounded-md hover:bg-white hover:shadow-sm transition-all ${userVote === "up" ? "text-green-600 bg-white shadow-sm" : "text-slate-400 hover:text-green-600"}`}
            >
              <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <span
              className={`text-[10px] sm:text-xs font-bold px-1.5 min-w-[1.5rem] text-center ${
                userVote === "up"
                  ? "text-green-600"
                  : userVote === "down"
                    ? "text-red-600"
                    : "text-slate-500"
              }`}
            >
              {upvotes - downvotes}
            </span>
            <button
              onClick={() => onVote("down")}
              className={`p-1 rounded-md hover:bg-white hover:shadow-sm transition-all ${userVote === "down" ? "text-red-600 bg-white shadow-sm" : "text-slate-400 hover:text-red-600"}`}
            >
              <ThumbsDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          {!isMainProposal && onReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-600 transition-colors font-medium hover:bg-purple-50 px-2 py-1 rounded-lg"
            >
              <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {tChat("message.reply")}
            </button>
          )}

          <button className="ml-auto text-slate-300 hover:text-slate-500">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
