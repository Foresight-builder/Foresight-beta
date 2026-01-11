import { useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { useWallet } from "@/contexts/WalletContext";
import { MarketInfo } from "../_lib/marketTypes";
import { useSettlementStatus } from "../_lib/hooks/useSettlementStatus";
import {
  assertOutcomeAction,
  settleAdapterAction,
  resolveMarketAction,
} from "../_lib/actions/settle";
import { Loader2, CheckCircle, AlertTriangle, Clock } from "lucide-react";

type Props = {
  market: MarketInfo;
  outcomes: any[];
};

export function SettlementPanel({ market, outcomes }: Props) {
  const t = useTranslations("market");
  const { account, provider, switchNetwork } = useWallet();
  const { status, loading } = useSettlementStatus(market);
  const [msg, setMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assertOutcomeIndex, setAssertOutcomeIndex] = useState(0);
  const [assertClaim, setAssertClaim] = useState("");

  if (!status && loading)
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  if (!status) return null;

  const now = Math.floor(Date.now() / 1000);
  const isExpired = now >= status.resolutionTime;

  // Actions
  const handleAssert = async () => {
    if (!account || !provider) return;
    setIsSubmitting(true);
    try {
      await assertOutcomeAction({
        market,
        outcomeIndex: assertOutcomeIndex,
        claim: assertClaim || "Asserted via Foresight UI",
        account,
        walletProvider: provider,
        switchNetwork,
        setMsg,
      });
      setMsg(null);
    } catch (e: any) {
      console.error(e);
      setMsg(e.reason || e.message || "Transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleOracle = async () => {
    if (!account || !provider) return;
    setIsSubmitting(true);
    try {
      await settleAdapterAction({
        market,
        account,
        walletProvider: provider,
        switchNetwork,
        setMsg,
      });
      setMsg(null);
    } catch (e: any) {
      console.error(e);
      setMsg(e.reason || e.message || "Transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveMarket = async () => {
    if (!account || !provider) return;
    setIsSubmitting(true);
    try {
      await resolveMarketAction({
        market,
        account,
        walletProvider: provider,
        switchNetwork,
        setMsg,
      });
      setMsg(null);
    } catch (e: any) {
      console.error(e);
      setMsg(e.reason || e.message || "Transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
      <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
        Settlement & Resolution
      </h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
          <span className="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">
            Market State
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {status.marketState === 0
              ? "Trading"
              : status.marketState === 1
                ? "Resolved"
                : "Invalid"}
          </span>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
          <span className="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">
            Oracle Status
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {status.oracleStatus === 0
              ? "None"
              : status.oracleStatus === 1
                ? "Pending"
                : status.oracleStatus === 2
                  ? "Resolved"
                  : "Invalid"}
          </span>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> {msg}
        </div>
      )}

      {/* Logic for buttons */}
      <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* 1. Assert Outcome */}
        {status.marketState === 0 && isExpired && status.oracleStatus === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The market has expired. You can now assert the outcome to start the settlement
              process.
            </p>
            <div className="flex gap-2 flex-col sm:flex-row">
              <select
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={assertOutcomeIndex}
                onChange={(e) => setAssertOutcomeIndex(Number(e.target.value))}
              >
                {outcomes.map((o, i) => (
                  <option key={i} value={i}>
                    {o.label || `Outcome ${i}`}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Supporting evidence (url, text)"
                className="flex-[2] rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={assertClaim}
                onChange={(e) => setAssertClaim(e.target.value)}
              />
            </div>
            <button
              onClick={handleAssert}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
            >
              Assert Outcome
            </button>
          </div>
        )}

        {/* 2. Settle Oracle */}
        {status.oracleStatus === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Oracle assertion is pending. If the challenge period has passed without disputes, you
              can settle it.
            </p>
            <button
              onClick={handleSettleOracle}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
            >
              Settle Oracle
            </button>
          </div>
        )}

        {/* 3. Resolve Market */}
        {status.marketState === 0 && (status.oracleStatus === 2 || status.oracleStatus === 3) && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Oracle has finalized the outcome. You can now resolve the market to enable
              redemptions.
            </p>
            <button
              onClick={handleResolveMarket}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
            >
              Resolve Market
            </button>
          </div>
        )}

        {/* 4. Resolved Info */}
        {(status.marketState === 1 || status.marketState === 2) && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-sm">
            <CheckCircle className="w-5 h-5" />
            <span>
              Market is resolved. Winning outcome:{" "}
              <strong>
                {status.marketState === 1 ? outcomes[status.oracleOutcome]?.label : "Invalid"}
              </strong>
            </span>
          </div>
        )}

        {/* Not expired yet */}
        {!isExpired && status.marketState === 0 && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-sm">
            <Clock className="w-5 h-5" />
            <span>
              Market will expire on {new Date(status.resolutionTime * 1000).toLocaleString()}.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
