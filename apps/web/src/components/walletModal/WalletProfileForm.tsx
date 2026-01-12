import { Loader2, Mail } from "lucide-react";

export type WalletProfileFormProps = {
  tWalletModal: (key: string) => string;
  tLogin: (key: string) => string;
  email: string;
  setEmail: (value: string) => void;
  otpRequested: boolean;
  otp: string;
  setOtp: (value: string) => void;
  emailLoading: boolean;
  emailVerified: boolean;
  codePreview: string | null;
  resendLeft: number;
  username: string;
  setUsername: (value: string) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  profileError: string | null;
  canSubmitProfile: boolean;
  profileLoading: boolean;
  requestRegisterOtp: () => Promise<void>;
  verifyRegisterOtp: () => Promise<void>;
  submitProfile: () => Promise<void>;
  onClose: () => void;
};

export function WalletProfileForm({
  tWalletModal,
  tLogin,
  email,
  setEmail,
  otpRequested,
  otp,
  setOtp,
  emailLoading,
  emailVerified,
  codePreview,
  resendLeft,
  username,
  setUsername,
  rememberMe,
  setRememberMe,
  profileError,
  canSubmitProfile,
  profileLoading,
  requestRegisterOtp,
  verifyRegisterOtp,
  submitProfile,
  onClose,
}: WalletProfileFormProps) {
  return (
    <div className="relative p-6 space-y-4">
      <h3 className="text-lg font-semibold">{tWalletModal("profile.title")}</h3>
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          {tWalletModal("profile.usernameLabel")}
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={tWalletModal("profile.usernamePlaceholder")}
          className="w-full rounded-xl border-2 border-purple-200 bg-white/95 px-3 py-2.5 text-base text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-400"
        />
        <label className="block text-sm font-semibold text-gray-900">{tLogin("emailLabel")}</label>
        <div className="relative">
          <Mail
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-500"
            aria-hidden="true"
          />
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-xl border-2 border-purple-200 bg-white/95 pl-10 pr-3 py-2.5 text-base text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={requestRegisterOtp}
            disabled={!/.+@.+\..+/.test(email) || emailLoading || resendLeft > 0}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-200 to-pink-300 text-purple-800 border border-purple-200 px-3 py-2 disabled:opacity-60 hover:from-purple-400 hover:to-pink-400 hover:text-white transition-all"
          >
            {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {tWalletModal("profile.sendOtpWithValidity")}
            {resendLeft > 0 ? ` (${resendLeft}s)` : ""}
          </button>
          {emailVerified && (
            <span className="text-sm text-green-600">{tWalletModal("profile.verifiedTag")}</span>
          )}
        </div>
        {resendLeft > 0 && (
          <div className="text-xs text-gray-600">
            {tWalletModal("profile.resendHintPrefix")}
            {resendLeft}
            {tWalletModal("profile.resendHintSuffix")}
          </div>
        )}
        {otpRequested && (
          <div className="space-y-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ""))}
              className="tracking-widest text-center text-lg w-full rounded-lg border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="••••••"
            />
            {codePreview && (
              <div className="text-xs text-green-600">
                {tWalletModal("devCodePreviewPrefix")}
                {codePreview}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={verifyRegisterOtp}
                disabled={otp.length !== 6 || emailLoading}
                className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-200 to-pink-300 text-purple-800 border border-purple-200 px-3 py-2 disabled:opacity-60 hover:from-purple-400 hover:to-pink-400 hover:text-white transition-all"
              >
                {tWalletModal("profile.verifyEmail")}
              </button>
            </div>
            <div className="text-xs text-gray-500">{tWalletModal("profile.otpTip")}</div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label htmlFor="remember-me" className="text-sm text-gray-700">
            {tWalletModal("profile.rememberMe")}
          </label>
        </div>
        {profileError && <div className="text-sm text-red-600">{profileError}</div>}
        <div className="flex items-center gap-2">
          <button
            onClick={submitProfile}
            disabled={!canSubmitProfile || profileLoading}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-200 to-pink-300 text-purple-800 border border-purple-200 px-4 py-2 disabled:opacity-60 hover:from-purple-400 hover:to-pink-400 hover:text-white transition-all"
          >
            {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {tWalletModal("profile.submit")}
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-gray-900"
          >
            {tWalletModal("profile.later")}
          </button>
        </div>
      </div>
    </div>
  );
}
