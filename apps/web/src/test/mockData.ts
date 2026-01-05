/**
 * Mock数据工厂
 * 用于测试环境的模拟数据
 */

export const mockPrediction = {
  id: 1,
  title: "测试预测事件",
  description: "这是一个测试用的预测事件",
  category: "科技",
  deadline: "2025-12-31T23:59:59.000Z",
  min_stake: 1,
  criteria: "测试标准",
  image_url: "/test-image.jpg",
  status: "active",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  followers_count: 100,
};

export const mockOrder = {
  id: 1,
  chain_id: 11155111,
  verifying_contract: "0x1234567890123456789012345678901234567890",
  maker_address: "0x1111111111111111111111111111111111111111",
  maker_salt: "12345",
  outcome_index: 0,
  is_buy: true,
  price: "500000",
  amount: "10",
  remaining: "10",
  expiry: null,
  signature: "0xabcdef...",
  status: "open",
  created_at: "2024-01-01T00:00:00.000Z",
};

export const mockUserProfile = {
  id: "user-1",
  username: "测试用户",
  email: "test@example.com",
  wallet_address: "0x1111111111111111111111111111111111111111",
  avatar_url: null,
  bio: null,
  is_admin: false,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

export const mockMarket = {
  id: 1,
  chain_id: 11155111,
  verifying_contract: "0x1234567890123456789012345678901234567890",
  collateral_token: "0x2222222222222222222222222222222222222222",
  oracle_address: "0x3333333333333333333333333333333333333333",
  fee_bps: 40,
  resolution_time: Math.floor(Date.now() / 1000) + 86400,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

// 创建多个模拟数据的工厂函数
export const createMockPrediction = (overrides?: Partial<typeof mockPrediction>) => ({
  ...mockPrediction,
  ...overrides,
});

export const createMockOrder = (overrides?: Partial<typeof mockOrder>) => ({
  ...mockOrder,
  ...overrides,
});

export const createMockUser = (overrides?: Partial<typeof mockUserProfile>) => ({
  ...mockUserProfile,
  ...overrides,
});
