/**
 * Mock data for profile page placeholder
 */

export type HistoryItem = {
  id: string;
  type: "trade" | "deposit" | "withdraw" | "reward";
  title: string;
  amount: number;
  timestamp: string;
  status: "completed" | "pending" | "failed";
};

// 空的历史记录 mock，用于加载状态占位
export const MOCK_HISTORY: HistoryItem[] = [];
