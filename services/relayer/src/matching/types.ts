/**
 * 订单撮合引擎类型定义
 * 对标 Polymarket 的链下撮合 + 链上结算架构
 */

// ============ 订单相关类型 ============

export interface Order {
  id: string;
  marketKey: string;           // 市场标识: chainId:eventId
  maker: string;               // 订单创建者地址
  outcomeIndex: number;        // 结果索引 (0=Yes, 1=No)
  isBuy: boolean;              // 买/卖方向
  price: bigint;               // 价格 (6 decimals, max 1_000_000 = 1 USDC)
  amount: bigint;              // 订单总量 (18 decimals)
  remainingAmount: bigint;     // 剩余未成交量
  salt: string;                // 唯一盐值
  expiry: number;              // 过期时间戳 (0=永不过期)
  signature: string;           // EIP-712 签名
  chainId: number;             // 链 ID
  verifyingContract: string;   // 验证合约地址
  sequence: bigint;            // 排序序号 (时间优先)
  status: OrderStatus;         // 订单状态
  createdAt: number;           // 创建时间戳
}

export type OrderStatus = 
  | "pending"           // 等待验证
  | "open"              // 活跃挂单
  | "partially_filled"  // 部分成交
  | "filled"            // 完全成交
  | "canceled"          // 已取消
  | "expired"           // 已过期
  | "rejected";         // 被拒绝

// ============ 撮合相关类型 ============

export interface Match {
  id: string;                  // 撮合 ID
  makerOrder: Order;           // Maker 订单
  takerOrder: Order;           // Taker 订单
  matchedAmount: bigint;       // 成交数量
  matchedPrice: bigint;        // 成交价格 (Maker 价格)
  makerFee: bigint;            // Maker 手续费
  takerFee: bigint;            // Taker 手续费
  timestamp: number;           // 撮合时间
}

export interface MatchResult {
  success: boolean;
  matches: Match[];
  remainingOrder: Order | null; // 未完全成交的剩余订单
  error?: string;
}

// ============ 订单簿相关类型 ============

export interface PriceLevel {
  price: bigint;
  totalQuantity: bigint;
  orderCount: number;
  orders: Order[];             // 按时间优先排序
}

export interface DepthSnapshot {
  marketKey: string;
  outcomeIndex: number;
  bids: PriceLevel[];          // 买盘 (价格降序)
  asks: PriceLevel[];          // 卖盘 (价格升序)
  timestamp: number;
}

export interface OrderBookStats {
  marketKey: string;
  outcomeIndex: number;
  bestBid: bigint | null;
  bestAsk: bigint | null;
  spread: bigint | null;
  bidDepth: bigint;            // 买盘总深度
  askDepth: bigint;            // 卖盘总深度
  lastTradePrice: bigint | null;
  volume24h: bigint;
}

// ============ 交易相关类型 ============

export interface Trade {
  id: string;
  matchId: string;
  marketKey: string;
  outcomeIndex: number;
  maker: string;
  taker: string;
  isBuyerMaker: boolean;       // Maker 是否是买方
  price: bigint;
  amount: bigint;
  makerFee: bigint;
  takerFee: bigint;
  txHash?: string;             // 链上结算交易哈希
  blockNumber?: number;
  timestamp: number;
}

// ============ 事件类型 (用于 WebSocket 推送) ============

export type MarketEvent = 
  | { type: "order_placed"; order: Order }
  | { type: "order_canceled"; orderId: string; marketKey: string }
  | { type: "order_updated"; order: Order }
  | { type: "trade"; trade: Trade }
  | { type: "depth_update"; depth: DepthSnapshot }
  | { type: "stats_update"; stats: OrderBookStats };

// ============ 配置类型 ============

export interface MatchingEngineConfig {
  // 手续费配置 (基点, 1 bp = 0.01%)
  makerFeeBps: number;         // Maker 手续费率
  takerFeeBps: number;         // Taker 手续费率
  
  // 限制配置
  maxOrdersPerMarket: number;  // 每个市场最大订单数
  maxOrdersPerUser: number;    // 每个用户最大活跃订单数
  minOrderAmount: bigint;      // 最小订单金额
  maxOrderAmount: bigint;      // 最大订单金额
  
  // 价格精度
  priceDecimals: number;       // 价格小数位 (6 for USDC)
  amountDecimals: number;      // 数量小数位 (18 for shares)
  
  // 批量结算配置
  batchSettlementInterval: number;  // 批量结算间隔 (ms)
  batchSettlementThreshold: number; // 触发结算的最小撮合数
}

export const DEFAULT_CONFIG: MatchingEngineConfig = {
  makerFeeBps: 0,              // Maker 免手续费
  takerFeeBps: 50,             // Taker 0.5% 手续费
  maxOrdersPerMarket: 10000,
  maxOrdersPerUser: 100,
  minOrderAmount: 1_000_000_000_000n,     // 0.000001 shares (1e12)
  maxOrderAmount: 1_000_000_000_000_000_000_000n, // 1000 shares (1e21)
  priceDecimals: 6,
  amountDecimals: 18,
  batchSettlementInterval: 5000,
  batchSettlementThreshold: 10,
};

