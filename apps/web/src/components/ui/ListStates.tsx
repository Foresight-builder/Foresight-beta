"use client";

import React from "react";
import { CheckCircle, ChevronDown } from "lucide-react";

type ListLoadingProps = {
  message: string;
};

export function ListLoading({ message }: ListLoadingProps) {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}

type ListErrorProps = {
  error: unknown;
  title: string;
  reloadLabel: string;
  onReload?: () => void;
};

export function ListError({ error, title, reloadLabel, onReload }: ListErrorProps) {
  const handleReload = () => {
    if (onReload) {
      onReload();
      return;
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="text-center py-12">
      <div className="text-red-500 text-lg mb-2">{title}</div>
      <p className="text-gray-600">{(error as any)?.message || String(error)}</p>
      <button
        onClick={handleReload}
        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
      >
        {reloadLabel}
      </button>
    </div>
  );
}

type InfiniteScrollSentinelProps = {
  hasMore: boolean;
  loadingMore: boolean;
  observerTargetRef: React.Ref<HTMLDivElement>;
  loadMoreLabel: string;
  scrollHintLabel: string;
};

export function InfiniteScrollSentinel({
  hasMore,
  loadingMore,
  observerTargetRef,
  loadMoreLabel,
  scrollHintLabel,
}: InfiniteScrollSentinelProps) {
  if (!hasMore) return null;

  return (
    <div ref={observerTargetRef} className="flex justify-center py-8">
      {loadingMore ? (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/80 shadow-sm">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 text-sm font-medium">{loadMoreLabel}</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 text-gray-400 text-xs shadow-sm">
          <ChevronDown className="w-3 h-3" />
          <span>{scrollHintLabel}</span>
        </div>
      )}
    </div>
  );
}

type AllLoadedNoticeProps = {
  totalCount: number;
  prefixLabel: string;
  suffixLabel: string;
};

export function AllLoadedNotice({ totalCount, prefixLabel, suffixLabel }: AllLoadedNoticeProps) {
  if (totalCount <= 0) return null;

  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>
          {prefixLabel}
          {totalCount}
          {suffixLabel}
        </span>
      </div>
    </div>
  );
}
