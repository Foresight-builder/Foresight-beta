"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { useFollowPrediction } from "@/hooks/useFollowPrediction";
import { createOrderDomain } from "@/lib/orderVerification";
import { ORDER_TYPES } from "@/types/market";
import { useTranslations } from "@/lib/i18n";

import { erc1155Abi, erc20Abi, marketAbi } from "./_lib/abis";
import { API_BASE, RELAYER_BASE, buildMarketKey } from "./_lib/constants";
import { safeJson } from "./_lib/http";
import {
  createBrowserProvider,
  ensureNetwork,
  getCollateralTokenContract,
  parseUnitsByDecimals,
} from "./_lib/wallet";
import type { PredictionDetail } from "./_lib/types";
export type { PredictionDetail } from "./_lib/types";

import type { MarketInfo } from "./_lib/marketTypes";
import { usePredictionData } from "./_lib/hooks/usePredictionData";
import { useMarketInfo } from "./_lib/hooks/useMarketInfo";
import { useOrderbookDepthPolling } from "./_lib/hooks/useOrderbookDepthPolling";
import { useTradesPolling } from "./_lib/hooks/useTradesPolling";
import { useUserOpenOrders } from "./_lib/hooks/useUserOpenOrders";
import { cancelOrderAction } from "./_lib/actions/cancelOrder";
import { mintAction } from "./_lib/actions/mint";
import { redeemAction } from "./_lib/actions/redeem";

export function usePredictionDetail() {
  const params = useParams();
  const { account, provider: walletProvider, switchNetwork } = useWallet();
  const tTrading = useTranslations("trading");

  const predictionIdRaw = (params as any).id;
  const predictionId = predictionIdRaw ? Number(predictionIdRaw) : undefined;

  const { prediction, loading, error } = usePredictionData(predictionIdRaw);
  const { market } = useMarketInfo(predictionIdRaw);

  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [tradeOutcome, setTradeOutcome] = useState<number>(0);
  const [priceInput, setPriceInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [orderMode, setOrderMode] = useState<"limit" | "best">("best");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);

  const [balance, setBalance] = useState<string>("0.00");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [shareBalance, setShareBalance] = useState<string>("0");
  const [mintInput, setMintInput] = useState<string>("");
  const { trades } = useTradesPolling(market);

  const { depthBuy, depthSell, bestBid, bestAsk } = useOrderbookDepthPolling({
    market,
    tradeOutcome,
    predictionIdRaw,
  });

  const { openOrders, setOpenOrders, refreshUserOrders } = useUserOpenOrders({
    market,
    account,
    predictionIdRaw,
  });

  const { following, followersCount, followLoading, followError, toggleFollow } =
    useFollowPrediction(predictionId, account || undefined);

  // 读取真实 USDC 余额（用于交易面板展示）
  useEffect(() => {
    let cancelled = false;
    if (!market || !account || !walletProvider) return;

    const run = async () => {
      try {
        const provider = await createBrowserProvider(walletProvider);
        // 尽量确保读到的余额来自正确网络
        await ensureNetwork(provider, market.chain_id, switchNetwork);
        const signer = await provider.getSigner();
        const { tokenContract, decimals } = await getCollateralTokenContract(market, signer, erc20Abi);
        const bal = await tokenContract.balanceOf(account);
        const human = Number(ethers.formatUnits(bal, decimals));
        if (!cancelled) setUsdcBalance(Number.isFinite(human) ? human.toFixed(2) : "0.00");
      } catch {
        // ignore
      }
    };

    void run();
    const timer = setInterval(run, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [market, account, walletProvider, switchNetwork]);

  // 读取当前 outcome 的可卖份额（ERC1155 balance）
  useEffect(() => {
    let cancelled = false;
    if (!market || !account || !walletProvider) return;

    const run = async () => {
      try {
        const provider = await createBrowserProvider(walletProvider);
        await ensureNetwork(provider, market.chain_id, switchNetwork);
        const signer = await provider.getSigner();
        const marketContract = new ethers.Contract(market.market, marketAbi, signer);
        const outcomeTokenAddress = await marketContract.outcomeToken();
        const outcome1155 = new ethers.Contract(outcomeTokenAddress, erc1155Abi, signer);
        // OutcomeToken1155.computeTokenId(market, outcomeIndex) = (uint160(market) << 32) | outcomeIndex
        const tokenId = (BigInt(market.market) << 32n) | BigInt(tradeOutcome);
        const bal = await outcome1155.balanceOf(account, tokenId);
        if (!cancelled) setShareBalance(BigInt(bal).toString());
      } catch {
        // ignore
      }
    };

    void run();
    const timer = setInterval(run, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [market, account, walletProvider, switchNetwork, tradeOutcome]);

  // 根据买/卖切换展示的余额：买显示 USDC，卖显示可卖份额
  useEffect(() => {
    if (tradeSide === "sell") setBalance(shareBalance);
    else setBalance(`USDC ${usdcBalance}`);
  }, [tradeSide, usdcBalance, shareBalance]);

  const cancelOrder = async (salt: string) => {
    if (!account || !market || !walletProvider || !predictionIdRaw) return;
    await cancelOrderAction({
      salt,
      account,
      market: market as MarketInfo,
      walletProvider,
      predictionIdRaw,
      tTrading,
      setOrderMsg,
      setOpenOrders,
    });
  };

  const handleMint = async (amountStr: string) => {
    if (!market || !account || !walletProvider) return;
    await mintAction({
      amountStr,
      market: market as MarketInfo,
      account,
      walletProvider,
      switchNetwork,
      erc20Abi,
      marketAbi,
      setOrderMsg,
    });
  };

  const handleRedeem = async (amountStr: string) => {
    if (!market || !account || !walletProvider) return;
    await redeemAction({
      amountStr,
      market: market as MarketInfo,
      account,
      walletProvider,
      switchNetwork,
      erc20Abi,
      erc1155Abi,
      marketAbi,
      setOrderMsg,
    });
  };

  const submitOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setOrderMsg(null);

    try {
      if (!market) throw new Error("市场信息未加载");
      if (!account) throw new Error("请先连接钱包");
      if (!walletProvider) throw new Error("钱包未初始化");

      const amountVal = parseFloat(amountInput);
      if (isNaN(amountVal) || amountVal <= 0) throw new Error("数量无效");
      const amountInt = Math.floor(amountVal);
      if (amountInt <= 0) throw new Error("数量无效");
      const amountBN = BigInt(amountInt);

      let priceBN: bigint | null = null;
      let priceFloat = 0;
      if (orderMode === "limit") {
        priceFloat = parseFloat(priceInput);
        if (isNaN(priceFloat) || priceFloat <= 0 || priceFloat >= 1) {
          throw new Error("价格无效 (0-1)");
        }
      }

      const provider = await createBrowserProvider(walletProvider);
      try {
        await ensureNetwork(provider, market.chain_id, switchNetwork);
      } catch (e: any) {
        throw new Error(`请切换到正确网络 (Chain ID: ${market.chain_id})`);
      }

      const signer = await provider.getSigner();
      const { tokenContract, decimals } = await getCollateralTokenContract(
        market,
        signer,
        erc20Abi
      );

      if (orderMode === "best") {
        const marketKey = buildMarketKey(market.chain_id, predictionIdRaw);
        const qs = new URLSearchParams({
          contract: market.market,
          chainId: String(market.chain_id),
          marketKey,
          outcome: String(tradeOutcome),
          side: tradeSide,
          amount: String(amountInt),
        });
        // 一次性拉取“成交计划”（包含将要吃掉的具体订单及每单 fillAmount）
        const planRes = await fetch(`${API_BASE}/orderbook/market-plan?${qs.toString()}`);
        const planJson = await safeJson(planRes);
        if (!planJson.success || !planJson.data) {
          throw new Error(planJson.message || "获取成交计划失败");
        }
        const plan = planJson.data as any;
        const filledBN = BigInt(String(plan.filledAmount || "0"));
        if (filledBN === 0n) throw new Error("当前订单簿流动性不足，无法成交");

        const totalCostBN = BigInt(String(plan.total || "0"));
        const avgPriceBN = BigInt(String(plan.avgPrice || "0"));
        const bestPriceBN = BigInt(String(plan.bestPrice || "0"));
        const worstPriceBN = BigInt(String(plan.worstPrice || plan.bestPrice || "0"));
        const slippageBpsNum = Number(String(plan.slippageBps || "0"));
        const fills = Array.isArray(plan.fills) ? (plan.fills as any[]) : [];

        const formatPriceNumber = (v: bigint) => {
          try {
            return Number(ethers.formatUnits(v, decimals));
          } catch {
            return Number(v);
          }
        };
        const formatAmountNumber = (v: bigint) => {
          try {
            return Number(v);
          } catch {
            return Number(v);
          }
        };

        const filledHuman = formatAmountNumber(filledBN);
        const avgPriceHuman = formatPriceNumber(avgPriceBN);
        const worstPriceHuman = formatPriceNumber(worstPriceBN);
        const totalHuman = formatPriceNumber(totalCostBN);

        const sideLabel = tradeSide === "buy" ? "买入" : "卖出";
        const slippagePercent = (slippageBpsNum || 0) / 100;
        const partialNote =
          filledBN < BigInt(amountInt) ? `（仅可成交 ${filledHuman}/${amountInt} 份）` : "";
        const confirmMsg = `预计以均价 ${avgPriceHuman.toFixed(
          4
        )} USDC 成交 ${filledHuman} 份${partialNote}，最大价格 ${worstPriceHuman.toFixed(
          4
        )} USDC，总${tradeSide === "buy" ? "花费" : "收入"}约 ${totalHuman.toFixed(
          2
        )} USDC，预计滑点约 ${slippagePercent.toFixed(2)}%。是否确认${sideLabel}？`;
        const ok = typeof window !== "undefined" ? window.confirm(confirmMsg) : true;
        if (!ok) {
          setOrderMsg("已取消");
          return;
        }

        if (tradeSide === "buy") {
          const allowance = await tokenContract.allowance(account, market.market);
          if (allowance < totalCostBN) {
            setOrderMsg("正在请求授权...");
            const txApp = await tokenContract.approve(market.market, ethers.MaxUint256);
            await txApp.wait();
          }
        } else {
          const marketContract = new ethers.Contract(market.market, marketAbi, signer);
          const outcomeTokenAddress = await marketContract.outcomeToken();
          const outcome1155 = new ethers.Contract(outcomeTokenAddress, erc1155Abi, signer);
          const isApproved = await outcome1155.isApprovedForAll(account, market.market);
          if (!isApproved) {
            setOrderMsg("请求预测代币授权...");
            const tx1155 = await outcome1155.setApprovalForAll(market.market, true);
            await tx1155.wait();
          }
        }

        if (!RELAYER_BASE) {
          throw new Error("撮合服务未配置，无法完成市价成交");
        }

        const marketContract = new ethers.Contract(market.market, marketAbi, signer);
        let remainingToFill = filledBN;
        let fillsDone = 0;

        for (const f of fills) {
          if (remainingToFill <= 0n) break;
          const fillAmount = BigInt(String(f.fillAmount || "0"));
          if (fillAmount <= 0n) continue;
          const req = f.req || {};
          const reqStruct = {
            maker: String(req.maker),
            outcomeIndex: Number(req.outcomeIndex),
            isBuy: Boolean(req.isBuy),
            price: BigInt(String(req.price)),
            amount: BigInt(String(req.amount)),
            expiry: BigInt(String(req.expiry || "0")),
            salt: BigInt(String(req.salt)),
          };

          setOrderMsg(`正在成交中... (${fillsDone + 1}/${fills.length})`);
          const tx = await marketContract.fillOrderSigned(reqStruct, String(f.signature), fillAmount);
          const receipt = await tx.wait();

          // 以链上事件为准，服务端 ingestTrade 会幂等落库并更新 maker 订单 remaining/status
          try {
            await fetch(`${API_BASE}/orderbook/report-trade`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chainId: market.chain_id,
                txHash: receipt.hash,
              }),
            });
          } catch {}

          remainingToFill -= fillAmount;
          fillsDone += 1;
        }

        if (remainingToFill > 0n) setOrderMsg("部分成交，剩余数量未能成交");
        else setOrderMsg("成交成功");
        setAmountInput("");
        await refreshUserOrders();
        return;
      }

      priceBN = parseUnitsByDecimals(priceFloat.toString(), decimals);

      if (tradeSide === "buy") {
        const cost = amountBN * priceBN;

        const allowance = await tokenContract.allowance(account, market.market);
        if (allowance < cost) {
          setOrderMsg("正在请求授权...");
          const tx = await tokenContract.approve(market.market, ethers.MaxUint256);
          await tx.wait();
          setOrderMsg("授权成功，正在下单...");
        }
      } else {
        const marketContract = new ethers.Contract(market.market, marketAbi, signer);
        const outcomeTokenAddress = await marketContract.outcomeToken();
        const outcome1155 = new ethers.Contract(outcomeTokenAddress, erc1155Abi, signer);

        const isApproved = await outcome1155.isApprovedForAll(account, market.market);
        if (!isApproved) {
          setOrderMsg("请求预测代币授权...");
          const tx = await outcome1155.setApprovalForAll(market.market, true);
          await tx.wait();
          setOrderMsg("授权成功，正在下单...");
        }
      }

      const salt = Math.floor(Math.random() * 1000000).toString();
      const expiry = Math.floor(Date.now() / 1000) + 3600 * 24;

      const value = {
        maker: account,
        outcomeIndex: BigInt(tradeOutcome),
        price: priceBN,
        amount: amountBN,
        isBuy: tradeSide === "buy",
        salt: BigInt(salt),
        expiry: BigInt(expiry),
      };

      const domain = createOrderDomain(market.chain_id, market.market);
      const signature = await signer.signTypedData(domain as any, ORDER_TYPES as any, value as any);

      const mk = `${market.chain_id}:${predictionIdRaw}`;
      const payload = {
        order: {
          maker: account,
          outcomeIndex: tradeOutcome,
          isBuy: tradeSide === "buy",
          price: priceBN.toString(),
          amount: amountBN.toString(),
          salt,
          expiry,
        },
        signature,
        chainId: market.chain_id,
        contract: market.market,
        verifyingContract: market.market,
        marketKey: mk,
        eventId: Number(predictionIdRaw),
      };

      const res = await fetch(`${API_BASE}/orderbook/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (json.success) {
        setOrderMsg("下单成功！");
        setAmountInput("");
        await refreshUserOrders();
      } else {
        throw new Error(json.message || "下单失败");
      }
    } catch (e: any) {
      let msg = e?.message || "交易失败";
      if (tradeSide === "sell") {
        const lower = msg.toLowerCase();
        const looksLikeNoBalance =
          lower.includes("insufficient") ||
          lower.includes("balance") ||
          lower.includes("no tokens") ||
          lower.includes("not enough");
        if (looksLikeNoBalance) {
          msg = "卖单失败：您的可卖预测代币数量不足，请先在下方完成铸币后再尝试挂卖单。";
        } else {
          msg =
            msg + "。如果尚未在下方完成铸币，可能是因为当前没有可卖的预测代币，请先铸币再试一次。";
        }
      }
      setOrderMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    loading,
    error,
    prediction,
    market,
    account,
    followersCount,
    following,
    toggleFollow,
    followLoading,
    followError,
    tradeSide,
    setTradeSide,
    tradeOutcome,
    setTradeOutcome,
    priceInput,
    setPriceInput,
    amountInput,
    setAmountInput,
    orderMode,
    setOrderMode,
    isSubmitting,
    orderMsg,
    depthBuy,
    depthSell,
    bestBid,
    bestAsk,
    openOrders,
    trades,
    balance,
    mintInput,
    setMintInput,
    handleMint,
    handleRedeem,
    submitOrder,
    cancelOrder,
  };
}
