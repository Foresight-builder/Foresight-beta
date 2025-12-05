import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProposalModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProposalModalProps) {
  const { account, connectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"post" | "image" | "link">("post");
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "General",
    deadline: "",
  });

  const handleSubmit = async () => {
    if (!account) {
      connectWallet();
      return;
    }
    if (!form.title) return;

    try {
      setLoading(true);
      const res = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: 0,
          title: form.title,
          content: form.content,
          category: form.category,
          walletAddress: account,
        }),
      });

      if (res.ok) {
        setForm({ title: "", content: "", category: "General", deadline: "" });
        onSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh] border-2 border-white/80 ring-4 ring-purple-50/50"
          >
            {/* Header - More Vibrant */}
            <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-fuchsia-500 border border-fuchsia-100">
                  <Sparkles className="w-6 h-6 fill-current" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  New Proposal
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:scale-110 transition-all shadow-sm hover:shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs - Updated Style */}
            <div className="flex px-8 pt-6 gap-4">
              {[
                { id: "post", label: "Post", icon: null },
                { id: "image", label: "Media", icon: ImageIcon },
                { id: "link", label: "Link", icon: LinkIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    activeTab === tab.id
                      ? "bg-gray-900 text-white shadow-lg shadow-purple-500/20 scale-105"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form fields - Better Inputs */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="An interesting title..."
                  className="w-full px-6 py-4 rounded-3xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-fuchsia-200 focus:ring-4 focus:ring-fuchsia-50 outline-none text-lg font-bold text-gray-800 placeholder:text-gray-300 transition-all"
                  maxLength={300}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">
                  Content
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  placeholder={
                    activeTab === "post"
                      ? "Share your thoughts..."
                      : activeTab === "link"
                      ? "Paste URL here..."
                      : "Add a caption..."
                  }
                  rows={6}
                  className="w-full px-6 py-4 rounded-3xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-fuchsia-200 focus:ring-4 focus:ring-fuchsia-50 outline-none text-base font-medium text-gray-700 placeholder:text-gray-300 resize-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">
                  Category
                </label>
                <div className="flex flex-wrap gap-3">
                  {["General", "Tech", "Crypto", "Sports", "Politics"].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setForm({ ...form, category: cat })}
                        className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                          form.category === cat
                            ? "border-fuchsia-500 text-fuchsia-600 bg-fuchsia-50 shadow-sm"
                            : "border-gray-100 text-gray-400 hover:border-gray-200 bg-white"
                        }`}
                      >
                        r/{cat}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-gray-50/80 backdrop-blur flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !form.title}
                className="px-8 py-3 rounded-full bg-gray-900 text-white text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl shadow-purple-500/20"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Post Proposal
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
