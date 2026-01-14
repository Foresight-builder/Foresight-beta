import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { marketAbi, oracleAdapterAbi } from "../abis";
import { createBrowserProvider } from "../wallet";
import type { MarketInfo } from "../marketTypes";
import { getConfiguredRpcUrl } from "@/lib/runtimeConfig";

export type SettlementStatus = {
  marketState: number; // 0: TRADING, 1: RESOLVED, 2: INVALID
  oracleStatus: number; // 0: NONE, 1: PENDING, 2: RESOLVED, 3: INVALID
  oracleOutcome: number;
  assertionId: string;
  reassertionCount?: number;
  resolutionTime: number;
  marketId: string;
  oracleAddress: string;
  assertionTimestamp?: number | null;
  challengeEndTime?: number | null;
  umaAddress?: string | null;
  defaultLiveness?: number | null;
  umaAsserter?: string | null;
  umaDisputer?: string | null;
  umaAssertionSettled?: boolean | null;
  umaSettlementResolution?: boolean | null;
};

function estimateAvgBlockTimeSeconds(chainId: number) {
  switch (chainId) {
    case 137:
    case 80002:
      return 2;
    case 11155111:
      return 12;
    default:
      return 12;
  }
}

function getRpcUrl(chainId: number) {
  try {
    return getConfiguredRpcUrl(chainId);
  } catch {
    return null;
  }
}

export function useSettlementStatus(market: MarketInfo | null) {
  const { provider: walletProvider } = useWallet();
  const [status, setStatus] = useState<SettlementStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const detailsCacheRef = useRef(
    new Map<
      string,
      {
        assertionTimestamp: number | null;
        challengeEndTime: number | null;
        umaAddress: string | null;
        defaultLiveness: number | null;
        umaAsserter: string | null;
        umaDisputer: string | null;
        umaAssertionSettled: boolean | null;
        umaSettlementResolution: boolean | null;
      }
    >()
  );

  useEffect(() => {
    if (!market || !market.market) return;

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        let provider: any = null;

        if (walletProvider) {
          provider = await createBrowserProvider(walletProvider);
        } else {
          const rpcUrl = getRpcUrl(market.chain_id);
          if (!rpcUrl) return;
          provider = new ethers.JsonRpcProvider(rpcUrl);
        }

        const marketContract = new ethers.Contract(market.market, marketAbi, provider);

        const [state, resolutionTime, oracleAddr, mId] = await Promise.all([
          marketContract.state(),
          marketContract.resolutionTime(),
          marketContract.oracle(),
          marketContract.marketId(),
        ]);

        // Check if oracle is a contract (it should be)
        const code = await provider.getCode(oracleAddr);
        if (code === "0x") {
          // Not a contract or deployed yet
          if (!cancelled) {
            setStatus({
              marketState: Number(state),
              oracleStatus: 0,
              oracleOutcome: 0,
              assertionId: ethers.ZeroHash,
              resolutionTime: Number(resolutionTime),
              marketId: String(mId),
              oracleAddress: String(oracleAddr),
            });
          }
          return;
        }

        const oracleContract = new ethers.Contract(oracleAddr, oracleAdapterAbi, provider);
        // Try/catch for getMarketStatus as it might not be the UMA adapter or might fail
        try {
          const [oracleStatus, oracleOutcome, assertionId, reassertionCount] =
            await oracleContract.getMarketStatus(mId);

          const baseStatus: SettlementStatus = {
            marketState: Number(state),
            oracleStatus: Number(oracleStatus),
            oracleOutcome: Number(oracleOutcome),
            assertionId: String(assertionId),
            reassertionCount: Number(reassertionCount),
            resolutionTime: Number(resolutionTime),
            marketId: String(mId),
            oracleAddress: String(oracleAddr),
          };

          const detailKey = `${String(oracleAddr).toLowerCase()}:${String(assertionId).toLowerCase()}`;
          const shouldFetchDetails =
            baseStatus.oracleStatus === 1 && baseStatus.assertionId !== ethers.ZeroHash;

          if (shouldFetchDetails && !detailsCacheRef.current.has(detailKey)) {
            let umaAddress: string | null = null;
            let defaultLiveness: number | null = null;
            let assertionTimestamp: number | null = null;
            let challengeEndTime: number | null = null;
            let umaAsserter: string | null = null;
            let umaDisputer: string | null = null;
            let umaAssertionSettled: boolean | null = null;
            let umaSettlementResolution: boolean | null = null;

            try {
              umaAddress = String(await oracleContract.uma());
            } catch {}

            if (umaAddress) {
              try {
                const umaContract = new ethers.Contract(
                  umaAddress,
                  [
                    "function defaultLiveness() view returns (uint64)",
                    "function getAssertion(bytes32) view returns (tuple(tuple(bool,bool,bool,address,address),address,uint64,bool,address,uint64,bool,bytes32,bytes32,uint256,address,address))",
                  ],
                  provider
                );

                try {
                  const assertion = await umaContract.getAssertion(assertionId);
                  const assertionTime = Number(assertion[2]);
                  const expirationTime = Number(assertion[5]);

                  if (Number.isFinite(assertionTime) && assertionTime > 0) {
                    assertionTimestamp = assertionTime;
                  }
                  if (Number.isFinite(expirationTime) && expirationTime > 0) {
                    challengeEndTime = expirationTime;
                  }

                  try {
                    umaAsserter = String(assertion[1]);
                  } catch {}
                  try {
                    umaAssertionSettled = Boolean(assertion[3]);
                  } catch {}
                  try {
                    umaSettlementResolution = Boolean(assertion[6]);
                  } catch {}
                  try {
                    umaDisputer = String(assertion[11]);
                  } catch {}

                  if (
                    defaultLiveness == null &&
                    assertionTimestamp != null &&
                    challengeEndTime != null
                  ) {
                    defaultLiveness = challengeEndTime - assertionTimestamp;
                  }
                } catch {}

                try {
                  const livenessRaw = await umaContract.defaultLiveness();
                  defaultLiveness = Number(livenessRaw);
                } catch {}
              } catch {}
            }

            try {
              if (assertionTimestamp == null) {
                const topic0 = ethers.id("OutcomeAsserted(bytes32,bytes32,uint8,bytes)");
                const lookbackSeconds = (defaultLiveness ?? 7200) * 3 + 3600;
                const avgBlockTimeSeconds = estimateAvgBlockTimeSeconds(market.chain_id);
                const lookbackBlocks = Math.ceil(lookbackSeconds / avgBlockTimeSeconds);
                const currentBlock = await provider.getBlockNumber();
                const fromBlock = Math.max(0, Number(currentBlock) - lookbackBlocks);
                const logs = await provider.getLogs({
                  address: oracleAddr,
                  fromBlock,
                  toBlock: "latest",
                  topics: [topic0, String(mId), String(assertionId)],
                });
                const last = logs.at(-1);
                if (last) {
                  const block = await provider.getBlock(last.blockNumber);
                  assertionTimestamp = Number(block?.timestamp ?? null);
                }
              }
            } catch {}

            if (challengeEndTime == null && assertionTimestamp != null && defaultLiveness != null) {
              challengeEndTime = assertionTimestamp + defaultLiveness;
            }

            detailsCacheRef.current.set(detailKey, {
              assertionTimestamp,
              challengeEndTime,
              umaAddress,
              defaultLiveness,
              umaAsserter,
              umaDisputer,
              umaAssertionSettled,
              umaSettlementResolution,
            });
          }

          const details = detailsCacheRef.current.get(detailKey);

          if (!cancelled) {
            setStatus({
              ...baseStatus,
              assertionTimestamp: details?.assertionTimestamp ?? null,
              challengeEndTime: details?.challengeEndTime ?? null,
              umaAddress: details?.umaAddress ?? null,
              defaultLiveness: details?.defaultLiveness ?? null,
              umaAsserter: details?.umaAsserter ?? null,
              umaDisputer: details?.umaDisputer ?? null,
              umaAssertionSettled: details?.umaAssertionSettled ?? null,
              umaSettlementResolution: details?.umaSettlementResolution ?? null,
            });
          }
        } catch (err) {
          // Maybe not the UMA adapter
          console.warn("Oracle does not support getMarketStatus", err);
          if (!cancelled) {
            setStatus({
              marketState: Number(state),
              oracleStatus: 0,
              oracleOutcome: 0,
              assertionId: ethers.ZeroHash,
              resolutionTime: Number(resolutionTime),
              marketId: String(mId),
              oracleAddress: String(oracleAddr),
              assertionTimestamp: null,
              challengeEndTime: null,
              umaAddress: null,
              defaultLiveness: null,
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch settlement status", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll every 10s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [market, walletProvider]);

  return { status, loading };
}
