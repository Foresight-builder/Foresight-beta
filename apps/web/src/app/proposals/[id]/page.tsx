"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ForumSection from "@/components/ForumSection";

interface ProposalDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const idNum = Number(resolvedParams.id);
  const isValidId = Number.isFinite(idNum) && idNum > 0;

  if (!isValidId) {
    return (
      <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center">
        <div className="max-w-md w-full px-4">
          <button
            onClick={() => router.push("/proposals")}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 mb-4 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            返回提案列表
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-black text-slate-900 mb-2">无效的提案</div>
            <div className="text-sm text-slate-500">无法识别该提案编号，请从列表重新进入。</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full relative overflow-hidden font-sans p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-200/40 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-200/40 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      <div className="max-w-4xl mx-auto h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/proposals")}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200 shadow-sm hover:bg-white"
          >
            <ArrowLeft className="w-3 h-3" />
            返回提案列表
          </button>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">
            Proposal Detail
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
          <ForumSection eventId={0} threadId={idNum} hideCreate />
        </div>
      </div>
    </div>
  );
}
