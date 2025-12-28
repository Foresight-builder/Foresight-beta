# 🔄 Foresight Relayer

> 高性能链下订单簿撮合服务，实现 Polymarket 级别的交易体验。

---

## 📋 概述

Relayer 是 Foresight 预测市场的核心基础设施，负责：

- 📥 接收和验证 EIP-712 签名订单
- 🔄 高性能订单撮合
- 📊 实时订单簿维护
- ⛓️ 链上结算交易提交
- 📡 WebSocket 实时数据推送

---

## ⚡ 快速开始

### 环境要求

- Node.js 18+
- Redis (可选，用于高可用部署)
- Docker (可选)

### 安装

```bash
cd services/relayer
npm install
```

### 配置

```bash
# 复制环境变量模板
cp ../../.env.example .env

# 编辑配置
vim .env
```

关键配置项：

```env
# 服务端口
RELAYER_PORT=3001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# 区块链
RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_ID=80002
MARKET_ADDRESS=0x...

# Redis (可选)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 运行

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run start:prod
```

---

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Relayer Service                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │  REST API   │   │  WebSocket  │   │  Metrics    │           │
│  │  /v2/*      │   │  :3006      │   │  /metrics   │           │
│  └──────┬──────┘   └──────┬──────┘   └─────────────┘           │
│         │                 │                                     │
│         ▼                 ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   Matching Engine                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │    │
│  │  │ Order    │ │ Order    │ │ Trade    │                │    │
│  │  │ Validate │ │ Match    │ │ Execute  │                │    │
│  │  └──────────┘ └──────────┘ └──────────┘                │    │
│  └────────────────────────────────────────────────────────┘    │
│                          │                                      │
│         ┌────────────────┼────────────────┐                    │
│         ▼                ▼                ▼                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Supabase   │  │  Redis      │  │  Blockchain │            │
│  │  (Orders/   │  │  (Cache/    │  │  (Settle)   │            │
│  │   Trades)   │  │   Pub/Sub)  │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📡 API 端点

### 订单 API

| 方法   | 端点               | 描述         |
| ------ | ------------------ | ------------ |
| POST   | `/v2/orders`       | 提交新订单   |
| DELETE | `/v2/orders/:salt` | 取消订单     |
| GET    | `/v2/orders`       | 获取订单列表 |
| GET    | `/v2/orders/:salt` | 获取订单详情 |

### 订单簿 API

| 方法 | 端点              | 描述               |
| ---- | ----------------- | ------------------ |
| GET  | `/v2/depth`       | 获取订单簿深度     |
| POST | `/v2/market-plan` | 获取市价单执行计划 |

### 系统 API

| 方法 | 端点       | 描述            |
| ---- | ---------- | --------------- |
| GET  | `/health`  | 健康检查        |
| GET  | `/ready`   | 就绪检查        |
| GET  | `/metrics` | Prometheus 指标 |
| GET  | `/version` | 版本信息        |

### WebSocket

```javascript
// 连接
const ws = new WebSocket("ws://localhost:3006");

// 订阅深度
ws.send(
  JSON.stringify({
    type: "subscribe",
    channel: "depth",
    marketKey: "80002:1",
    outcomeIndex: 0,
  })
);

// 接收更新
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

---

## 📊 监控

### Prometheus 指标

```bash
# 查看指标
curl http://localhost:3001/metrics
```

关键指标：

- `foresight_orders_total` - 订单总数
- `foresight_matches_total` - 撮合总数
- `foresight_matching_latency_ms` - 撮合延迟
- `foresight_settlement_pending_fills` - 待结算数

### Grafana Dashboard

```bash
# 启动监控栈
docker-compose -f docker-compose.monitoring.yml up -d

# 访问 Grafana
open http://localhost:3030
# 账号: admin / foresight123
```

---

## 🔧 生产部署

### Docker

```bash
# 构建镜像
docker build -t foresight/relayer .

# 运行
docker run -d \
  --name foresight-relayer \
  -p 3001:3001 \
  -p 3006:3006 \
  --env-file .env \
  foresight/relayer
```

### Kubernetes

```bash
# 应用配置
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```

### 蓝绿部署

```bash
./scripts/blue-green-deploy.sh foresight/relayer:2.0.0
```

---

## 📖 详细文档

| 文档                             | 描述               |
| -------------------------------- | ------------------ |
| [MONITORING.md](./MONITORING.md) | Phase 1 监控指南   |
| [PHASE2.md](./PHASE2.md)         | Phase 2 高可用架构 |
| [PHASE3.md](./PHASE3.md)         | Phase 3 弹性架构   |

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

---

## 📁 目录结构

```
services/relayer/
├── src/
│   ├── index.ts              # 入口文件
│   ├── orderbook.ts          # 订单簿逻辑
│   ├── supabase.ts           # 数据库客户端
│   ├── cluster/              # 集群管理
│   ├── database/             # 数据库连接池
│   ├── matching/             # 撮合引擎
│   ├── middleware/           # Express 中间件
│   ├── monitoring/           # 监控组件
│   ├── ratelimit/            # 限流
│   ├── reconciliation/       # 链上对账
│   ├── redis/                # Redis 客户端
│   ├── resilience/           # 弹性组件
│   ├── routes/               # API 路由
│   └── settlement/           # 结算模块
├── k8s/                      # Kubernetes 配置
├── grafana/                  # Grafana 配置
├── scripts/                  # 部署脚本
└── *.md                      # 文档
```

---

## 🆘 故障排除

### 常见问题

#### 订单提交失败

```bash
# 检查签名
curl -X POST http://localhost:3001/v2/orders \
  -H "Content-Type: application/json" \
  -d '{"order": {...}, "signature": "0x..."}'
```

#### 撮合延迟高

```bash
# 检查指标
curl http://localhost:3001/metrics | grep matching_latency
```

#### WebSocket 断连

```javascript
// 使用重连逻辑
ws.onclose = () => {
  setTimeout(() => {
    ws = new WebSocket("ws://localhost:3006");
  }, 1000);
};
```

---

## 📜 许可证

MIT License - 详见 [LICENSE](../../LICENSE)
