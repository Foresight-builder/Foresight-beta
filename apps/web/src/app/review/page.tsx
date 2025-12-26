"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import type { Database } from "@/lib/database.types";

type Thread = Database["public"]["Tables"]["forum_threads"]["Row"];

type ReviewItem = Thread & {
  proposalLink?: string;
  category?: string | null;
};

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review/proposals?status=pending_review", { cache: "no-store" });
      if (!res.ok) {
        setError("加载失败，可能没有权限访问");
        setItems([]);
        return;
      }
      const data = await res.json();
      const list: Thread[] = data.items || [];
      const mapped: ReviewItem[] = list.map((t) => ({
        ...t,
        proposalLink: `/proposals/${t.id}`,
      }));
      setItems(mapped);
      if (mapped.length > 0 && selectedId == null) {
        setSelectedId(mapped[0].id);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const selected = items.find((x) => x.id === selectedId) || null;

  const submitAction = async (action: "approve" | "reject" | "needs_changes") => {
    if (!selected) return;
    if ((action === "reject" || action === "needs_changes") && !reason.trim()) {
      alert("请填写原因");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/review/proposals/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        alert("提交失败");
        return;
      }
      setReason("");
      await loadItems();
    } catch {
      alert("提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-rose-50/30 p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">提案审核工作台</h1>
            <p className="text-sm text-slate-500 mt-1">只对具有审核权限的账户开放</p>
          </div>
          <button
            onClick={() => router.push("/proposals")}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            返回提案广场
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)] gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-800">待审核提案</span>
              </div>
              <button
                onClick={loadItems}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                刷新
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-6 text-sm text-slate-500">正在加载提案...</div>
              ) : error ? (
                <div className="p-6 flex items-center gap-2 text-sm text-rose-500">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              ) : items.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">当前没有待审核的提案</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`px-4 py-3 cursor-pointer text-sm ${
                        selectedId === item.id ? "bg-purple-50" : "hover:bg-slate-50"
                      }`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-900 font-semibold truncate">
                            {item.title || "未命名提案"}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {item.content || "无描述"}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {item.category || "未分类"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">提案详情与操作</span>
              {selected && (
                <a
                  href={selected.proposalLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  在提案页打开
                </a>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {!selected ? (
                <div className="text-sm text-slate-500">请选择左侧列表中的一个提案</div>
              ) : (
                <>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1">标题</div>
                    <div className="text-lg font-bold text-slate-900">{selected.title}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1">正文</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {selected.content || "无正文"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                    <div>
                      <div className="font-semibold text-slate-400 mb-1">发起人</div>
                      <div>{selected.user_id}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-400 mb-1">当前状态</div>
                      <div>{selected.review_status || "pending_review"}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1">审核备注</div>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="填写拒绝或需要修改时的原因，方便作者理解"
                      rows={3}
                      className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3">
              <button
                disabled={!selected || submitting}
                onClick={() => submitAction("approve")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                通过
              </button>
              <button
                disabled={!selected || submitting}
                onClick={() => submitAction("needs_changes")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                <AlertCircle className="w-4 h-4" />
                需要修改
              </button>
              <button
                disabled={!selected || submitting}
                onClick={() => submitAction("reject")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                拒绝
              </button>
              <div className="ml-auto text-[11px] text-slate-400">
                提示: 只有通过的提案才会参与自动生成预测市场
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
