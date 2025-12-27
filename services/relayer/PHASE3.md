# Foresight Relayer - Phase 3 生产级弹性架构

Phase 3 实现了生产级的弹性架构，包括 API 限流、熔断器、分布式事务、自动扩缩容和蓝绿部署。

## 🎯 Phase 3 功能概览

| 功能 | 描述 | 状态 |
|------|------|------|
| API 限流 | Redis 分布式滑动窗口限流 | ✅ 完成 |
| 熔断器 | Circuit Breaker 模式 | ✅ 完成 |
| 分布式事务 | Saga 模式实现 | ✅ 完成 |
| 重试机制 | 指数退避 + 抖动 | ✅ 完成 |
| HPA 自动扩缩容 | Kubernetes 配置 | ✅ 完成 |
| 蓝绿部署 | 零停机部署方案 | ✅ 完成 |

## 🚀 快速开始

### 1. 启用限流

```typescript
import { createRateLimitMiddleware } from "./ratelimit";

// 使用默认配置
app.use(createRateLimitMiddleware());

// 或自定义配置
app.use(createRateLimitMiddleware({
  perIp: {
    windowMs: 60000,    // 1 分钟
    maxRequests: 100,   // 每 IP 100 次
  },
  perEndpoint: {
    "/v2/orders": {
      windowMs: 60000,
      maxRequests: 30,  // 下单限制更严格
    },
  },
}));
```

### 2. 使用熔断器

```typescript
import { withCircuitBreaker, circuitBreakerRegistry } from "./resilience";

// 包装外部调用
const result = await withCircuitBreaker("external-api", async () => {
  return fetch("https://api.example.com/data");
}, {
  failureThreshold: 5,
  openDuration: 30000,
  timeout: 5000,
});

// 查看熔断器状态
const stats = circuitBreakerRegistry.getAllStats();
```

### 3. 使用 Saga 事务

```typescript
import { createOrderSaga, SagaExecutor } from "./resilience";

// 创建订单处理 Saga
const orderSaga = createOrderSaga();
const executor = new SagaExecutor(orderSaga);

// 监听事件
executor.on("completed", (execution) => {
  console.log("订单处理完成", execution.id);
});

executor.on("compensated", (execution) => {
  console.log("订单已回滚", execution.id);
});

// 执行
const result = await executor.execute({
  orderId: "order-123",
  marketKey: "80002:1",
  userId: "0x...",
  amount: 100n,
  price: 500000n,
  side: "buy",
});
```

### 4. 重试机制

```typescript
import { retry, RETRY_STRATEGIES } from "./resilience";

// 使用预设策略
const result = await retry("blockchain-tx", async () => {
  return sendTransaction();
}, RETRY_STRATEGIES.blockchain);

if (!result.success) {
  console.error("操作失败:", result.error);
}
```

## 📊 API 限流系统

### 多层限流架构

```
请求 → 全局限流 → IP 限流 → 用户限流 → 端点限流 → 处理
         ↓          ↓          ↓           ↓
      10000/s    100/min    200/min     30/min
```

### 配置选项

```typescript
const config: TieredRateLimitConfig = {
  // 全局限流
  global: {
    windowMs: 1000,
    maxRequests: 10000,
  },
  // 按 IP 限流
  perIp: {
    windowMs: 60000,
    maxRequests: 100,
  },
  // 按用户限流
  perUser: {
    windowMs: 60000,
    maxRequests: 200,
  },
  // 按端点限流
  perEndpoint: {
    "/v2/orders": { windowMs: 60000, maxRequests: 30 },
    "/orderbook/orders": { windowMs: 60000, maxRequests: 30 },
  },
};
```

### 响应头

被限流时返回:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1703750400
Retry-After: 45
```

## 🔌 熔断器 (Circuit Breaker)

### 状态机

```
        成功
    ┌─────────┐
    │         │
    ▼         │
┌───────┐   失败>=阈值   ┌───────┐
│CLOSED │ ─────────────► │ OPEN  │
└───────┘                └───────┘
    ▲                        │
    │     成功>=阈值         │ 超时
    │    ┌─────────┐        │
    └────│HALF_OPEN│◄───────┘
         └─────────┘
             │
             │ 失败
             ▼
         ┌───────┐
         │ OPEN  │
         └───────┘
```

### 配置选项

```typescript
const breaker = new CircuitBreaker({
  name: "payment-service",
  failureThreshold: 5,      // 连续 5 次失败触发熔断
  successThreshold: 3,      // 半开状态 3 次成功恢复
  openDuration: 30000,      // 熔断持续 30 秒
  timeout: 10000,           // 操作超时 10 秒
  errorRateThreshold: 0.5,  // 错误率 50% 触发熔断
  minRequests: 10,          // 最少 10 个请求后计算错误率
  fallback: (error) => {    // 降级回调
    return { cached: true };
  },
});
```

## 🔄 分布式事务 (Saga)

### 订单处理 Saga

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  验证订单   │───►│  预留余额   │───►│  执行撮合   │───►│  提交结算   │───►│  更新余额   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼                  ▼
   (无补偿)          释放余额           撤销撮合          人工处理           回滚余额
```

### 创建自定义 Saga

```typescript
const customSaga = new SagaDefinition<MyContext>({ name: "my-saga" })
  .addStep({
    name: "step-1",
    execute: async (ctx) => { /* 执行逻辑 */ },
    compensate: async (ctx) => { /* 补偿逻辑 */ },
    retryable: true,
    maxRetries: 3,
  })
  .addStep({
    name: "step-2",
    execute: async (ctx) => { /* ... */ },
    compensate: async (ctx) => { /* ... */ },
  });

const executor = new SagaExecutor(customSaga);
await executor.execute(context);
```

## ⚡ 重试机制

### 预设策略

| 策略 | 用途 | 配置 |
|------|------|------|
| `fast` | 幂等操作 | 3次, 100ms-1s |
| `standard` | 通用 | 3次, 1s-10s |
| `slow` | 外部服务 | 5次, 2s-60s |
| `blockchain` | 链上操作 | 5次, 3s-30s |

### 自定义重试条件

```typescript
import { retry, isNetworkError, isRetryableHttpError } from "./resilience";

await retry("api-call", fn, {
  maxRetries: 5,
  initialDelay: 1000,
  backoffMultiplier: 2,
  jitter: true,
  retryCondition: (error, attempt) => {
    return isNetworkError(error) || isRetryableHttpError(error);
  },
  onRetry: (error, attempt, delay) => {
    console.log(`重试 ${attempt}，等待 ${delay}ms`);
  },
});
```

## ☸️ Kubernetes 部署

### 部署架构

```
                    ┌─────────────┐
                    │   Ingress   │
                    │  (NGINX)    │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │  Service    │          │  Service    │
       │  (prod)     │          │  (preview)  │
       └──────┬──────┘          └──────┬──────┘
              │                        │
              ▼                        ▼
       ┌─────────────┐          ┌─────────────┐
       │  Deployment │          │  Deployment │
       │   (blue)    │          │   (green)   │
       └─────────────┘          └─────────────┘
              │
              ▼
       ┌─────────────┐
       │     HPA     │
       │  (3-20 pod) │
       └─────────────┘
```

### 自动扩缩容 (HPA)

```yaml
# CPU 使用率 > 70% 或内存 > 80% 或 RPS > 1000
# 自动扩展到 3-20 个 Pod
```

### 蓝绿部署

```bash
# 部署新版本
./scripts/blue-green-deploy.sh foresight/relayer:2.1.0

# 回滚
./scripts/blue-green-deploy.sh --rollback
```

## 📈 新增指标

### 限流指标
- `foresight_ratelimit_requests_total` - 限流检查总数
- `foresight_ratelimit_current_usage` - 当前使用量

### 熔断器指标
- `foresight_circuit_breaker_state` - 熔断器状态
- `foresight_circuit_breaker_calls_total` - 调用总数
- `foresight_circuit_breaker_latency_ms` - 调用延迟

### Saga 指标
- `foresight_saga_executions_total` - Saga 执行总数
- `foresight_saga_steps_total` - 步骤执行总数
- `foresight_saga_duration_ms` - Saga 执行时长
- `foresight_saga_active` - 活跃 Saga 数

### 重试指标
- `foresight_retry_attempts_total` - 重试次数
- `foresight_retry_duration_ms` - 重试总时长

## 📁 新增文件结构

```
services/relayer/
├── src/
│   ├── ratelimit/
│   │   ├── index.ts           # 模块导出
│   │   ├── slidingWindow.ts   # 滑动窗口限流器
│   │   └── middleware.ts      # Express 中间件
│   └── resilience/
│       ├── index.ts           # 模块导出
│       ├── circuitBreaker.ts  # 熔断器
│       ├── saga.ts            # Saga 事务
│       └── retry.ts           # 重试机制
├── k8s/
│   ├── deployment.yaml        # 基础部署
│   ├── hpa.yaml              # 自动扩缩容
│   ├── blue-green.yaml       # 蓝绿部署
│   └── ingress.yaml          # 入口配置
├── scripts/
│   └── blue-green-deploy.sh  # 蓝绿部署脚本
└── PHASE3.md                 # 本文档
```

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行弹性测试
pnpm test -- --grep "resilience|ratelimit"

# 负载测试限流
ab -n 1000 -c 50 http://localhost:3000/v2/depth?marketKey=test

# 测试熔断器
for i in {1..10}; do curl http://localhost:3000/v2/orders -X POST; done
```

## 🔜 Phase 4 展望

- [ ] 分布式追踪 (OpenTelemetry)
- [ ] 服务网格 (Istio)
- [ ] 混沌工程测试
- [ ] 多区域部署
- [ ] 数据备份和恢复

