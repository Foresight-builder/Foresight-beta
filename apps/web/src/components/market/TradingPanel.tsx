import React, { useState } from "react";
import { formatUnits } from "ethers";
import { useTranslations } from "@/lib/i18n";
import { TradeTabContent } from "./tradingPanel/TradeTabContent";
import { DepthTabContent } from "./tradingPanel/DepthTabContent";
import { HistoryTabContent, OrdersTabContent } from "./tradingPanel/OrdersHistoryTabs";

const BIGINT_ZERO = BigInt(0);
const BIGINT_THRESHOLD = BigInt("1000000000000");

interface TradingPanelData {
  market: any;
  prediction: any;
  account?: string | null;
  bestBid: string;
  bestAsk: string;
  balance: string;
  depthBuy: Array<{ price: string; qty: string }>;
  depthSell: Array<{ price: string; qty: string }>;
  userOrders: any[];
  trades?: any[];
  outcomes: any[];
}

interface TradingPanelState {
  tradeSide: "buy" | "sell";
  tradeOutcome: number;
  priceInput: string;
  amountInput: string;
  orderMode: "limit" | "best";
  tif: "GTC" | "IOC" | "FOK";
  postOnly: boolean;
  isSubmitting: boolean;
  orderMsg: string | null;
}

interface TradingPanelHandlers {
  setTradeSide: (s: "buy" | "sell") => void;
  setTradeOutcome: (i: number) => void;
  setPriceInput: (v: string) => void;
  setAmountInput: (v: string) => void;
  setOrderMode: (m: "limit" | "best") => void;
  setTif: (t: "GTC" | "IOC" | "FOK") => void;
  setPostOnly: (v: boolean) => void;
  submitOrder: () => void;
  cancelOrder: (salt: string) => void;
  handleMint: (amount: string) => void;
  handleRedeem: (amount: string) => void;
  setMintInput: (v: string) => void;
}

interface TradingPanelProps {
  data: TradingPanelData & { mintInput?: string };
  state: TradingPanelState;
  handlers: TradingPanelHandlers;
}

export function TradingPanel(props: TradingPanelProps) {
  const { data, state, handlers } = props;
  const {
    market,
    prediction,
    account,
    bestBid,
    bestAsk,
    balance,
    depthBuy,
    depthSell,
    userOrders,
    trades = [],
    outcomes,
    mintInput = "",
  } = data;
  const {
    tradeSide,
    tradeOutcome,
    priceInput,
    amountInput,
    orderMode,
    tif,
    postOnly,
    isSubmitting,
    orderMsg,
  } = state;
  const {
    setTradeSide,
    setTradeOutcome,
    setPriceInput,
    setAmountInput,
    setOrderMode,
    setTif,
    setPostOnly,
    submitOrder,
    cancelOrder,
    handleMint,
    handleRedeem,
    setMintInput,
  } = handlers;

  const [activeTab, setActiveTab] = useState<"trade" | "depth" | "orders" | "history">("trade");
  const tTrading = useTranslations("trading");
  const tCommon = useTranslations("common");

  const formatPrice = (p: string, showCents = false) => {
    try {
      const v = BigInt(p);
      if (v === BIGINT_ZERO) return "-";
      const decimals = v > BIGINT_THRESHOLD ? 18 : 6;
      const val = Number(formatUnits(v, decimals));
      if (showCents) {
        if (val < 1) return (val * 100).toFixed(1) + "¢";
      }
      return val.toFixed(2);
    } catch {
      return "-";
    }
  };

  const formatAmount = (raw: string) => {
    try {
      const v = BigInt(raw);
      if (v === BIGINT_ZERO) return "0";
      if (v > BIGINT_THRESHOLD) {
        return Number(formatUnits(v, 18)).toFixed(4);
      }
      return raw;
    } catch {
      return raw;
    }
  };

  const fillPrice = (p: string) => {
    setOrderMode("limit");
    setPriceInput(p);
  };

  const isWalletConnected = !!account;
  const isTradeTab = activeTab === "trade";
  const isManageTab = activeTab === "orders" || activeTab === "history";

  return (
    <div className="bg-white border border-purple-100 rounded-3xl overflow-hidden flex flex-col h-full min-h-[600px] shadow-xl shadow-purple-500/5 relative">
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isWalletConnected ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              1
            </div>
            <span className={isWalletConnected ? "font-semibold text-slate-800" : ""}>
              {tTrading("steps.connectWallet")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isTradeTab
                  ? "bg-gradient-to-r from-purple-200 to-pink-300 text-purple-800 border border-purple-200"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              2
            </div>
            <span className={isTradeTab ? "font-semibold text-slate-800" : ""}>
              {tTrading("steps.placeOrder")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isManageTab
                  ? "bg-gradient-to-r from-purple-200 to-pink-300 text-purple-800 border border-purple-200"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              3
            </div>
            <span className={isManageTab ? "font-semibold text-slate-800" : ""}>
              {tTrading("steps.manageOrders")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-100 bg-gray-50/50 p-1 mx-2 mt-3 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab("trade")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "trade"
              ? "text-purple-600 bg-white shadow-sm ring-1 ring-purple-100"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
          }`}
        >
          {tTrading("tabTrade")}
        </button>
        <button
          onClick={() => setActiveTab("depth")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "depth"
              ? "text-purple-600 bg-white shadow-sm ring-1 ring-purple-100"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
          }`}
        >
          {tTrading("depth")}
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "orders"
              ? "text-purple-600 bg-white shadow-sm ring-1 ring-purple-100"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
          }`}
        >
          {tTrading("myOrders")} ({userOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "history"
              ? "text-purple-600 bg-white shadow-sm ring-1 ring-purple-100"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
          }`}
        >
          {tTrading("tabHistory")}
        </button>
      </div>

      <div className="flex-1 p-5 overflow-y-auto">
        {activeTab === "trade" && (
          <TradeTabContent
            tradeSide={tradeSide}
            setTradeSide={setTradeSide}
            tradeOutcome={tradeOutcome}
            setTradeOutcome={setTradeOutcome}
            outcomes={outcomes}
            prediction={prediction}
            tTrading={tTrading}
            tCommon={tCommon}
            orderMode={orderMode}
            setOrderMode={setOrderMode}
            tif={tif}
            setTif={setTif}
            postOnly={postOnly}
            setPostOnly={setPostOnly}
            bestBid={bestBid}
            bestAsk={bestAsk}
            priceInput={priceInput}
            setPriceInput={setPriceInput}
            amountInput={amountInput}
            setAmountInput={setAmountInput}
            balance={balance}
            submitOrder={submitOrder}
            isSubmitting={isSubmitting}
            market={market}
            orderMsg={orderMsg}
            mintInput={mintInput}
            setMintInput={setMintInput}
            handleMint={handleMint}
            handleRedeem={handleRedeem}
            formatPrice={formatPrice}
            fillPrice={fillPrice}
          />
        )}

        {activeTab === "depth" && (
          <DepthTabContent
            depthBuy={depthBuy}
            depthSell={depthSell}
            bestBid={bestBid}
            bestAsk={bestAsk}
            formatPrice={formatPrice}
            formatAmount={formatAmount}
            fillPrice={fillPrice}
          />
        )}

        {activeTab === "orders" && (
          <OrdersTabContent
            userOrders={userOrders}
            outcomes={outcomes}
            tTrading={tTrading}
            tCommon={tCommon}
            cancelOrder={cancelOrder}
            formatPrice={formatPrice}
            formatAmount={formatAmount}
          />
        )}

        {activeTab === "history" && (
          <HistoryTabContent
            trades={trades}
            outcomes={outcomes}
            tTrading={tTrading}
            tCommon={tCommon}
            formatPrice={formatPrice}
            formatAmount={formatAmount}
          />
        )}
      </div>
    </div>
  );
}
