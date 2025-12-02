"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/AuthContext";
import { getClient } from "@/lib/supabase";
import WalletModal from "@/components/WalletModal";
import {
  Loader2,
  Flag,
  Calendar,
  CheckCircle2,
  Users,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FlagItem = {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: "active" | "pending_review" | "success" | "failed";
  verification_type: "self" | "witness";
  proof_image_url?: string;
  proof_comment?: string;
  created_at: string;
  user_id: string;
};

export default function FlagsPage() {
  const { account } = useWallet();
  const { user } = useAuth();
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [verifType, setVerifType] = useState<"self" | "witness">("self");
  const [witnessId, setWitnessId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filterMine, setFilterMine] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending_review" | "success" | "failed"
  >("all");
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinFlag, setCheckinFlag] = useState<FlagItem | null>(null);
  const [checkinNote, setCheckinNote] = useState("");
  const [checkinImage, setCheckinImage] = useState("");
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFlag, setHistoryFlag] = useState<FlagItem | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<
    Array<{
      id: string;
      note: string;
      image_url?: string;
      created_at: string;
      review_status?: string;
      reviewer_id?: string;
      review_reason?: string;
    }>
  >([]);
  const [reviewSubmittingId, setReviewSubmittingId] = useState<string | null>(
    null
  );
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [officialCreate, setOfficialCreate] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<{
    flag_id: number;
    owner_id: string;
    title: string;
    ts: string;
  } | null>(null);
  const [invitesCount, setInvitesCount] = useState(0);

  const supabase = getClient();

  const officialTemplates: Array<{
    id: string;
    title: string;
    description: string;
  }> = [
    {
      id: "weather_rain_tomorrow",
      title: "明天要不要带小伞？",
      description: "看天公作美，和小雨来不来打个赌～",
    },
    {
      id: "weather_snow_tomorrow",
      title: "明天会下小雪吗？",
      description: "想看雪花跳舞，交给天气小精灵判定～",
    },
    {
      id: "temp_max_over",
      title: "明天热到融化吗？",
      description: "最高温挑战阈值，太阳别太粘人～",
    },
    {
      id: "temp_min_under",
      title: "明天冷到哆嗦吗？",
      description: "最低温降到线，毛绒外套准备好～",
    },
    {
      id: "wind_over",
      title: "明天风会呼呼啦？",
      description: "风速拉满就算赢，吹走小烦恼～",
    },
    {
      id: "aqi_good",
      title: "明天空气会很乖吗？",
      description: "AQI 乖乖在阈值内，呼吸自由～",
    },
    {
      id: "pm25_under",
      title: "明天 PM2.5 低低的？",
      description: "灰尘不捣乱，清透一整天～",
    },
    {
      id: "uvi_over",
      title: "明天阳光要撒娇吗？",
      description: "UVI 超线就算准，防晒别偷懒～",
    },
    {
      id: "feels_like_comfort",
      title: "明天天气体感刚刚好？",
      description: "舒适区间打卡，心情软绵绵～",
    },
    {
      id: "early_morning",
      title: "日出前把被子打败！",
      description: "窗口前起床打卡，和瞌睡虫说拜拜～",
    },
  ];

  const loadFlags = async () => {
    try {
      setLoading(true);
      const me = account || user?.id || "";
      if (!me) {
        setFlags([]);
        return;
      }
      const res = await fetch(
        `/api/flags?viewer_id=${encodeURIComponent(me)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setFlags([]);
        return;
      }
      const payload = await res.json().catch(() => ({ flags: [] }));
      const list = Array.isArray(payload?.flags) ? payload.flags : [];
      setFlags(list as FlagItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const me = account || user?.id || "";
      if (!me || !supabase) {
        setInvitesCount(0);
        setInviteNotice(null);
        return;
      }
      const { data, error } = await (supabase as any)
        .from("discussions")
        .select("content,created_at")
        .eq("user_id", me)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        setInvitesCount(0);
        setInviteNotice(null);
        return;
      }
      const items = (data || [])
        .map((r: any) => {
          try {
            const obj = JSON.parse(String(r.content || "{}"));
            if (obj && obj.type === "witness_invite") {
              return {
                flag_id: Number(obj.flag_id || 0),
                owner_id: String(obj.owner_id || ""),
                title: String(obj.title || ""),
                ts: String(obj.ts || r.created_at || ""),
              };
            }
          } catch {}
          return null;
        })
        .filter(Boolean) as any[];
      setInvitesCount(items.length);
      setInviteNotice(items[0] || null);
    } catch {
      setInvitesCount(0);
      setInviteNotice(null);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    loadFlags();
    loadInvites();

    const ch = supabase
      .channel("flags-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flags" },
        () => {
          loadFlags();
        }
      )
      .subscribe();

    const ch2 = supabase
      .channel("discussions-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "discussions" },
        () => {
          loadInvites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(ch2);
    };
  }, []);

  const handleCreateClick = () => {
    if (!account && !user) {
      setWalletModalOpen(true);
      return;
    }
    setOfficialCreate(false);
    setCreateOpen(true);
  };

  const createFlag = async () => {
    if (!newTitle.trim() || !newDeadline) return;
    if (!user && !account) return;

    try {
      setSubmitting(true);
      const payload: any = {
        user_id: account || user?.id || "anonymous",
        title: newTitle,
        description: newDesc,
        deadline: newDeadline,
        verification_type: officialCreate ? "self" : verifType,
        status: "active",
      };
      if (!officialCreate && verifType === "witness" && witnessId.trim())
        payload.witness_id = witnessId.trim();

      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "创建失败");
      }

      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewDeadline("");
      setOfficialCreate(false);
    } catch (e) {
      alert("创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckin = (flag: FlagItem) => {
    const me = account || user?.id || "";
    if (
      !me ||
      String(flag.user_id || "").toLowerCase() !== String(me).toLowerCase()
    ) {
      alert("仅创建者可打卡");
      return;
    }
    setCheckinFlag(flag);
    setCheckinNote("");
    setCheckinImage("");
    setCheckinOpen(true);
  };

  const submitCheckin = async () => {
    if (!checkinFlag) return;
    const me = account || user?.id || "";
    if (!me) return;
    try {
      setCheckinSubmitting(true);
      const payload = {
        flag_id: checkinFlag.id,
        user_id: me,
        note: checkinNote,
        image_url: checkinImage,
      };
      const res = await fetch("/api/flags/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ret = await res.json().catch(() => ({} as any));
      if (!res.ok)
        throw new Error(
          String((ret as any)?.detail || (ret as any)?.message || "打卡失败")
        );
      setCheckinOpen(false);
      setCheckinFlag(null);
      setCheckinNote("");
      setCheckinImage("");
      await loadFlags();
    } catch (e) {
      alert(String((e as any)?.message || "打卡失败，请重试"));
    } finally {
      setCheckinSubmitting(false);
    }
  };

  const openHistory = async (flag: FlagItem) => {
    setHistoryFlag(flag);
    setHistoryItems([]);
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      const me = account || user?.id || "";
      const res = await fetch(
        `/api/flags/${flag.id}/checkins?limit=50&viewer_id=${encodeURIComponent(
          me
        )}`,
        {
          cache: "no-store",
        }
      );
      const data = await res.json().catch(() => ({} as any));
      const items = Array.isArray(data?.items) ? data.items : [];
      setHistoryItems(items);
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  };

  const reviewCheckin = async (
    checkinId: string,
    action: "approve" | "reject"
  ) => {
    const me = account || user?.id || "";
    if (!me) return alert("请先连接钱包或登录");
    try {
      setReviewSubmittingId(checkinId);
      const res = await fetch(`/api/checkins/${checkinId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewer_id: me }),
      });
      const ret = await res.json().catch(() => ({} as any));
      if (!res.ok)
        throw new Error(String(ret?.detail || ret?.message || "操作失败"));
      if (historyFlag) await openHistory(historyFlag);
    } catch (e) {
      alert(String((e as any)?.message || "操作失败"));
    } finally {
      setReviewSubmittingId(null);
    }
  };

  const settleFlag = async (flag: FlagItem) => {
    const me = account || user?.id || "";
    if (!me) return alert("请先连接钱包或登录");
    try {
      setSettlingId(flag.id as any);
      const res = await fetch(`/api/flags/${flag.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settler_id: me }),
      });
      const ret = await res.json().catch(() => ({} as any));
      if (!res.ok)
        throw new Error(String(ret?.detail || ret?.message || "结算失败"));
      await loadFlags();
      alert(
        `结算完成：${String(ret?.status || "")}，通过天数 ${
          ret?.metrics?.approvedDays || 0
        }/${ret?.metrics?.totalDays || 0}`
      );
    } catch (e) {
      alert(String((e as any)?.message || "结算失败"));
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pb-20">
      <div className="max-w-5xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Flag className="w-8 h-8 text-purple-600" />
              我的 Flag
            </h1>
            <p className="text-gray-500 mt-1">立下目标，见证改变</p>
          </div>
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200"
          >
            <Plus className="w-5 h-5" />
            立个 Flag
          </button>
        </div>

        {inviteNotice && (
          <div className="mb-6 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex items-center justify-between">
            <div>
              收到监督邀请：
              <span className="font-medium text-yellow-900">
                {inviteNotice.title}
              </span>
              <span className="ml-2 text-xs text-yellow-700">
                {new Date(inviteNotice.ts).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">总计 {invitesCount} 条</span>
              <button
                onClick={() => setInviteNotice(null)}
                className="px-3 py-1 rounded-full bg-white text-yellow-800 border border-yellow-300 hover:bg-yellow-100 text-xs"
              >
                我知道了
              </button>
            </div>
          </div>
        )}

        {/* 官方推荐 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">官方可爱推荐</h2>
            <span className="text-xs text-gray-500">
              今天也来打个小趣味卡吧
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {officialTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-500">模板</div>
                    <div className="text-base font-semibold text-gray-900 mt-0.5">
                      {tpl.title}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {tpl.description}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setNewTitle(tpl.title);
                      setNewDesc(tpl.description);
                      setVerifType("self");
                      setOfficialCreate(true);
                      setCreateOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-full bg-purple-600 text-white text-sm hover:bg-purple-700"
                  >
                    一键使用
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                statusFilter === "all"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                statusFilter === "active"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              进行中
            </button>
            <button
              onClick={() => setStatusFilter("pending_review")}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                statusFilter === "pending_review"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              审核中
            </button>
            <button
              onClick={() => setStatusFilter("success")}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                statusFilter === "success"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              成功
            </button>
            <button
              onClick={() => setStatusFilter("failed")}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                statusFilter === "failed"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              失败
            </button>
          </div>
          <button
            onClick={() => setFilterMine((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filterMine
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {filterMine ? "只看我的 ✓" : "只看我的"}
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : flags.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-gray-200">
            <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">还没有 Flag</h3>
            <p className="text-gray-500 mb-6">今天想挑战什么？</p>
            <button
              onClick={handleCreateClick}
              className="px-6 py-2 bg-white border border-purple-200 text-purple-600 rounded-full hover:bg-purple-50 transition-colors"
            >
              开始第一个挑战
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flags
              .filter((f) =>
                statusFilter === "all" ? true : f.status === statusFilter
              )
              .filter((f) => {
                if (!filterMine) return true;
                const me = account || user?.id || "";
                return (
                  me &&
                  String(f.user_id || "").toLowerCase() ===
                    String(me).toLowerCase()
                );
              })
              .sort(
                (a, b) =>
                  new Date(a.deadline).getTime() -
                  new Date(b.deadline).getTime()
              )
              .map((flag) => (
                <FlagCard
                  key={flag.id}
                  flag={flag}
                  isMine={
                    Boolean(account || user?.id) &&
                    String(flag.user_id || "").toLowerCase() ===
                      String(account || user?.id || "").toLowerCase()
                  }
                  onCheckin={() => openCheckin(flag)}
                  onViewHistory={() => openHistory(flag)}
                  onSettle={() => settleFlag(flag)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {createOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => setCreateOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                立个 Flag 🚩
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    我想...
                  </label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例如：明天早起跑步"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-colors text-black"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注 (可选)
                  </label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="具体怎么做？"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-colors resize-none text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    截止时间
                  </label>
                  <input
                    type="datetime-local"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-colors text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    监督方式{officialCreate ? "（官方模板仅系统判定）" : ""}
                  </label>
                  {officialCreate ? (
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => setVerifType("self")}
                        className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          verifType === "self"
                            ? "bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span className="font-medium">自己打卡</span>
                        <span className="text-xs opacity-70">上传照片即可</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setVerifType("self")}
                        className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          verifType === "self"
                            ? "bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span className="font-medium">自己打卡</span>
                        <span className="text-xs opacity-70">上传照片即可</span>
                      </button>
                      <button
                        onClick={() => setVerifType("witness")}
                        className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          verifType === "witness"
                            ? "bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span className="font-medium">好友监督</span>
                        <span className="text-xs opacity-70">邀请好友见证</span>
                      </button>
                    </div>
                  )}
                </div>
                {verifType === "witness" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      监督人 ID（钱包地址或用户ID）
                    </label>
                    <input
                      value={witnessId}
                      onChange={(e) => setWitnessId(e.target.value)}
                      placeholder="0x... 或 supabase 用户ID"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-colors text-black"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={createFlag}
                  disabled={submitting || !newTitle || !newDeadline}
                  className="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "确认发布"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
      <AnimatePresence>
        {checkinOpen && checkinFlag && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => setCheckinOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                打卡 · {checkinFlag.title}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注
                  </label>
                  <textarea
                    value={checkinNote}
                    onChange={(e) => setCheckinNote(e.target.value)}
                    placeholder="今天做了什么？"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-colors resize-none text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    图片链接（可选）
                  </label>
                  <input
                    value={checkinImage}
                    onChange={(e) => setCheckinImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-colors text-black"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setCheckinOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={submitCheckin}
                  disabled={checkinSubmitting}
                  className="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkinSubmitting ? "提交中…" : "提交打卡"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {historyOpen && historyFlag && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => setHistoryOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                打卡历史 · {historyFlag.title}
              </h3>
              <div className="space-y-3 max-h-[60vh] overflow-auto">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="text-sm text-gray-500">暂无打卡记录</div>
                ) : (
                  historyItems.map((it) => (
                    <div
                      key={it.id}
                      className="p-3 rounded-xl border border-gray-200"
                    >
                      <div className="text-xs text-gray-400 mb-1">
                        {new Date(it.created_at).toLocaleString()}
                      </div>
                      {it.note ? (
                        <div className="text-sm text-gray-700">{it.note}</div>
                      ) : null}
                      {it.image_url ? (
                        <img
                          src={it.image_url}
                          alt="打卡图片"
                          className="mt-2 rounded-xl border border-gray-200 max-h-40 object-cover"
                        />
                      ) : null}
                      {historyFlag?.verification_type === "witness" && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-600">
                            {String(it.review_status || "pending") ===
                            "approved"
                              ? "已通过"
                              : String(it.review_status || "pending") ===
                                "rejected"
                              ? "已拒绝"
                              : "待审核"}
                          </span>
                          {String(it.review_status || "pending") ===
                            "pending" &&
                            String(historyFlag?.user_id || "").toLowerCase() ===
                              String(
                                account || user?.id || ""
                              ).toLowerCase() && (
                              <>
                                <button
                                  disabled={reviewSubmittingId === it.id}
                                  onClick={() =>
                                    reviewCheckin(it.id, "approve")
                                  }
                                  className="px-2 py-1 text-xs rounded border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
                                >
                                  通过
                                </button>
                                <button
                                  disabled={reviewSubmittingId === it.id}
                                  onClick={() => reviewCheckin(it.id, "reject")}
                                  className="px-2 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  驳回
                                </button>
                              </>
                            )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FlagCard({
  flag,
  isMine,
  onCheckin,
  onViewHistory,
  onSettle,
}: {
  flag: FlagItem;
  isMine?: boolean;
  onCheckin?: () => void;
  onViewHistory?: () => void;
  onSettle?: () => void;
}) {
  const statusConfig = {
    active: { color: "text-blue-600", bg: "bg-blue-50", label: "进行中" },
    pending_review: {
      color: "text-orange-600",
      bg: "bg-orange-50",
      label: "审核中",
    },
    success: { color: "text-green-600", bg: "bg-green-50", label: "挑战成功" },
    failed: { color: "text-red-600", bg: "bg-red-50", label: "挑战失败" },
  };

  const s = statusConfig[flag.status];
  const remainText = (() => {
    const ms = new Date(flag.deadline).getTime() - Date.now();
    if (ms <= 0) return "已到期";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return `剩 ${d} 天`;
    return `剩 ${h} 小时`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group"
    >
      <div className="flex justify-between items-start mb-3">
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg ${s.bg} ${s.color}`}
        >
          {s.label}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
            {remainText}
          </span>
          {isMine ? (
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
              我的
            </span>
          ) : null}
          {flag.verification_type === "self" ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <Users className="w-3 h-3" />
          )}
          {flag.verification_type === "self" ? "自律" : "监督"}
        </span>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
        {flag.title}
      </h3>
      {flag.description && (
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {flag.description}
        </p>
      )}

      {flag.proof_comment && (
        <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-200 text-sm text-purple-700">
          <span className="font-medium">最近打卡：</span>
          <span>{flag.proof_comment}</span>
        </div>
      )}

      {flag.proof_image_url && (
        <div className="mb-4">
          <img
            src={flag.proof_image_url}
            alt="打卡图片"
            className="rounded-xl border border-gray-200 max-h-40 object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400 mt-auto pt-4 border-t border-gray-50">
        <Calendar className="w-3 h-3" />
        截止: {new Date(flag.deadline).toLocaleString()}
      </div>

      {/* Hover Action - Mockup for now */}
      <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
        {flag.status === "active" && (
          <button
            onClick={onCheckin}
            className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
          >
            去打卡
          </button>
        )}
        <button
          onClick={onViewHistory}
          className="px-4 py-2 bg-white text-purple-700 border border-purple-200 rounded-full text-sm font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
        >
          查看打卡
        </button>
        {isMine &&
          new Date(flag.deadline).getTime() <= Date.now() &&
          flag.status !== "success" &&
          flag.status !== "failed" && (
            <button
              onClick={onSettle}
              className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
            >
              结算
            </button>
          )}
      </div>
    </motion.div>
  );
}
