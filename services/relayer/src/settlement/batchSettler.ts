/**
 * 批量结算服务
 * 实现 Polymarket 风格的 Operator 批量链上结算
 */

import { ethers, Contract, Wallet, JsonRpcProvider } from "ethers";
import { EventEmitter } from "events";
import type {
  SettlementFill,
  SettlementBatch,
  SettlementQueueConfig,
  SettlementEvent,
  SettlementStats,
  BatchStatus,
} from "./types.js";
import { DEFAULT_SETTLEMENT_CONFIG } from "./types.js";
import { supabaseAdmin } from "../supabase.js";

// 合约 ABI (只需要 batchFill 函数)
const MARKET_ABI = [
  "function batchFill((address maker, uint256 outcomeIndex, bool isBuy, uint256 price, uint256 amount, uint256 salt, uint256 expiry)[] calldata orders, bytes[] calldata signatures, uint256[] calldata fillAmounts) external",
  "function fillOrderSigned((address maker, uint256 outcomeIndex, bool isBuy, uint256 price, uint256 amount, uint256 salt, uint256 expiry) calldata order, bytes calldata signature, uint256 fillAmount) external",
  "event OrderFilledSigned(address indexed maker, address indexed taker, uint256 indexed outcomeIndex, bool isBuy, uint256 price, uint256 amount, uint256 fee, uint256 salt)",
];

/**
 * 批量结算器
 */
export class BatchSettler extends EventEmitter {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private config: SettlementQueueConfig;
  
  // 结算队列
  private pendingFills: Map<string, SettlementFill> = new Map();
  private batches: Map<string, SettlementBatch> = new Map();
  
  // 定时器
  private batchTimer: NodeJS.Timeout | null = null;
  private confirmTimer: NodeJS.Timeout | null = null;
  
  // 统计
  private stats: SettlementStats = {
    pendingFills: 0,
    pendingBatches: 0,
    submittedBatches: 0,
    confirmedBatches: 0,
    failedBatches: 0,
    totalFillsSettled: 0,
    totalGasUsed: 0n,
    averageBatchSize: 0,
    averageConfirmationTime: 0,
  };
  
  private isShuttingDown = false;

  constructor(
    private chainId: number,
    private marketAddress: string,
    privateKey: string,
    rpcUrl: string,
    config: Partial<SettlementQueueConfig> = {}
  ) {
    super();
    this.provider = new JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);
    this.config = { ...DEFAULT_SETTLEMENT_CONFIG, ...config };
    
    console.log(`[BatchSettler] Initialized for market ${marketAddress} on chain ${chainId}`);
    console.log(`[BatchSettler] Operator address: ${this.wallet.address}`);
  }

  /**
   * 启动结算服务
   */
  start(): void {
    // 定期检查是否需要创建批次
    this.batchTimer = setInterval(() => {
      this.checkAndCreateBatch();
    }, 1000);

    // 定期检查待确认的交易
    this.confirmTimer = setInterval(() => {
      this.checkConfirmations();
    }, 3000);

    console.log("[BatchSettler] Started");
  }

  /**
   * 添加待结算的撮合
   */
  addFill(fill: SettlementFill): void {
    if (this.isShuttingDown) {
      throw new Error("Settler is shutting down");
    }

    this.pendingFills.set(fill.id, fill);
    this.stats.pendingFills = this.pendingFills.size;

    console.log(`[BatchSettler] Added fill ${fill.id}, pending: ${this.pendingFills.size}`);

    // 检查是否达到批量大小
    if (this.pendingFills.size >= this.config.maxBatchSize) {
      this.createBatch();
    }
  }

  /**
   * 检查是否需要创建批次
   */
  private checkAndCreateBatch(): void {
    if (this.pendingFills.size === 0) return;
    
    // 获取最早的 fill
    const fills = Array.from(this.pendingFills.values());
    const oldestFill = fills.reduce((oldest, fill) => 
      fill.timestamp < oldest.timestamp ? fill : oldest
    );
    
    const waitTime = Date.now() - oldestFill.timestamp;
    
    // 达到最小批量大小 或 等待时间超过阈值
    if (
      this.pendingFills.size >= this.config.minBatchSize ||
      waitTime >= this.config.maxBatchWaitMs
    ) {
      this.createBatch();
    }
  }

  /**
   * 创建批次并提交
   */
  private async createBatch(): Promise<void> {
    if (this.pendingFills.size === 0) return;

    // 取出待处理的 fills (最多 maxBatchSize)
    const fills = Array.from(this.pendingFills.values())
      .slice(0, this.config.maxBatchSize);

    // 从 pending 中移除
    for (const fill of fills) {
      this.pendingFills.delete(fill.id);
    }

    // 创建批次
    const batch: SettlementBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chainId: this.chainId,
      marketAddress: this.marketAddress,
      fills,
      status: "pending",
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.batches.set(batch.id, batch);
    this.stats.pendingBatches++;
    this.stats.pendingFills = this.pendingFills.size;

    this.emitEvent({ type: "batch_created", batch });

    console.log(`[BatchSettler] Created batch ${batch.id} with ${fills.length} fills`);

    // 异步提交
    this.submitBatch(batch);
  }

  /**
   * 提交批次到链上
   */
  private async submitBatch(batch: SettlementBatch): Promise<void> {
    batch.status = "submitting";

    try {
      // 检查 Gas 价格
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      
      if (gasPrice > this.config.maxGasPrice) {
        console.warn(`[BatchSettler] Gas price too high: ${gasPrice}, max: ${this.config.maxGasPrice}`);
        // 放回队列稍后重试
        batch.status = "pending";
        return;
      }

      const contract = new Contract(this.marketAddress, MARKET_ABI, this.wallet);

      // 准备批量调用参数
      const orders = batch.fills.map(fill => ({
        maker: fill.order.maker,
        outcomeIndex: fill.order.outcomeIndex,
        isBuy: fill.order.isBuy,
        price: fill.order.price,
        amount: fill.order.amount,
        salt: fill.order.salt,
        expiry: fill.order.expiry,
      }));

      const signatures = batch.fills.map(fill => fill.signature);
      const fillAmounts = batch.fills.map(fill => fill.fillAmount);

      console.log(`[BatchSettler] Submitting batch ${batch.id} with ${orders.length} orders`);

      // 估算 Gas
      let gasEstimate: bigint;
      try {
        gasEstimate = await contract.batchFill.estimateGas(orders, signatures, fillAmounts);
        // 加 20% 余量
        gasEstimate = (gasEstimate * 120n) / 100n;
      } catch (estimateError: any) {
        console.error(`[BatchSettler] Gas estimation failed for batch ${batch.id}:`, estimateError.message);
        batch.status = "failed";
        batch.error = `Gas estimation failed: ${estimateError.message}`;
        this.stats.failedBatches++;
        this.stats.pendingBatches--;
        this.emitEvent({ type: "batch_failed", batchId: batch.id, error: batch.error });
        return;
      }

      // 发送交易
      const tx = await contract.batchFill(orders, signatures, fillAmounts, {
        gasLimit: gasEstimate,
        gasPrice: (gasPrice * BigInt(Math.floor(this.config.gasPriceMultiplier * 100))) / 100n,
      });

      batch.txHash = tx.hash;
      batch.status = "submitted";
      batch.submittedAt = Date.now();
      
      this.stats.submittedBatches++;
      this.stats.pendingBatches--;

      console.log(`[BatchSettler] Batch ${batch.id} submitted: ${tx.hash}`);
      this.emitEvent({ type: "batch_submitted", batchId: batch.id, txHash: tx.hash });

      // 保存到数据库
      await this.saveBatchToDb(batch);

    } catch (error: any) {
      console.error(`[BatchSettler] Failed to submit batch ${batch.id}:`, error.message);
      
      batch.retryCount++;
      
      if (batch.retryCount < this.config.maxRetries) {
        batch.status = "retrying";
        const delay = this.config.retryDelayMs * Math.pow(this.config.retryBackoffMultiplier, batch.retryCount - 1);
        
        console.log(`[BatchSettler] Retrying batch ${batch.id} in ${delay}ms (attempt ${batch.retryCount}/${this.config.maxRetries})`);
        
        setTimeout(() => this.submitBatch(batch), delay);
      } else {
        batch.status = "failed";
        batch.error = error.message;
        this.stats.failedBatches++;
        this.stats.pendingBatches--;
        
        this.emitEvent({ type: "batch_failed", batchId: batch.id, error: error.message });
        
        // 将失败的 fills 记录到数据库
        await this.saveFailedBatch(batch);
      }
    }
  }

  /**
   * 检查待确认的交易
   */
  private async checkConfirmations(): Promise<void> {
    const submittedBatches = Array.from(this.batches.values())
      .filter(b => b.status === "submitted" && b.txHash);

    for (const batch of submittedBatches) {
      try {
        const receipt = await this.provider.getTransactionReceipt(batch.txHash!);
        
        if (receipt) {
          const currentBlock = await this.provider.getBlockNumber();
          const confirmations = currentBlock - receipt.blockNumber;
          
          if (confirmations >= this.config.confirmations) {
            batch.status = "confirmed";
            batch.blockNumber = receipt.blockNumber;
            batch.gasUsed = receipt.gasUsed;
            batch.confirmedAt = Date.now();
            
            this.stats.confirmedBatches++;
            this.stats.submittedBatches--;
            this.stats.totalFillsSettled += batch.fills.length;
            this.stats.totalGasUsed += receipt.gasUsed;
            
            // 更新平均批量大小
            const totalBatches = this.stats.confirmedBatches;
            this.stats.averageBatchSize = 
              (this.stats.averageBatchSize * (totalBatches - 1) + batch.fills.length) / totalBatches;
            
            // 更新平均确认时间
            const confirmTime = batch.confirmedAt! - batch.submittedAt!;
            this.stats.averageConfirmationTime =
              (this.stats.averageConfirmationTime * (totalBatches - 1) + confirmTime) / totalBatches;

            console.log(`[BatchSettler] Batch ${batch.id} confirmed at block ${receipt.blockNumber}`);
            this.emitEvent({ type: "batch_confirmed", batchId: batch.id, blockNumber: receipt.blockNumber });

            // 更新数据库中的订单状态
            await this.updateFillsOnChain(batch);
            
            // 清理已确认的批次
            this.batches.delete(batch.id);
          }
        } else {
          // 检查超时
          const elapsed = Date.now() - batch.submittedAt!;
          if (elapsed > this.config.confirmationTimeoutMs) {
            console.warn(`[BatchSettler] Batch ${batch.id} confirmation timeout`);
            batch.status = "failed";
            batch.error = "Confirmation timeout";
            this.stats.failedBatches++;
            this.stats.submittedBatches--;
            
            this.emitEvent({ type: "batch_failed", batchId: batch.id, error: "Confirmation timeout" });
          }
        }
      } catch (error: any) {
        console.error(`[BatchSettler] Error checking confirmation for batch ${batch.id}:`, error.message);
      }
    }
  }

  /**
   * 保存批次到数据库
   */
  private async saveBatchToDb(batch: SettlementBatch): Promise<void> {
    if (!supabaseAdmin) return;

    await supabaseAdmin.from("settlement_batches").upsert({
      id: batch.id,
      chain_id: batch.chainId,
      market_address: batch.marketAddress,
      fill_count: batch.fills.length,
      status: batch.status,
      tx_hash: batch.txHash,
      submitted_at: batch.submittedAt ? new Date(batch.submittedAt).toISOString() : null,
      created_at: new Date(batch.createdAt).toISOString(),
    });
  }

  /**
   * 保存失败的批次
   */
  private async saveFailedBatch(batch: SettlementBatch): Promise<void> {
    if (!supabaseAdmin) return;

    await supabaseAdmin.from("settlement_batches").upsert({
      id: batch.id,
      chain_id: batch.chainId,
      market_address: batch.marketAddress,
      fill_count: batch.fills.length,
      status: "failed",
      error: batch.error,
      retry_count: batch.retryCount,
      created_at: new Date(batch.createdAt).toISOString(),
    });

    // 记录失败的 fills 以便后续处理
    for (const fill of batch.fills) {
      await supabaseAdmin.from("failed_fills").upsert({
        fill_id: fill.id,
        batch_id: batch.id,
        error: batch.error,
        created_at: new Date().toISOString(),
      });
    }
  }

  /**
   * 更新链上确认的 fills
   */
  private async updateFillsOnChain(batch: SettlementBatch): Promise<void> {
    if (!supabaseAdmin) return;

    // 更新 trades 表
    for (const fill of batch.fills) {
      await supabaseAdmin
        .from("trades")
        .update({
          tx_hash: batch.txHash,
          block_number: batch.blockNumber,
        })
        .eq("id", fill.id);

      this.emitEvent({ type: "fill_settled", fillId: fill.id, txHash: batch.txHash! });
    }
  }

  /**
   * 发送事件
   */
  private emitEvent(event: SettlementEvent): void {
    this.emit("settlement_event", event);
  }

  /**
   * 获取统计信息
   */
  getStats(): SettlementStats {
    return { ...this.stats };
  }

  /**
   * 获取 Operator 地址
   */
  getOperatorAddress(): string {
    return this.wallet.address;
  }

  /**
   * 获取 Operator 余额
   */
  async getOperatorBalance(): Promise<{ eth: string; usdc?: string }> {
    const eth = await this.provider.getBalance(this.wallet.address);
    return { eth: ethers.formatEther(eth) };
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    console.log("[BatchSettler] Shutting down...");
    this.isShuttingDown = true;

    // 停止定时器
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    if (this.confirmTimer) {
      clearInterval(this.confirmTimer);
      this.confirmTimer = null;
    }

    // 处理剩余的 pending fills
    if (this.pendingFills.size > 0) {
      console.log(`[BatchSettler] Processing ${this.pendingFills.size} remaining fills...`);
      await this.createBatch();
    }

    // 等待所有 submitted 批次确认 (最多等 30 秒)
    const startTime = Date.now();
    while (this.stats.submittedBatches > 0 && Date.now() - startTime < 30000) {
      await this.checkConfirmations();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("[BatchSettler] Shutdown complete");
  }
}

