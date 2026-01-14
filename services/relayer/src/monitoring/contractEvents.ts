/**
 * 智能合约事件监控服务
 * 用于监控关键合约事件，如市场创建、订单填充、市场结算等
 */

import { ethers, type ContractEvent, type Contract } from "ethers";
import { logger } from "./logger.js";
import { metricsRegistry, systemHealthy } from "./metrics.js";
import { Counter, Gauge } from "prom-client";
import dotenv from "dotenv";

dotenv.config();

// ============================================================// 全局变量// ============================================================

let contractEventListener: ContractEventListener | null = null;

// ============================================================// 合约事件相关指标// ============================================================// 市场相关指标
export const marketsCreatedTotal = new Counter({
  name: "foresight_contract_markets_created_total",
  help: "Total number of markets created",
  registers: [metricsRegistry],
});

export const marketsActive = new Gauge({
  name: "foresight_contract_markets_active",
  help: "Number of active markets",
  registers: [metricsRegistry],
});

// 订单相关指标
export const ordersFilledTotal = new Counter({
  name: "foresight_contract_orders_filled_total",
  help: "Total number of orders filled on-chain",
  registers: [metricsRegistry],
});

export const ordersCanceledTotal = new Counter({
  name: "foresight_contract_orders_canceled_total",
  help: "Total number of orders canceled on-chain",
  registers: [metricsRegistry],
});

// 市场状态变化指标
export const marketsResolvedTotal = new Counter({
  name: "foresight_contract_markets_resolved_total",
  help: "Total number of markets resolved",
  registers: [metricsRegistry],
});

export const marketsInvalidatedTotal = new Counter({
  name: "foresight_contract_markets_invalidated_total",
  help: "Total number of markets invalidated",
  registers: [metricsRegistry],
});

// 紧急事件指标
export const emergencyPausesTotal = new Counter({
  name: "foresight_contract_emergency_pauses_total",
  help: "Total number of emergency pauses",
  registers: [metricsRegistry],
});

export const emergencyUnpausesTotal = new Counter({
  name: "foresight_contract_emergency_unpauses_total",
  help: "Total number of emergency unpauses",
  registers: [metricsRegistry],
});

// ============================================================// 合约事件监听器// ============================================================

interface ContractEventListenerConfig {
  rpcUrl: string;
  marketFactoryAddress: string;
  marketFactoryAbi: any[];
  offchainMarketAbi: any[];
  outcomeTokenAbi: any[];
  eventHandlers?: Record<string, (event: any) => Promise<void>>;
}

class ContractEventListener {
  private provider: ethers.JsonRpcProvider;
  private marketFactory: Contract;
  private watchedMarkets: Map<string, Contract> = new Map();
  private isRunning: boolean = false;
  private config: ContractEventListenerConfig;
  private eventHandlers: Record<string, (event: any) => Promise<void>>;

  constructor(config: ContractEventListenerConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.marketFactory = new ethers.Contract(
      config.marketFactoryAddress,
      config.marketFactoryAbi,
      this.provider
    );

    // 初始化事件处理器
    this.eventHandlers = {
      ...this.getDefaultEventHandlers(),
      ...(config.eventHandlers || {}),
    };
  }

  private getDefaultEventHandlers(): Record<string, (event: any) => Promise<void>> {
    return {
      // MarketFactory 事件
      MarketCreated: async (event: any) => {
        const marketAddress = event.args.market;
        marketsCreatedTotal.inc();
        marketsActive.inc();

        logger.info("Market created", {
          marketId: event.args.marketId,
          marketAddress,
          creator: event.args.creator,
          templateId: event.args.templateId,
          resolutionTime: event.args.resolutionTime,
        });

        // 开始监听新创建的市场
        this.watchMarket(marketAddress);
      },

      // 市场事件
      OrderFilledSigned: async (event: any) => {
        ordersFilledTotal.inc();
        logger.info("Order filled on-chain", {
          marketAddress: event.address,
          maker: event.args.maker,
          taker: event.args.taker,
          outcomeIndex: event.args.outcomeIndex,
          amount: event.args.amount.toString(),
          price: event.args.price.toString(),
        });
      },

      OrderSaltCanceled: async (event: any) => {
        ordersCanceledTotal.inc();
        logger.info("Order canceled on-chain", {
          marketAddress: event.address,
          maker: event.args.maker,
          salt: event.args.salt.toString(),
        });
      },

      Resolved: async (event: any) => {
        marketsResolvedTotal.inc();
        marketsActive.dec();
        logger.info("Market resolved", {
          marketAddress: event.address,
          outcomeIndex: event.args.outcomeIndex.toString(),
        });
      },

      Invalidated: async (event: any) => {
        marketsInvalidatedTotal.inc();
        marketsActive.dec();
        logger.warn("Market invalidated", {
          marketAddress: event.address,
        });
      },

      Paused: async (event: any) => {
        emergencyPausesTotal.inc();
        logger.warn("Emergency pause activated", {
          marketAddress: event.address,
          by: event.args.by,
        });

        // 触发告警
        this.handleEmergencyEvent("pause", event);
      },

      Unpaused: async (event: any) => {
        emergencyUnpausesTotal.inc();
        logger.info("Emergency pause deactivated", {
          marketAddress: event.address,
          by: event.args.by,
        });
      },

      CompleteSetMinted: async (event: any) => {
        logger.info("Complete set minted", {
          marketAddress: event.address,
          user: event.args.user,
          amount: event.args.amount18.toString(),
        });
      },

      Redeemed: async (event: any) => {
        logger.info("Tokens redeemed", {
          marketAddress: event.address,
          user: event.args.user,
          amount: event.args.amount18.toString(),
          outcomeIndex: event.args.outcomeIndex,
        });
      },
    };
  }

  /**
   * 启动事件监听器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Contract event listener already running");
      return;
    }

    logger.info("Starting contract event listener");

    // 监听市场工厂事件
    this.marketFactory.on("MarketCreated", (event: any) => {
      this.handleEvent("MarketCreated", event);
    });

    // 监听工厂的暂停事件
    this.marketFactory.on("Paused", (event: any) => {
      this.handleEvent("Paused", event);
    });

    this.marketFactory.on("Unpaused", (event: any) => {
      this.handleEvent("Unpaused", event);
    });

    this.isRunning = true;
    systemHealthy.set(1);
    logger.info("Contract event listener started");
  }

  /**
   * 停止事件监听器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn("Contract event listener already stopped");
      return;
    }

    logger.info("Stopping contract event listener");

    // 移除所有事件监听器
    this.marketFactory.removeAllListeners();

    // 停止监听所有市场
    for (const marketAddress of this.watchedMarkets.keys()) {
      this.unwatchMarket(marketAddress);
    }

    this.isRunning = false;
    systemHealthy.set(0);
    logger.info("Contract event listener stopped");
  }

  /**
   * 监听单个市场
   */
  private watchMarket(marketAddress: string): void {
    if (this.watchedMarkets.has(marketAddress)) {
      return;
    }

    const market = new ethers.Contract(marketAddress, this.config.offchainMarketAbi, this.provider);

    // 添加市场事件监听器
    market.on("OrderFilledSigned", (event: any) => {
      this.handleEvent("OrderFilledSigned", event);
    });

    market.on("OrderSaltCanceled", (event: any) => {
      this.handleEvent("OrderSaltCanceled", event);
    });

    market.on("Resolved", (event: any) => {
      this.handleEvent("Resolved", event);
    });

    market.on("Invalidated", (event: any) => {
      this.handleEvent("Invalidated", event);
    });

    market.on("Paused", (event: any) => {
      this.handleEvent("Paused", event);
    });

    market.on("Unpaused", (event: any) => {
      this.handleEvent("Unpaused", event);
    });

    market.on("CompleteSetMinted", (event: any) => {
      this.handleEvent("CompleteSetMinted", event);
    });

    market.on("Redeemed", (event: any) => {
      this.handleEvent("Redeemed", event);
    });

    this.watchedMarkets.set(marketAddress, market);
    logger.debug("Started watching market", { marketAddress });
  }

  /**
   * 停止监听单个市场
   */
  private unwatchMarket(marketAddress: string): void {
    const market = this.watchedMarkets.get(marketAddress);
    if (market) {
      market.removeAllListeners();
      this.watchedMarkets.delete(marketAddress);
      logger.debug("Stopped watching market", { marketAddress });
    }
  }

  /**
   * 处理合约事件
   */
  private async handleEvent(eventName: string, event: any): Promise<void> {
    try {
      const handler = this.eventHandlers[eventName];
      if (handler) {
        await handler(event);
      } else {
        logger.debug("Unhandled contract event", {
          eventName,
          eventAddress: event.address,
        });
      }
    } catch (error) {
      logger.error("Error handling contract event", {
        eventName,
        eventAddress: event.address,
        error: String(error),
      });
    }
  }

  /**
   * 处理紧急事件
   */
  private handleEmergencyEvent(eventType: string, event: any): void {
    // TODO: 实现紧急事件告警逻辑
    // 例如：发送邮件、Slack通知、SMS等
    logger.error("Emergency event detected", {
      eventType,
      marketAddress: event.address,
      details: event.args,
      severity: "high",
    });

    // 这里可以集成告警服务
    // await sendAlert({
    //   type: "emergency",
    //   message: `${eventType} event detected on ${event.address}`,
    //   details: event.args,
    //   severity: "high",
    // });
  }

  /**
   * 获取监听状态
   */
  getStatus(): { isRunning: boolean; watchedMarkets: number } {
    return {
      isRunning: this.isRunning,
      watchedMarkets: this.watchedMarkets.size,
    };
  }
}

// ============================================================// 初始化和导出// ============================================================

/**
 * 初始化合约事件监听器
 */
export async function initContractEventListener(
  config: Omit<ContractEventListenerConfig, "rpcUrl">
): Promise<ContractEventListener> {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";

  contractEventListener = new ContractEventListener({
    ...config,
    rpcUrl,
  });

  await contractEventListener.start();
  return contractEventListener;
}

/**
 * 获取合约事件监听器实例
 */
export function getContractEventListener(): ContractEventListener | null {
  return contractEventListener;
}

/**
 * 关闭合约事件监听器
 */
export async function closeContractEventListener(): Promise<void> {
  if (contractEventListener) {
    await contractEventListener.stop();
    contractEventListener = null;
  }
}
