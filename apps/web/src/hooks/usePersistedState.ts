import { useState, useEffect, useCallback, Dispatch, SetStateAction } from "react";

/**
 * 持久化状态 Hook
 *
 * 自动将状态保存到 localStorage，页面刷新后自动恢复
 *
 * 特性：
 * - 自动保存到 localStorage
 * - 自动从 localStorage 恢复
 * - 支持任意可序列化的数据类型
 * - SSR 安全
 * - 错误处理
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = usePersistedState('filters', {
 *   category: null,
 *   sortBy: 'trending'
 * });
 * ```
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // 初始化时使用默认值，确保 SSR 和客户端首次渲染一致（避免 hydration 错误）
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // 客户端 hydration 完成后，从 localStorage 恢复状态
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        setState(parsed);
      }
    } catch (error) {
      console.error(`Error loading persisted state for key "${key}":`, error);
    }

    setIsHydrated(true);
  }, [key]);

  // 保存到 localStorage（仅在 hydration 完成后）
  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) return;

    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error saving persisted state for key "${key}":`, error);
    }
  }, [key, state, isHydrated]);

  return [state, setState];
}

/**
 * 会话存储状态 Hook
 *
 * 类似 usePersistedState，但使用 sessionStorage（仅在当前标签页有效）
 *
 * @example
 * ```tsx
 * const [tempData, setTempData] = useSessionState('temp', {});
 * ```
 */
export function useSessionState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  // 初始化时使用默认值，确保 SSR 和客户端首次渲染一致
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // 客户端 hydration 完成后，从 sessionStorage 恢复状态
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        setState(parsed);
      }
    } catch (error) {
      console.error(`Error loading session state for key "${key}":`, error);
    }

    setIsHydrated(true);
  }, [key]);

  // 保存到 sessionStorage（仅在 hydration 完成后）
  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) return;

    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error saving session state for key "${key}":`, error);
    }
  }, [key, state, isHydrated]);

  return [state, setState];
}

/**
 * 带过期时间的持久化状态 Hook
 *
 * @example
 * ```tsx
 * // 1 小时后过期
 * const [data, setData] = usePersistedStateWithExpiry('data', null, 3600000);
 * ```
 */
export function usePersistedStateWithExpiry<T>(
  key: string,
  defaultValue: T,
  expiryMs: number
): [T, Dispatch<SetStateAction<T>>] {
  // 初始化时使用默认值，确保 SSR 和客户端首次渲染一致
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // 客户端 hydration 完成后，从 localStorage 恢复状态
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const { value, expiry } = JSON.parse(saved);
        if (Date.now() < expiry) {
          setState(value as T);
        } else {
          // 已过期，删除
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error(`Error loading persisted state with expiry for key "${key}":`, error);
    }

    setIsHydrated(true);
  }, [key]);

  // 保存到 localStorage（仅在 hydration 完成后）
  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) return;

    try {
      const expiry = Date.now() + expiryMs;
      localStorage.setItem(
        key,
        JSON.stringify({
          value: state,
          expiry,
        })
      );
    } catch (error) {
      console.error(`Error saving persisted state with expiry for key "${key}":`, error);
    }
  }, [key, state, expiryMs, isHydrated]);

  return [state, setState];
}

/**
 * 清除持久化状态
 */
export function clearPersistedState(key: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing persisted state for key "${key}":`, error);
  }
}

/**
 * 清除所有持久化状态（谨慎使用）
 */
export function clearAllPersistedStates(prefix?: string): void {
  if (typeof window === "undefined") return;

  try {
    if (prefix) {
      // 只清除特定前缀的
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      // 清除所有
      localStorage.clear();
    }
  } catch (error) {
    console.error("Error clearing all persisted states:", error);
  }
}
