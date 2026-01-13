# Foresight 主网部署计划

## 1. 部署概述

### 1.1 项目版本

- 合约版本: v1.0.0
- 前端版本: v1.0.0
- 后端版本: v1.0.0

### 1.2 部署范围

- 智能合约部署
- 前端应用部署
- 后端服务部署
- 监控系统配置
- 安全审计报告

### 1.3 部署时间

- 计划部署日期: 2026-02-01
- 预计持续时间: 48 小时
- 回滚窗口: 部署后 72 小时

## 2. 前期准备

### 2.1 安全准备

- [x] 完成第三方安全审计
- [x] 修复审计报告中发现的所有高风险和中风险问题
- [x] 完成智能合约形式化验证
- [x] 完成渗透测试
- [x] 准备应急响应计划

### 2.2 技术准备

- [x] 配置主网节点连接
- [x] 设置部署环境变量
- [x] 准备部署脚本
- [x] 配置监控和告警系统
- [x] 准备日志收集系统

### 2.3 基础设施准备

- [x] 配置生产服务器
- [x] 设置负载均衡
- [x] 配置数据库备份
- [x] 设置 CDN
- [x] 配置 SSL 证书

## 3. 智能合约部署

### 3.1 部署顺序

1. OutcomeToken1155
2. MarketFactory
3. Oracle 合约 (ManualOracle 和 UMAOracleAdapterV2)
4. OffchainBinaryMarket 实现
5. OffchainMultiMarket8 实现
6. 注册市场模板

### 3.2 部署步骤

1. **部署 OutcomeToken1155**

   ```bash
   npx hardhat deploy --network mainnet --tags OutcomeToken1155
   ```

2. **部署 MarketFactory**

   ```bash
   npx hardhat deploy --network mainnet --tags MarketFactory
   ```

3. **部署 Oracle 合约**

   ```bash
   npx hardhat deploy --network mainnet --tags ManualOracle
   npx hardhat deploy --network mainnet --tags UMAOracleAdapterV2
   ```

4. **部署市场模板**

   ```bash
   npx hardhat deploy --network mainnet --tags OffchainBinaryMarket
   npx hardhat deploy --network mainnet --tags OffchainMultiMarket8
   ```

5. **注册市场模板**
   ```bash
   npx hardhat run scripts/register-templates.js --network mainnet
   ```

### 3.3 安全检查

- [ ] 验证合约代码与审计版本一致
- [ ] 验证合约初始化参数正确
- [ ] 验证访问控制设置正确
- [ ] 验证升级机制安全
- [ ] 验证事件日志正确

## 4. 前端应用部署

### 4.1 部署步骤

1. **构建生产版本**

   ```bash
   cd apps/web
   npm run build
   ```

2. **部署到 CDN**

   ```bash
   npm run deploy
   ```

3. **验证部署**
   - 检查网站可访问性
   - 验证所有功能正常
   - 检查性能指标
   - 验证 SEO 元标签

### 4.2 性能优化

- [ ] 启用代码分割
- [ ] 优化图片加载
- [ ] 配置浏览器缓存
- [ ] 启用 Gzip 压缩
- [ ] 优化字体加载

## 5. 后端服务部署

### 5.1 部署步骤

1. **构建后端服务**

   ```bash
   cd packages/api
   npm run build
   ```

2. **部署到服务器**

   ```bash
   npm run deploy:mainnet
   ```

3. **配置服务**
   - 启动服务
   - 配置自动重启
   - 配置日志轮转

### 5.2 安全配置

- [ ] 配置防火墙
- [ ] 禁用不必要的端口
- [ ] 配置 TLS
- [ ] 启用 API 密钥验证
- [ ] 配置 rate limiting

## 6. 监控和告警

### 6.1 监控配置

- **服务器监控**
  - CPU、内存、磁盘使用情况
  - 网络流量
  - 系统负载

- **应用监控**
  - 响应时间
  - 错误率
  - 请求量
  - 数据库查询性能

- **合约监控**
  - 合约事件
  - 异常交易
  - 资金流动

### 6.2 告警配置

- 配置 Slack/Email 告警
- 设置告警阈值
- 配置告警升级策略
- 测试告警系统

## 7. 测试计划

### 7.1 功能测试

- [ ] 市场创建
- [ ] 订单创建和填写
- [ ] 预言机数据更新
- [ ] 市场结算
- [ ] 代币赎回

### 7.2 性能测试

- [ ] 高并发测试
- [ ] 负载测试
- [ ] 压力测试
- [ ] 响应时间测试

### 7.3 安全测试

- [ ] 渗透测试
- [ ] 安全扫描
- [ ] 漏洞测试
- [ ] 授权测试

## 8. 回滚计划

### 8.1 智能合约回滚

- 对于不可升级合约: 部署新合约并迁移数据
- 对于可升级合约: 升级到之前的安全版本

### 8.2 前端应用回滚

- 切换到之前的版本
- 清除 CDN 缓存
- 验证回滚效果

### 8.3 后端服务回滚

- 停止当前服务
- 启动之前的版本
- 验证服务正常

## 9. 后续维护

### 9.1 日常维护

- 监控系统运行状态
- 检查日志和告警
- 执行定期备份
- 应用安全补丁

### 9.2 性能优化

- 分析性能指标
- 优化慢查询
- 调整资源配置
- 改进代码性能

### 9.3 安全更新

- 定期进行安全审计
- 应用安全更新
- 监控安全漏洞
- 更新依赖库

## 10. 联系方式

### 10.1 紧急联系人

- 技术负责人:
- 安全负责人:
- 运维负责人:

### 10.2 沟通渠道

- 内部 Slack 频道: #foresight-deployment
- 紧急联系电话:
- 监控仪表盘:

## 11. 附录

### 11.1 部署清单

- [ ] 智能合约部署完成
- [ ] 前端应用部署完成
- [ ] 后端服务部署完成
- [ ] 监控系统配置完成
- [ ] 告警系统测试完成
- [ ] 功能测试通过
- [ ] 性能测试通过
- [ ] 安全测试通过

### 11.2 环境变量

| 变量名                        | 描述                  | 示例值                                  |
| ----------------------------- | --------------------- | --------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | Supabase 数据库 URL   | https://example.supabase.co             |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名密钥     | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| NEXT_PUBLIC_RELAYER_URL       | Relayer 服务 URL      | https://relayer.foresight.xyz           |
| SUPABASE_SERVICE_ROLE_KEY     | Supabase 服务角色密钥 | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| JWT_SECRET                    | JWT 密钥              | your-secret-key                         |

### 11.3 合约地址（待部署后填写）

| 合约名称             | 地址  |
| -------------------- | ----- |
| OutcomeToken1155     | 0x... |
| MarketFactory        | 0x... |
| ManualOracle         | 0x... |
| UMAOracleAdapterV2   | 0x... |
| OffchainBinaryMarket | 0x... |
| OffchainMultiMarket8 | 0x... |
