# 多层级访问控制和权限管理设计

## 1. 现有权限管理分析

### 1.1 权限模型

当前项目使用 OpenZeppelin AccessControl 库实现权限管理，主要角色包括：

| 角色           | 描述                              | 合约             |
| -------------- | --------------------------------- | ---------------- |
| ADMIN_ROLE     | 管理员角色，拥有最高权限          | MarketFactory    |
| EMERGENCY_ROLE | 紧急操作角色，可执行暂停/恢复操作 | MarketFactory    |
| MINTER_ROLE    | 结果代币铸造/销毁权限             | OutcomeToken1155 |

### 1.2 权限分配

- MarketFactory 初始部署时，ADMIN_ROLE 和 EMERGENCY_ROLE 分配给部署者
- 每个市场合约在创建时自动获得 OutcomeToken1155 的 MINTER_ROLE
- 管理员可以手动分配和撤销角色

## 2. 增强方案设计

### 2.1 多层级角色体系

设计三级权限体系：

| 层级 | 角色        | 权限范围     | 示例操作                         |
| ---- | ----------- | ------------ | -------------------------------- |
| 1    | SUPER_ADMIN | 全局最高权限 | 合约升级、角色管理、参数配置     |
| 2    | OPERATOR    | 运营级权限   | 市场创建、预言机管理、抵押品管理 |
| 3    | EMERGENCY   | 紧急操作权限 | 系统暂停/恢复、市场失效          |
| 4    | AUDITOR     | 只读审计权限 | 数据查询、监控访问               |

### 2.2 权限委托和撤销机制

- **时间锁控制**：关键操作（如角色分配、参数变更）需通过时间锁延迟执行
- **多签授权**：高风险操作需多个管理员签名确认
- **权限继承**：子合约自动继承父合约的权限设置
- **紧急撤销**：支持紧急情况下快速撤销所有权限

### 2.3 操作审计日志

- 记录所有权限相关操作
- 包括操作人、操作类型、操作时间、操作参数
- 支持链上查询和链下索引

### 2.4 权限隔离

- 不同功能模块使用独立的角色管理
- 市场创建与市场管理权限分离
- 预言机管理与结果确认权限分离
- 紧急操作与日常运营权限分离

## 3. 合约修改建议

### 3.1 MarketFactory 增强

```solidity
// 添加新角色
bytes32 public constant SUPER_ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

// 权限检查修饰符
modifier onlySuperAdmin() {
    if (!hasRole(SUPER_ADMIN_ROLE, msg.sender)) revert NotAuthorized();
    _;
}

modifier onlyOperator() {
    if (!hasRole(OPERATOR_ROLE, msg.sender) && !hasRole(SUPER_ADMIN_ROLE, msg.sender)) {
        revert NotAuthorized();
    }
    _;
}

modifier onlyEmergency() {
    if (!hasRole(EMERGENCY_ROLE, msg.sender) && !hasRole(SUPER_ADMIN_ROLE, msg.sender)) {
        revert NotAuthorized();
    }
    _;
}

// 权限委托
function grantRoleWithTimelock(
    bytes32 role,
    address account,
    uint256 delay
) external onlySuperAdmin {
    // 实现带时间锁的角色分配
}

// 操作审计事件
event RoleGrantedWithTimelock(bytes32 indexed role, address indexed account, uint256 indexed delay);
event RoleRevokedEmergency(bytes32 indexed role, address indexed account);
```

### 3.2 市场合约增强

```solidity
// 添加角色支持
bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

// 增强的暂停功能
function pause() external {
    if (!_hasEmergencyAccess()) revert NotAuthorized();
    paused = true;
    emit Paused(msg.sender);
    emit EmergencyAction("pause", msg.sender, block.timestamp);
}

// 紧急操作审计事件
event EmergencyAction(string action, address operator, uint256 timestamp);
```

### 3.3 时间锁集成

- 使用 ForesightTimelock 合约管理关键操作
- 设置不同操作的延迟时间：
  - 角色分配：24小时
  - 参数变更：12小时
  - 合约升级：48小时
  - 紧急操作：0小时（立即执行）

## 4. 权限管理最佳实践

### 4.1 安全原则

- 最小权限原则：只授予必要的最小权限
- 权限分离原则：不同功能使用不同角色
- 定期审计原则：定期审查权限分配情况
- 紧急响应原则：建立完善的紧急权限撤销机制

### 4.2 操作流程

1. **角色分配流程**：
   - 提交角色分配请求
   - 等待时间锁延迟
   - 执行角色分配
   - 记录审计日志

2. **紧急操作流程**：
   - 触发紧急操作（暂停/恢复）
   - 生成紧急事件通知
   - 执行操作
   - 记录审计日志
   - 后续审查和恢复

3. **权限撤销流程**：
   - 提交权限撤销请求
   - 执行撤销操作（紧急情况）或等待时间锁（常规情况）
   - 记录审计日志

## 5. 监控和告警

### 5.1 权限相关事件监控

- 监控角色分配和撤销事件
- 监控紧急操作事件
- 监控参数变更事件

### 5.2 告警规则

- 新角色分配：发送通知
- 权限撤销：发送通知
- 紧急操作：发送高优先级告警
- 异常权限使用：发送告警

## 6. 实施计划

### 6.1 阶段一：基础增强

1. 在 MarketFactory 中添加新角色定义
2. 实现增强的权限检查修饰符
3. 添加操作审计事件
4. 集成时间锁控制

### 6.2 阶段二：高级功能

1. 实现权限委托机制
2. 添加多签授权支持
3. 实现权限隔离
4. 开发权限管理前端界面

### 6.3 阶段三：监控和审计

1. 部署权限监控服务
2. 配置告警规则
3. 实现审计日志查询功能
4. 定期权限审查流程

## 7. 安全考虑

- **防止权限提升**：严格检查权限继承关系
- **防止权限滥用**：实施操作频率限制
- **防止权限泄露**：使用安全的密钥管理方案
- **防止权限遗忘**：定期审查和清理闲置权限

## 8. 测试计划

1. **单元测试**：测试角色分配、撤销、权限检查等功能
2. **集成测试**：测试时间锁、多签授权等集成功能
3. **安全测试**：测试权限提升、权限滥用等攻击场景
4. **压力测试**：测试高并发下的权限检查性能

## 9. 文档和培训

1. 编写权限管理指南
2. 制定操作流程文档
3. 提供管理员培训
4. 定期更新最佳实践

# 总结

通过实施多层级访问控制和权限管理方案，可以显著提高系统的安全性和可管理性。该方案提供了细粒度的权限控制、完善的审计机制和紧急响应能力，能够有效防止权限滥用和安全漏洞，为预测市场平台提供坚实的安全保障。
