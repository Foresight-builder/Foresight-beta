/**
 * Performance 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PerformanceMonitor, getMemoryUsage } from "../performance";

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe("start and end", () => {
    it("should measure time correctly", () => {
      monitor.start("test");

      // 模拟一些工作
      const sum = Array.from({ length: 1000 }, (_, i) => i).reduce((a, b) => a + b, 0);

      const duration = monitor.end("test");

      expect(duration).toBeGreaterThan(0);
      expect(sum).toBe(499500); // 验证计算正确
    });

    it("should return 0 for unknown mark", () => {
      const duration = monitor.end("unknown");
      expect(duration).toBe(0);
    });
  });

  describe("measure async", () => {
    it("should measure async function time", async () => {
      const result = await monitor.measure("async-test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "done";
      });

      expect(result).toBe("done");
    });

    it("should handle async errors", async () => {
      await expect(
        monitor.measure("async-error", async () => {
          throw new Error("Test error");
        })
      ).rejects.toThrow("Test error");
    });
  });

  describe("measureSync", () => {
    it("should measure sync function time", () => {
      const result = monitor.measureSync("sync-test", () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it("should handle sync errors", () => {
      expect(() => {
        monitor.measureSync("sync-error", () => {
          throw new Error("Test error");
        });
      }).toThrow("Test error");
    });
  });
});

describe("getMemoryUsage", () => {
  it("should return null if memory API not available", () => {
    const originalMemory = (performance as any).memory;
    delete (performance as any).memory;

    const result = getMemoryUsage();

    expect(result).toBeNull();

    // 恢复
    if (originalMemory) {
      (performance as any).memory = originalMemory;
    }
  });

  it("should return memory stats if available", () => {
    // 模拟 memory API
    (performance as any).memory = {
      usedJSHeapSize: 10 * 1024 * 1024, // 10MB
      totalJSHeapSize: 20 * 1024 * 1024, // 20MB
      jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
    };

    const result = getMemoryUsage();

    expect(result).not.toBeNull();
    if (result) {
      expect(result.used).toBe(10);
      expect(result.total).toBe(20);
      expect(result.limit).toBe(100);
      expect(result.usage).toBe(10);
    }
  });
});
