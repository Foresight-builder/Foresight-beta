/**
 * 监控指标单元测试
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ordersTotal,
  matchesTotal,
  matchingLatency,
  wsConnectionsActive,
  getMetrics,
  resetMetrics,
} from "./metrics.js";

describe("Prometheus Metrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe("Counter Metrics", () => {
    it("should increment ordersTotal counter", async () => {
      ordersTotal.inc({ market_key: "test:1", side: "buy", status: "success" });
      ordersTotal.inc({ market_key: "test:1", side: "buy", status: "success" });
      ordersTotal.inc({ market_key: "test:1", side: "sell", status: "success" });

      const metrics = await getMetrics();
      expect(metrics).toContain("foresight_orders_total");
    });

    it("should increment matchesTotal counter", async () => {
      matchesTotal.inc({ market_key: "test:1", outcome_index: "0" });

      const metrics = await getMetrics();
      expect(metrics).toContain("foresight_matches_total");
    });
  });

  describe("Histogram Metrics", () => {
    it("should observe matchingLatency histogram", async () => {
      matchingLatency.observe({ market_key: "test:1" }, 5);
      matchingLatency.observe({ market_key: "test:1" }, 10);
      matchingLatency.observe({ market_key: "test:1" }, 25);

      const metrics = await getMetrics();
      expect(metrics).toContain("foresight_matching_latency_ms");
      expect(metrics).toContain("_bucket");
      expect(metrics).toContain("_sum");
      expect(metrics).toContain("_count");
    });
  });

  describe("Gauge Metrics", () => {
    it("should set wsConnectionsActive gauge", async () => {
      wsConnectionsActive.set(10);

      const metrics = await getMetrics();
      expect(metrics).toContain("foresight_ws_connections_active");
    });

    it("should update gauge values", async () => {
      wsConnectionsActive.set(5);
      wsConnectionsActive.inc();
      wsConnectionsActive.dec();

      const metrics = await getMetrics();
      expect(metrics).toContain("foresight_ws_connections_active");
    });
  });

  describe("Metrics Export", () => {
    it("should export all metrics in Prometheus format", async () => {
      ordersTotal.inc({ market_key: "test:1", side: "buy", status: "success" });
      matchingLatency.observe({ market_key: "test:1" }, 5);

      const metrics = await getMetrics();
      
      // Check format
      expect(metrics).toContain("# HELP");
      expect(metrics).toContain("# TYPE");
    });

    it("should include default Node.js metrics", async () => {
      const metrics = await getMetrics();
      
      // Default metrics should include process info
      expect(metrics).toContain("nodejs");
    });
  });
});

