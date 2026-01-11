import { useMemo, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { MarketInfo } from "../_lib/marketTypes";
import { useSettlementStatus } from "../_lib/hooks/useSettlementStatus";
import {
  assertOutcomeAction,
  settleAdapterAction,
  resolveMarketAction,
} from "../_lib/actions/settle";
import { Loader2, CheckCircle, AlertTriangle, Clock, ExternalLink } from "lucide-react";

type Props = {
  market: MarketInfo;
  outcomes: any[];
};

export function SettlementPanel({ market, outcomes }: Props) {
  const { account, provider, switchNetwork } = useWallet();
  const { status, loading } = useSettlementStatus(market);
  const [msg, setMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assertOutcomeIndex, setAssertOutcomeIndex] = useState(0);
  const [assertClaim, setAssertClaim] = useState("");

  const now = Math.floor(Date.now() / 1000);
  const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const assertionId = status?.assertionId;

  const umaUrl = useMemo(() => {
    if (!assertionId || assertionId === ZERO_HASH) return null;
    try {
      const url = new URL("https://oracle.uma.xyz/");
      url.searchParams.set("assertionId", assertionId);
      url.searchParams.set("chainId", String(market.chain_id));
      return url.toString();
    } catch {
      return `https://oracle.uma.xyz/`;
    }
  }, [assertionId, market.chain_id]);

  if (!status && loading)
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  if (!status) return null;

  const isExpired = now >= status.resolutionTime;
  const hasAssertion = status.assertionId && status.assertionId !== ZERO_HASH;

  const isDisputed =
    status.umaDisputer != null &&
    status.umaDisputer !== "" &&
    status.umaDisputer.toLowerCase() !== ZERO_ADDRESS;
  const isUmaSettled = status.umaAssertionSettled === true;
  const isDisputePending = status.oracleStatus === 1 && isDisputed && !isUmaSettled;

  const timeLeft =
    status.challengeEndTime != null ? Math.max(0, status.challengeEndTime - now) : null;
  const canSettle =
    !isDisputePending && (status.challengeEndTime != null ? now >= status.challengeEndTime : true);

  const formatDuration = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const shortHash = (hash: string) => {
    if (!hash || hash.length < 12) return hash;
    return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  };

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
        Settlement
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
                ? isDisputePending
                  ? "Pending (Disputed)"
                  : "Pending"
                : status.oracleStatus === 2
                  ? "Resolved"
                  : "Invalid"}
          </span>
          {typeof status.reassertionCount === "number" && status.reassertionCount > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Reassertions: {status.reassertionCount}
            </div>
          )}
        </div>
      </div>

      {hasAssertion && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-slate-500 dark:text-slate-400 text-xs uppercase mb-1">
              Assertion
            </div>
            <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {shortHash(status.assertionId)}
            </div>
          </div>
          {umaUrl && (
            <button
              type="button"
              onClick={() => window.open(umaUrl, "_blank", "noopener,noreferrer")}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on UMA
            </button>
          )}
        </div>
      )}

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
            {isDisputePending ? (
              <div className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 p-3 text-sm text-rose-900 dark:text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-medium">Disputed on UMA</div>
                  <div className="text-rose-800/80 dark:text-rose-200/80">
                    The assertion was disputed. Waiting for UMA to resolve it before settlement is
                    possible.
                  </div>
                  <div className="text-rose-800/80 dark:text-rose-200/80 mt-2 space-y-0.5">
                    {status.umaAsserter && (
                      <div className="truncate">Asserter: {shortHash(status.umaAsserter)}</div>
                    )}
                    {status.umaDisputer && (
                      <div className="truncate">Disputer: {shortHash(status.umaDisputer)}</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-medium">Challenge period</div>
                  {status.challengeEndTime != null ? (
                    now < status.challengeEndTime ? (
                      <div className="text-amber-800/80 dark:text-amber-200/80">
                        Ends in {formatDuration(timeLeft ?? 0)}. Anyone can dispute the assertion on
                        UMA.
                      </div>
                    ) : (
                      <div className="text-amber-800/80 dark:text-amber-200/80">
                        Challenge window ended. Anyone can settle the assertion.
                      </div>
                    )
                  ) : (
                    <div className="text-amber-800/80 dark:text-amber-200/80">
                      Assertion is pending. Disputes happen on UMA.
                    </div>
                  )}
                  {(status.umaAsserter || status.umaDisputer) && (
                    <div className="text-amber-800/70 dark:text-amber-200/70 mt-2 space-y-0.5">
                      {status.umaAsserter && (
                        <div className="truncate">Asserter: {shortHash(status.umaAsserter)}</div>
                      )}
                      {status.umaDisputer && (
                        <div className="truncate">Disputer: {shortHash(status.umaDisputer)}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {umaUrl && (
              <button
                type="button"
                onClick={() => window.open(umaUrl, "_blank", "noopener,noreferrer")}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Dispute / Verify on UMA
              </button>
            )}

            <button
              onClick={handleSettleOracle}
              disabled={isSubmitting || !canSettle}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
            >
              {isDisputePending ? "Waiting for UMA resolution" : "Settle Oracle"}
            </button>
            {!canSettle && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {isDisputePending
                  ? "UMA dispute in progress. Settlement will be available after resolution."
                  : "Settling is available after the challenge window ends."}
              </div>
            )}
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
