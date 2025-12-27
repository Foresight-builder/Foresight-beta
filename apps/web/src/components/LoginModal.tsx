"use client";
import React, { useEffect, useMemo, useState } from "react";
import { X, Mail, Wallet, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useTranslations } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import WalletModal from "./WalletModal";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "email" | "wallet";
}

export default function LoginModal({ open, onClose, defaultTab = "email" }: LoginModalProps) {
  const { user, requestEmailOtp, verifyEmailOtp, sendMagicLink, error } = useAuth();
  const { account } = useWallet();

  const [tab, setTab] = useState<"email" | "wallet">(defaultTab);
  const [email, setEmail] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const tLogin = useTranslations("login");

  useEffect(() => {
    if (!open) return;
    if (user || account) {
      onClose();
    }
  }, [user, account, open, onClose]);

  useEffect(() => {
    if (!open) {
      setTab(defaultTab);
      setEmail("");
      setOtpRequested(false);
      setOtp("");
      setLoading(false);
      setWalletModalOpen(false);
    }
  }, [open, defaultTab]);

  const canRequest = useMemo(() => {
    return /.+@.+\..+/.test(email);
  }, [email]);

  const handleRequestOtp = async () => {
    if (!canRequest) return;
    setLoading(true);
    try {
      await requestEmailOtp(email);
      setOtpRequested(true);
    } catch {}
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!email || !otp) return;
    setLoading(true);
    try {
      await verifyEmailOtp(email, otp);
      onClose();
    } catch {}
    setLoading(false);
  };

  const handleSendMagicLink = async () => {
    if (!canRequest) return;
    setLoading(true);
    try {
      await sendMagicLink(email);
      setOtpRequested(true);
    } catch {}
    setLoading(false);
  };

  const openWalletFlow = () => {
    setTab("wallet");
    setWalletModalOpen(true);
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        ariaLabelledby="login-modal-title"
        ariaDescribedby="login-modal-description"
        containerClassName="w-full max-w-md rounded-xl shadow-xl bg-white"
      >
        <div>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === "email" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setTab("email")}
              >
                {tLogin("tabEmail")}
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === "wallet" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
                onClick={openWalletFlow}
              >
                {tLogin("tabWallet")}
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label={tLogin("close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {tab === "email" ? (
            <div className="px-6 py-6">
              {!otpRequested ? (
                <div className="space-y-4">
                  <h3 id="login-modal-title" className="text-lg font-semibold">
                    {tLogin("emailContinueTitle")}
                  </h3>
                  <p id="login-modal-description" className="text-sm text-gray-600">
                    {tLogin("emailContinueDescription")}
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {tLogin("emailLabel")}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={tLogin("emailPlaceholder")}
                      className="w-full rounded-md border px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  {error && <div className="text-sm text-red-600">{error}</div>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRequestOtp}
                      disabled={!canRequest || loading}
                      className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {tLogin("sendOtp")}
                    </button>
                    <button
                      onClick={handleSendMagicLink}
                      disabled={!canRequest || loading}
                      className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-gray-900 disabled:opacity-60"
                    >
                      {tLogin("sendMagicLink")}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {tLogin("agreePrefix")}
                    <a href="/terms" target="_blank" className="underline ml-1">
                      {tLogin("terms")}
                    </a>
                    {tLogin("and")}
                    <a href="/privacy" target="_blank" className="underline ml-1">
                      {tLogin("privacy")}
                    </a>
                    {tLogin("agreeSuffix")}
                  </p>
                  <div className="text-xs text-gray-500">{tLogin("switchToWallet")}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 id="login-modal-title" className="text-lg font-semibold">
                    {tLogin("otpTitle")}
                  </h3>
                  <p id="login-modal-description" className="text-sm text-gray-600">
                    {tLogin("otpDescriptionPrefix")} <span className="font-medium">{email}</span>
                    {tLogin("otpDescriptionSuffix")}
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="tracking-widest text-center text-lg w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="••••••"
                  />
                  {error && <div className="text-sm text-red-600">{error}</div>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleVerifyOtp}
                      disabled={otp.length !== 6 || loading}
                      className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {tLogin("verifyAndLogin")}
                    </button>
                    <button
                      onClick={handleRequestOtp}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-gray-900"
                    >
                      {tLogin("resend")}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{tLogin("otpHint")}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-6 space-y-4">
              <h3 id="login-modal-title" className="text-lg font-semibold">
                {tLogin("walletContinueTitle")}
              </h3>
              <p id="login-modal-description" className="text-sm text-gray-600">
                {tLogin("walletContinueDescription")}
              </p>
              <button
                onClick={openWalletFlow}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-3 text-white"
              >
                <Wallet className="w-5 h-5" />
                {tLogin("tabWallet")}
              </button>
              <p className="text-xs text-gray-500">{tLogin("switchToEmail")}</p>
            </div>
          )}
        </div>
      </Modal>

      {walletModalOpen && (
        <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
      )}
    </>
  );
}
