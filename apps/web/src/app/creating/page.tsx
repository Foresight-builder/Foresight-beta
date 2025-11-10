"use client";
import React, { useState, useEffect, useMemo } from "react";
import TopNavBar from "@/components/TopNavBar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  FileText,
  Tags,
  Coins,
  Link as LinkIcon,
  CheckCircle,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  Info,
  Eye,
  Save,
  Zap,
  Wallet,
  Upload,
  Image,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreatingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("科技");
  const [deadline, setDeadline] = useState("");
  const [minStake, setMinStake] = useState("1");
  const [criteria, setCriteria] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [created, setCreated] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  const [autoGenerateStatus, setAutoGenerateStatus] = useState<
    "idle" | "active" | "success"
  >("idle");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null
  );
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeValue, setTimeValue] = useState<string>("09:00");
  const [timeOpen, setTimeOpen] = useState(false);

  // 检查钱包连接状态
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          setIsCheckingWallet(false);
          return;
        }

        // 检查是否有已连接的账户
        const accounts = await ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error("检查钱包连接失败:", error);
      } finally {
        setIsCheckingWallet(false);
      }
    };

    checkWalletConnection();

    // 监听账户变化
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress(null);
      }
    };

    const ethereum = (window as any).ethereum;
    if (ethereum && ethereum.on) {
      ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
        }
      };
    }
  }, []);

  const categories = [
    { value: "科技", icon: "💻", color: "from-blue-400 to-cyan-400" },
    { value: "娱乐", icon: "🎬", color: "from-pink-400 to-rose-400" },
    { value: "时政", icon: "🏛️", color: "from-purple-400 to-indigo-400" },
    { value: "天气", icon: "🌤️", color: "from-green-400 to-emerald-400" },
  ];

  // 计算最小可选日期（一周后）
  const getMinDateTime = () => {
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    return oneWeekFromNow.toISOString().slice(0, 16); // 格式化为 datetime-local 格式
  };

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const formatDateTimeLocal = (d: Date) => {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
      d.getDate()
    )}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":");
    return Number(h) * 60 + Number(m);
  };
  const timeOptions = useMemo(() => {
    const arr: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        arr.push(`${pad2(h)}:${pad2(m)}`);
      }
    }
    return arr;
  }, []);

  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const deadlineSuggestions: { label: string; getDate: () => Date }[] = [
    {
      label: "7 天后 09:00",
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: "10 天后 18:00",
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 10);
        d.setHours(18, 0, 0, 0);
        return d;
      },
    },
    {
      label: "14 天后 09:00",
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: "下个月 1 日 09:00",
      getDate: () =>
        new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1,
          9,
          0,
          0,
          0
        ),
    },
    {
      label: "下个月 15 日 18:00",
      getDate: () =>
        new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          15,
          18,
          0,
          0,
          0
        ),
    },
  ];

  const validate = () => {
    const e: { [k: string]: string } = {};
    if (!title.trim()) e.title = "请填写事件标题";
    if (title.length > 100) e.title = "标题不能超过100个字符";
    if (!description.trim()) e.description = "请填写事件描述";
    if (description.length > 500) e.description = "描述不能超过500个字符";
    if (!deadline) e.deadline = "请选择截止时间";

    // 检查截止时间限制
    if (deadline) {
      const selectedDate = new Date(deadline);
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (selectedDate <= now) {
        e.deadline = "截止时间不能是过去的时间";
      } else if (selectedDate <= oneWeekFromNow) {
        e.deadline = "截止时间必须在一周之后";
      }
    }

    if (!criteria.trim()) e.criteria = "请填写结算条件";
    if (criteria.length > 300) e.criteria = "结算条件不能超过300个字符";
    if (Number(minStake) <= 0) e.minStake = "最小押注需大于 0";
    if (Number(minStake) > 10) e.minStake = "最小押注不能超过 10 USDT";
    if (referenceUrl && !isValidUrl(referenceUrl))
      e.referenceUrl = "请输入有效的URL";

    // 图片验证（可选，如果没有上传图片也没有标题，则提示）
    if (!imageFile && !title.trim()) {
      e.image = "推荐上传图片或填写标题生成图片，可以让您的预测事件更具吸引力";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    if (!walletAddress) {
      setErrors({ image: "请先连接钱包登录" });
      return null;
    }

    // 验证文件类型
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ image: "只支持 JPEG、PNG、WebP 和 GIF 格式的图片" });
      return null;
    }

    // 验证文件大小（最大5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors({ image: "图片文件大小不能超过5MB" });
      return null;
    }

    setIsUploadingImage(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("walletAddress", walletAddress);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setErrors({});
        return result.data.publicUrl;
      } else {
        setErrors({ image: result.message || "图片上传失败" });
        return null;
      }
    } catch (error) {
      console.error("图片上传异常:", error);
      setErrors({ image: "图片上传失败，请稍后重试" });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // 生成图片URL
  const generateImageUrl = (title: string) => {
    if (!title.trim()) return null;
    const seed =
      title.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "prediction";
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      seed
    )}&size=400&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=20`;
  };

  // 处理图片选择
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setErrors({});

    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 移除图片
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setErrors({});
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 检查是否已连接钱包
    if (!walletAddress) {
      setErrors({ submit: "请先连接钱包登录后再创建预测事件" });
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // 处理图片：如果有图片文件则上传，否则根据标题生成图片
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile);
        if (!imageUrl) {
          setIsSubmitting(false);
          return; // 图片上传失败，停止提交
        }
      } else if (generatedImageUrl) {
        // 如果用户生成了图片预览，则使用生成的图片URL
        imageUrl = generatedImageUrl;
      } else if (title.trim()) {
        // 如果没有上传图片也没有生成预览，但有标题，则生成图片
        imageUrl = generateImageUrl(title);
      }

      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          category,
          deadline,
          minStake: parseFloat(minStake),
          criteria,
          referenceUrl: referenceUrl || null,
          imageUrl, // 添加图片URL
          walletAddress, // 添加钱包地址
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCreated(true);
        // 清空表单
        setTitle("");
        setDescription("");
        setCategory("科技");
        setDeadline("");
        setMinStake("0.1");
        setCriteria("");
        setReferenceUrl("");
        setImageFile(null);
        setImagePreview(null);
        setGeneratedImageUrl(null);
        setAutoGenerateStatus("idle");
        setErrors({});

        // 创建成功后跳转到 trending 页面
        router.push("/trending");

        setTimeout(() => setCreated(false), 3000);
      } else {
        // 处理标题重复错误（409状态码）
        if (response.status === 409 && result.duplicateEvents) {
          const duplicateCount = result.duplicateEvents.length;
          const duplicateInfo = result.duplicateEvents
            .map(
              (event: { id: any; category: any; status: any }) =>
                `ID: ${event.id}, 分类: ${event.category}, 状态: ${event.status}`
            )
            .join("\n");

          setErrors({
            submit: `标题重复！已存在 ${duplicateCount} 个相同标题的事件。\n重复事件信息：\n${duplicateInfo}`,
            title: "标题已存在，请修改标题或删除现有事件",
          });
        } else {
          setErrors({ submit: result.message || "创建失败" });
        }
      }
    } catch (error) {
      console.error("创建预测事件失败:", error);
      setErrors({ submit: "网络请求失败，请稍后重试" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentCategory = () =>
    categories.find((c) => c.value === category) || categories[0];

  // 如果正在检查钱包状态，显示加载中
  if (isCheckingWallet) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
        <TopNavBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">检查钱包连接状态...</p>
          </div>
        </div>
      </div>
    );
  }

  // 如果未连接钱包，显示登录提示
  if (!walletAddress) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
        <TopNavBar />

        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl"></div>
        </div>

        <section className="relative z-10 px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-6">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              请先登录
            </h1>
            <p className="text-gray-600 mb-8">
              创建预测事件需要先连接钱包登录。请点击右上角的"连接钱包"按钮进行登录。
            </p>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                登录后您可以：
              </h3>
              <ul className="text-gray-600 space-y-2 text-left">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  创建新的预测事件
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  参与预测和押注
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  获得预测奖励
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
      <TopNavBar />

      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl"></div>
      </div>

      <section className="relative z-10 px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            创建预测事件
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            发起一个有趣的预测事件，让社区成员参与预测并获得奖励
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm">
            <Wallet className="w-4 h-4 mr-2" />
            已连接钱包: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* 左侧：表单 */}
            <div className="xl:col-span-2">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">
                      事件详情
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="xl:hidden flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {showPreview ? "隐藏预览" : "显示预览"}
                  </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                  {/* 标题输入 */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700">
                      <FileText className="w-4 h-4 mr-2 text-purple-500" />
                      事件标题
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例如：比特币在 2025 年底是否突破 10 万美元？"
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-0 placeholder:text-gray-400 text-gray-900 ${
                          errors.title
                            ? "border-red-300 focus:border-red-400"
                            : "border-gray-200 focus:border-purple-400"
                        }`}
                        maxLength={100}
                      />
                      <div className="absolute right-3 top-3 text-xs text-gray-400">
                        {title.length}/100
                      </div>
                    </div>
                    <AnimatePresence>
                      {errors.title && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-red-600 flex items-center"
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.title}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 描述输入 */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700">
                      <FileText className="w-4 h-4 mr-2 text-purple-500" />
                      事件描述
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder="请详细描述事件背景、参与方式、可能影响因素等，让参与者更好地理解事件"
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-0 resize-none placeholder:text-gray-400 text-gray-900 ${
                          errors.description
                            ? "border-red-300 focus:border-red-400"
                            : "border-gray-200 focus:border-purple-400"
                        }`}
                        maxLength={500}
                      />
                      <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                        {description.length}/500
                      </div>
                    </div>
                    <AnimatePresence>
                      {errors.description && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-red-600 flex items-center"
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 分类和截止时间 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-black">
                        <Tags className="w-4 h-4 mr-2 text-purple-500" />
                        事件分类
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCategoryOpen((v) => !v)}
                          aria-expanded={categoryOpen}
                          aria-haspopup="listbox"
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white/60 backdrop-blur-sm focus:outline-none transition-all duration-200 cursor-pointer text-black flex items-center justify-between hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 shadow-sm"
                        >
                          <span className="flex items-center">
                            <span className="text-lg mr-2">
                              {getCurrentCategory().icon}
                            </span>
                            <span className="font-medium">{category}</span>
                          </span>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                              categoryOpen ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {categoryOpen && (
                          <div
                            role="listbox"
                            className="absolute z-20 left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl p-2 max-h-56 overflow-y-auto scrollbar-beauty"
                          >
                            {categories.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => {
                                  setCategory(c.value);
                                  setCategoryOpen(false);
                                }}
                                role="option"
                                aria-selected={category === c.value}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group mb-2 ${
                                  category === c.value
                                    ? "border-purple-400 bg-gradient-to-r " +
                                      c.color +
                                      " text-white shadow-md"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center">
                                  <span className="text-lg mr-2">{c.icon}</span>
                                  <span
                                    className={`font-medium ${
                                      category === c.value
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {c.value}
                                  </span>
                                </div>
                                {category === c.value ? (
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="text-white"
                                  >
                                    <path
                                      d="M20 6L9 17l-5-5"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-gray-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-black">
                        截止时间
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="datetime-local"
                          value={deadline}
                          readOnly
                          min={getMinDateTime()}
                          className={`date-input-beauty w-full pl-4 pr-12 py-3 rounded-xl border-2 bg-white/60 backdrop-blur-sm transition-all duration-200 focus:outline-none text-black shadow-sm hover:border-gray-300 focus:ring-2 focus:ring-purple-200 ${
                            errors.deadline
                              ? "border-red-300 focus:border-red-400"
                              : "border-gray-200 focus:border-purple-500"
                          }`}
                        />
                        <button
                          type="button"
                          aria-label="打开截止时间选择"
                          onClick={() =>
                            setDeadlineOpen((prev) => {
                              const next = !prev;
                              if (next) {
                                const minDT = new Date(getMinDateTime());
                                if (deadline) {
                                  const d = new Date(deadline);
                                  setCalendarMonth(
                                    new Date(d.getFullYear(), d.getMonth(), 1)
                                  );
                                  setSelectedDate(
                                    new Date(
                                      d.getFullYear(),
                                      d.getMonth(),
                                      d.getDate()
                                    )
                                  );
                                  setTimeValue(
                                    `${pad2(d.getHours())}:${pad2(
                                      d.getMinutes()
                                    )}`
                                  );
                                } else {
                                  setCalendarMonth(
                                    new Date(
                                      minDT.getFullYear(),
                                      minDT.getMonth(),
                                      1
                                    )
                                  );
                                  setSelectedDate(
                                    new Date(
                                      minDT.getFullYear(),
                                      minDT.getMonth(),
                                      minDT.getDate()
                                    )
                                  );
                                  setTimeValue(
                                    `${pad2(minDT.getHours())}:${pad2(
                                      minDT.getMinutes()
                                    )}`
                                  );
                                }
                              }
                              return next;
                            })
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-purple-50 text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                        >
                          <Calendar className="w-5 h-5" />
                        </button>

                        {deadlineOpen &&
                          (() => {
                            const minDT = new Date(getMinDateTime());
                            const minDateOnly = new Date(
                              minDT.getFullYear(),
                              minDT.getMonth(),
                              minDT.getDate()
                            );
                            const startOfMonth = new Date(
                              calendarMonth.getFullYear(),
                              calendarMonth.getMonth(),
                              1
                            );
                            const endDay = new Date(
                              calendarMonth.getFullYear(),
                              calendarMonth.getMonth() + 1,
                              0
                            ).getDate();
                            const startWeekday = startOfMonth.getDay();
                            const days: (Date | null)[] =
                              Array(startWeekday).fill(null);
                            for (let i = 1; i <= endDay; i++) {
                              days.push(
                                new Date(
                                  calendarMonth.getFullYear(),
                                  calendarMonth.getMonth(),
                                  i
                                )
                              );
                            }
                            while (days.length % 7 !== 0) days.push(null);

                            const monthLabel = `${calendarMonth.getFullYear()}年${
                              calendarMonth.getMonth() + 1
                            }月`;

                            return (
                              <div className="absolute z-20 left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl p-3">
                                {/* 头部：月份与切换 */}
                                <div className="flex items-center justify-between mb-2">
                                  <button
                                    type="button"
                                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-40"
                                    onClick={() =>
                                      setCalendarMonth(
                                        new Date(
                                          calendarMonth.getFullYear(),
                                          calendarMonth.getMonth() - 1,
                                          1
                                        )
                                      )
                                    }
                                    disabled={
                                      new Date(
                                        calendarMonth.getFullYear(),
                                        calendarMonth.getMonth(),
                                        1
                                      ) <=
                                      new Date(
                                        minDateOnly.getFullYear(),
                                        minDateOnly.getMonth(),
                                        1
                                      )
                                    }
                                  >
                                    <ChevronLeft className="w-5 h-5" />
                                  </button>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {monthLabel}
                                  </div>
                                  <button
                                    type="button"
                                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                                    onClick={() =>
                                      setCalendarMonth(
                                        new Date(
                                          calendarMonth.getFullYear(),
                                          calendarMonth.getMonth() + 1,
                                          1
                                        )
                                      )
                                    }
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                  </button>
                                </div>

                                {/* 星期标题 */}
                                <div className="grid grid-cols-7 text-xs text-gray-500 mb-1">
                                  {[
                                    "日",
                                    "一",
                                    "二",
                                    "三",
                                    "四",
                                    "五",
                                    "六",
                                  ].map((w) => (
                                    <div key={w} className="text-center py-1">
                                      {w}
                                    </div>
                                  ))}
                                </div>

                                {/* 日期网格 */}
                                <div className="grid grid-cols-7 gap-1">
                                  {days.map((d, idx) => {
                                    if (!d)
                                      return <div key={idx} className="h-9" />;
                                    const disabled = d < minDateOnly;
                                    const selected =
                                      selectedDate &&
                                      isSameDate(selectedDate, d);
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() =>
                                          setSelectedDate(
                                            new Date(
                                              d.getFullYear(),
                                              d.getMonth(),
                                              d.getDate()
                                            )
                                          )
                                        }
                                        className={`h-9 w-full rounded-md text-sm flex items-center justify-center border transition-all ${
                                          disabled
                                            ? "text-gray-300 border-gray-200 cursor-not-allowed"
                                            : selected
                                            ? "text-white border-purple-400 bg-gradient-to-r from-purple-400 to-indigo-400 shadow-sm"
                                            : "text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                        }`}
                                      >
                                        {d.getDate()}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* 时间选择（下拉列表） */}
                                <div className="mt-3 flex items-center justify-between">
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setTimeOpen((v) => !v)}
                                      className="px-3 py-2 w-36 rounded-lg border-2 border-gray-200 bg-white text-gray-900 flex items-center justify-between focus:outline-none focus:border-purple-500 hover:border-gray-300"
                                    >
                                      <span className="flex items-center">
                                        <Clock className="w-4 h-4 text-purple-600 mr-2" />
                                        <span className="font-medium">
                                          {timeValue}
                                        </span>
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-gray-500" />
                                    </button>
                                    {timeOpen &&
                                      (() => {
                                        const minTimeStr = `${pad2(
                                          minDT.getHours()
                                        )}:${pad2(minDT.getMinutes())}`;
                                        const minTimeMinutes =
                                          toMinutes(minTimeStr);
                                        const disabledByMin = (opt: string) =>
                                          !!selectedDate &&
                                          isSameDate(
                                            selectedDate,
                                            minDateOnly
                                          ) &&
                                          toMinutes(opt) < minTimeMinutes;
                                        return (
                                          <div className="absolute z-30 mt-2 w-40 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-lg p-2 max-h-40 overflow-y-auto snap-y snap-mandatory scrollbar-beauty">
                                            {timeOptions.map((opt) => {
                                              const disabled =
                                                disabledByMin(opt);
                                              const selected =
                                                timeValue === opt;
                                              return (
                                                <button
                                                  key={opt}
                                                  type="button"
                                                  disabled={disabled}
                                                  onClick={() => {
                                                    if (!disabled) {
                                                      setTimeValue(opt);
                                                      setTimeOpen(false);
                                                    }
                                                  }}
                                                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all mb-1 ${
                                                    disabled
                                                      ? "text-gray-300 border-gray-200 cursor-not-allowed"
                                                      : selected
                                                      ? "text-white border-purple-400 bg-gradient-to-r from-purple-400 to-indigo-400 shadow-sm"
                                                      : "text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                  }`}
                                                >
                                                  {opt}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()}
                                  </div>

                                  <div className="space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeadlineOpen(false);
                                        setTimeOpen(false);
                                      }}
                                      className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                                    >
                                      取消
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const base =
                                          selectedDate ?? minDateOnly;
                                        const [hh, mm] = timeValue.split(":");
                                        const composed = new Date(
                                          base.getFullYear(),
                                          base.getMonth(),
                                          base.getDate(),
                                          Number(hh),
                                          Number(mm)
                                        );
                                        const v = formatDateTimeLocal(composed);
                                        setDeadline(v);
                                        setDeadlineOpen(false);
                                        setTimeOpen(false);
                                      }}
                                      className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm hover:from-purple-600 hover:to-indigo-600"
                                    >
                                      应用
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Info className="w-3 h-3 mr-1" />
                        只能选择未来一周后的时间
                      </p>
                      <AnimatePresence>
                        {errors.deadline && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-sm text-red-600 flex items-center"
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {errors.deadline}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* 最小押注和参考链接 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <Coins className="w-4 h-4 mr-2 text-purple-500" />
                        最小押注 (USDT)
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="10"
                        value={minStake}
                        onChange={(e) => setMinStake(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-0 text-gray-900 ${
                          errors.minStake
                            ? "border-red-300 focus:border-red-400"
                            : "border-gray-200 focus:border-purple-400"
                        }`}
                      />
                      <AnimatePresence>
                        {errors.minStake && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-sm text-red-600 flex items-center"
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {errors.minStake}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LinkIcon className="w-4 h-4 mr-2 text-purple-500" />
                        参考链接 (可选)
                      </label>
                      <input
                        type="url"
                        value={referenceUrl}
                        onChange={(e) => setReferenceUrl(e.target.value)}
                        placeholder="例如：新闻源或数据网站链接"
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-0 placeholder:text-gray-400 text-gray-900 ${
                          errors.referenceUrl
                            ? "border-red-300 focus:border-red-400"
                            : "border-gray-200 focus:border-purple-400"
                        }`}
                      />
                      <AnimatePresence>
                        {errors.referenceUrl && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-sm text-red-600 flex items-center"
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {errors.referenceUrl}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* 图片上传区域 */}
                  <div className="space-y-3">
                    <label className="flex items-center text-sm font-semibold text-gray-700">
                      <Image className="w-4 h-4 mr-2 text-purple-500" />
                      事件图片
                      <span className="text-blue-500 ml-1">（可选）</span>
                    </label>

                    {/* 按钮选择区域 */}
                    <div className="flex space-x-3">
                      {/* 上传图片按钮 */}
                      <button
                        type="button"
                        className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 border rounded-lg transition-colors ${
                          imageFile
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                        }`}
                        onClick={() =>
                          document.getElementById("image-upload")?.click()
                        }
                      >
                        <Upload className="w-5 h-5" />
                        <span>{imageFile ? "已选择图片" : "上传图片"}</span>
                      </button>

                      {/* 自动生成按钮 */}
                      <button
                        type="button"
                        className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 border rounded-lg transition-colors relative overflow-hidden ${
                          autoGenerateStatus === "active"
                            ? "border-blue-500 bg-blue-100 text-blue-700 cursor-not-allowed"
                            : !imageFile && title.trim()
                            ? "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                        }`}
                        onClick={() => {
                          if (autoGenerateStatus === "active") return;

                          setImageFile(null);
                          setImagePreview(null);
                          setErrors({});

                          if (title.trim()) {
                            setAutoGenerateStatus("active");

                            // 模拟生成过程
                            setTimeout(() => {
                              // 生成图片URL并设置预览
                              const newImageUrl = generateImageUrl(title);
                              setGeneratedImageUrl(newImageUrl);
                              setAutoGenerateStatus("success");
                              // 3秒后恢复初始状态
                              setTimeout(
                                () => setAutoGenerateStatus("idle"),
                                3000
                              );
                            }, 800);
                          }
                        }}
                        disabled={autoGenerateStatus === "active"}
                      >
                        {autoGenerateStatus === "active" ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            <span>生成中...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>自动生成</span>
                          </>
                        )}

                        {/* 加载动画效果 */}
                        {autoGenerateStatus === "active" && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-600/10 animate-pulse"></div>
                        )}
                      </button>
                    </div>

                    {/* 隐藏的文件输入 */}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />

                    {/* 图片预览和信息 */}
                    {imageFile && (
                      <div className="bg-gray-50 rounded-lg p-3 border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Image className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-green-700">
                              已选择图片
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-red-500 hover:text-red-700"
                            onClick={handleRemoveImage}
                          >
                            移除
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {imageFile.name}
                        </p>
                      </div>
                    )}

                    {/* 自动生成提示 */}
                    {!imageFile && title.trim() && (
                      <div
                        className={`rounded-lg p-3 border transition-all duration-300 ${
                          autoGenerateStatus === "success"
                            ? "bg-green-50 border-green-200"
                            : autoGenerateStatus === "active"
                            ? "bg-blue-100 border-blue-300"
                            : "bg-blue-50 border-blue-200"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {autoGenerateStatus === "success" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : autoGenerateStatus === "active" ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <Sparkles className="w-4 h-4 text-blue-500" />
                          )}
                          <span
                            className={`text-sm font-medium ${
                              autoGenerateStatus === "success"
                                ? "text-green-700"
                                : "text-blue-700"
                            }`}
                          >
                            {autoGenerateStatus === "success"
                              ? "✅ 已启用自动生成图片"
                              : autoGenerateStatus === "active"
                              ? "🔄 正在生成图片..."
                              : "将根据标题自动生成图片"}
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-1 ${
                            autoGenerateStatus === "success"
                              ? "text-green-600"
                              : "text-blue-600"
                          }`}
                        >
                          标题: "{title}"
                          {autoGenerateStatus === "success" && (
                            <span className="block mt-1">
                              提交时将自动生成个性化图片
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    <AnimatePresence>
                      {errors.image && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`text-sm flex items-center ${
                            errors.image.includes("推荐")
                              ? "text-blue-600"
                              : "text-red-600"
                          }`}
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.image}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {isUploadingImage && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>正在上传图片...</span>
                      </div>
                    )}

                    {/* 生成的图片预览 */}
                    {generatedImageUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Image className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700">
                              生成的图片预览
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setGeneratedImageUrl(null);
                              setAutoGenerateStatus("idle");
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            移除预览
                          </button>
                        </div>
                        <div className="flex justify-center">
                          <img
                            src={generatedImageUrl}
                            alt="生成的预览图片"
                            className="max-w-full h-32 object-contain rounded-lg border border-blue-300"
                          />
                        </div>
                        <p className="text-xs text-blue-600 mt-2 text-center">
                          此图片将在提交时保存到事件中
                        </p>
                      </motion.div>
                    )}

                    {/* 自动生成成功提示 */}
                    <AnimatePresence>
                      {autoGenerateStatus === "success" && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                        >
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <div>
                              <div className="text-sm font-medium text-green-700">
                                自动生成已启用
                              </div>
                              <div className="text-xs text-green-600 mt-1">
                                将根据标题"{title}"生成个性化图片
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 结算条件 */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700">
                      <CheckCircle className="w-4 h-4 mr-2 text-purple-500" />
                      结算条件
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        value={criteria}
                        onChange={(e) => setCriteria(e.target.value)}
                        rows={3}
                        placeholder="明确事件被判定为'达成/未达成'的客观条件，例如：2025年12月31日前，比特币价格达到或超过10万美元"
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-0 resize-none placeholder:text-gray-400 text-gray-900 ${
                          errors.criteria
                            ? "border-red-300 focus:border-red-400"
                            : "border-gray-200 focus:border-purple-400"
                        }`}
                        maxLength={300}
                      />
                      <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                        {criteria.length}/300
                      </div>
                    </div>
                    <AnimatePresence>
                      {errors.criteria && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-red-600 flex items-center"
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.criteria}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 提交错误显示 */}
                  <AnimatePresence>
                    {errors.submit && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center"
                      >
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        {errors.submit}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 提交按钮 */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                    <motion.button
                      type="submit"
                      disabled={isSubmitting || created}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                          创建中...
                        </>
                      ) : created ? (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          创建成功
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          创建事件
                        </>
                      )}
                    </motion.button>

                    <div className="flex items-center text-sm text-gray-500">
                      <Info className="w-4 h-4 mr-1" />
                      <span>提交后将保存到数据库并显示在趋势页面</span>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* 右侧：实时预览 */}
            <AnimatePresence>
              {(showPreview || window.innerWidth >= 1280) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="xl:col-span-1"
                >
                  <div className="sticky top-8">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
                      <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-3">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">
                          实时预览
                        </h2>
                      </div>

                      <motion.div
                        layout
                        className="rounded-2xl overflow-hidden shadow-lg border border-gray-100"
                      >
                        {/* 预览卡片头部 */}
                        <div
                          className={`p-4 bg-gradient-to-r ${
                            getCurrentCategory().color
                          } text-white relative overflow-hidden`}
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                          <div className="relative z-10">
                            <div className="flex items-center mb-2">
                              <span className="text-2xl mr-2">
                                {getCurrentCategory().icon}
                              </span>
                              <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded-full">
                                {category}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold leading-tight">
                              {title || "填写一个有吸引力的标题"}
                            </h3>
                          </div>
                        </div>

                        {/* 预览卡片内容 */}
                        <div className="p-4 bg-white">
                          <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                            {description ||
                              "描述事件背景与参与规则，让更多人理解并参与预测。"}
                          </p>

                          {/* 预览统计信息 */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center text-sm text-black">
                              <Clock className="w-4 h-4 mr-2 text-orange-500" />
                              <span className="truncate">
                                {deadline
                                  ? new Date(deadline).toLocaleDateString(
                                      "zh-CN"
                                    )
                                  : "未选择"}
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-black">
                              <Coins className="w-4 h-4 mr-2 text-yellow-500" />
                              <span>{minStake} USDT</span>
                            </div>
                          </div>

                          {/* 结算条件 */}
                          <div className="p-3 bg-gray-50 rounded-lg mb-4">
                            <div className="flex items-center mb-1">
                              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                              <span className="text-xs font-medium text-gray-600">
                                结算条件
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {criteria || "请明确结算条件"}
                            </p>
                          </div>

                          {/* 参考链接 */}
                          {referenceUrl && (
                            <a
                              href={referenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-purple-600 hover:text-purple-700 transition-colors"
                            >
                              <LinkIcon className="w-3 h-3 mr-1" />
                              参考链接
                            </a>
                          )}

                          {/* 模拟参与按钮 */}
                          <div className="flex gap-2 mt-4">
                            <button className="flex-1 py-2 px-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
                              支持 (预测达成)
                            </button>
                            <button className="flex-1 py-2 px-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
                              反对 (预测不达成)
                            </button>
                          </div>
                        </div>
                      </motion.div>

                      {/* 成功提示 */}
                      <AnimatePresence>
                        {created && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center"
                          >
                            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <div>
                              <div className="font-medium">创建成功！</div>
                              <div className="text-xs mt-1 opacity-80">
                                预测事件已保存，可在趋势页面查看
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* 页脚 */}
      <footer className="relative z-10 text-center py-8 text-gray-500 text-sm">
        <div className="flex items-center justify-center mb-2">
          <Sparkles className="w-4 h-4 mr-2" />
          <span>© 2025 Foresight - 预见未来，智慧预测</span>
        </div>
      </footer>
    </div>
  );
}
