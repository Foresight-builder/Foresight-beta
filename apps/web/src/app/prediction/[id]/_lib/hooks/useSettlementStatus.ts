import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { marketAbi, oracleAdapterAbi } from "../abis";
import { createBrowserProvider } from "../wallet";
import type { MarketInfo } from "../marketTypes";

export type SettlementStatus = {
  marketState: number; // 0: TRADING, 1: RESOLVED, 2: INVALID
  oracleStatus: number; // 0: NONE, 1: PENDING, 2: RESOLVED, 3: INVALID
  oracleOutcome: number;
  assertionId: string;
  resolutionTime: number;
  marketId: string;
  oracleAddress: string;
};

function getRpcUrl(chainId: number) {
  switch (chainId) {
    case 80002:
      return process.env.NEXT_PUBLIC_RPC_POLYGON_AMOY || "https://rpc-amoy.polygon.technology/";
    case 137:
      return process.env.NEXT_PUBLIC_RPC_POLYGON || "https://polygon-rpc.com";
    case 11155111:
      return process.env.NEXT_PUBLIC_RPC_SEPOLIA || "https://rpc.sepolia.org";
    default:
      return null;
  }
}

export function useSettlementStatus(market: MarketInfo | null) {
  const { provider: walletProvider } = useWallet();
  const [status, setStatus] = useState<SettlementStatus | null>(null);
  const [loading, setLoading] = useState(false);

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
          // Fallback for read-only if possible, but for now just skip
          // We could use a default RPC if we knew the chain ID's RPC URL
          return;
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
          if (!cancelled) {
            setStatus({
              marketState: Number(state),
              oracleStatus: Number(oracleStatus),
              oracleOutcome: Number(oracleOutcome),
              assertionId: String(assertionId),
              resolutionTime: Number(resolutionTime),
              marketId: String(mId),
              oracleAddress: String(oracleAddr),
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
