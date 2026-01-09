/**
 * 监控模块导出
 */

export * from "./metrics.js";
export * from "./logger.js";
export * from "./health.js";

export function generateRandomId(length: number = 6): string {
  const raw = Math.random().toString(36).slice(2);
  return raw.length >= length ? raw.slice(0, length) : raw.padEnd(length, "0");
}
