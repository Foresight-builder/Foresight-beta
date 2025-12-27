"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Puzzle } from "lucide-react";
import { useTranslations } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  walletName: string;
  installUrl: string;
};

export default function InstallPromptModal({ open, onClose, walletName, installUrl }: Props) {
  const tWallet = useTranslations("wallet");
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.98, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="relative w-[92vw] max-w-[520px] rounded-2xl bg-white shadow-[0_10px_30px_rgba(147,51,234,0.25)]"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-2xl" />
            <div className="px-6 pt-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-sm">
                  <Puzzle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {tWallet("notDetected").replace("{walletName}", walletName)}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{tWallet("installPrompt")}</div>
                </div>
              </div>
            </div>
            <div className="px-6 mt-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-700">{tWallet("safeInstallHint")}</div>
                <div className="mt-2 text-xs text-gray-500">{tWallet("refreshAfterInstall")}</div>
              </div>
            </div>
            <div className="px-6 pb-6 mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-900 hover:bg-gray-200 transition"
              >
                {tWallet("later")}
              </button>
              <a
                href={installUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-95 transition"
              >
                {tWallet("goInstall")}
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
