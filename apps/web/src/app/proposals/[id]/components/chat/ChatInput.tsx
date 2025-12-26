"use client";

import React, { useRef, useEffect } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  onConnect?: () => void;
  isConnected: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder,
  onConnect,
  isConnected,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [value]);

  if (!isConnected) {
    return (
      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-20">
        <button
          onClick={onConnect}
          className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Connect Wallet to Join Discussion
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-20">
      <div className="relative max-w-4xl mx-auto flex items-end gap-2 bg-white p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all shadow-sm">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type your thoughts..."}
          className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[24px] py-2 px-2 text-sm text-slate-900 placeholder:text-slate-400"
          rows={1}
        />
        <button
          onClick={onSubmit}
          disabled={!value.trim() || isLoading}
          className="p-2 rounded-xl bg-purple-600 text-white disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-300 transition-all hover:bg-purple-700 shadow-md shadow-purple-500/20 disabled:shadow-none"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
      <div className="max-w-4xl mx-auto mt-2 flex justify-between px-2">
        <span className="text-[10px] text-slate-400">Markdown supported</span>
        <span className="text-[10px] text-slate-400">Enter to send</span>
      </div>
    </div>
  );
}
