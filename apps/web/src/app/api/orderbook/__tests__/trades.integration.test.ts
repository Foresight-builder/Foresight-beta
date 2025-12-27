import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { GET as getTrades } from "../trades/route";
import { createMockNextRequest } from "@/test/apiTestHelpers";
import { ApiErrorCode } from "@/types/api";

vi.mock("@/lib/supabase", () => {
  let queryResult: { data: any; error: any } = { data: [], error: null };

  const eqMock = vi.fn();
  const orderMock = vi.fn();
  const limitMock = vi.fn();

  const fakeQuery: any = {
    eq: (...args: any[]) => {
      eqMock(...args);
      return fakeQuery;
    },
    order: (...args: any[]) => {
      orderMock(...args);
      return fakeQuery;
    },
    limit: (...args: any[]) => {
      limitMock(...args);
      return fakeQuery;
    },
    then: (resolve: (value: any) => any) => resolve(queryResult),
  };

  const fromMock = vi.fn(() => ({
    select: vi.fn(() => fakeQuery),
  }));

  let client: any = {
    from: fromMock,
  };

  return {
    getClient: () => client,
    supabaseAdmin: client,
    __setClient: (next: any) => {
      client = next;
    },
    __setQueryResult: (next: { data: any; error: any }) => {
      queryResult = next;
    },
    __getMocks: () => ({
      eqMock,
      orderMock,
      limitMock,
      fromMock,
    }),
  };
});

let setClient: (client: any) => void;
let setQueryResult: (result: { data: any; error: any }) => void;
let eqMock: any;
let limitMock: any;
let fromMock: any;

describe("GET /api/orderbook/trades", () => {
  beforeAll(async () => {
    const mod = (await import("@/lib/supabase")) as any;
    setClient = mod.__setClient;
    setQueryResult = mod.__setQueryResult;
    const mocks = mod.__getMocks();
    eqMock = mocks.eqMock;
    limitMock = mocks.limitMock;
    fromMock = mocks.fromMock;
  });

  beforeEach(() => {
    setQueryResult({ data: [], error: null });
    setClient({
      from: fromMock,
    });
    eqMock.mockClear();
    limitMock.mockClear();
    fromMock.mockClear();
  });

  afterEach(() => {
    setClient({
      from: fromMock,
    });
  });

  it("应该在 Supabase 未配置时返回 500 错误", async () => {
    setClient(null);

    const request = createMockNextRequest({
      method: "GET",
      url: "http://localhost:3000/api/orderbook/trades",
    });

    const response = await getTrades(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    expect(data.error.message).toContain("Supabase");
  });

  it("应该拒绝无效的 chainId", async () => {
    const request = createMockNextRequest({
      method: "GET",
      url: "http://localhost:3000/api/orderbook/trades?chainId=abc",
    });

    const response = await getTrades(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    expect(data.error.message).toContain("chainId");
  });

  it("应该支持按 chainId 和 contract 过滤", async () => {
    setQueryResult({
      data: [{ id: 1 }, { id: 2 }],
      error: null,
    });

    const request = createMockNextRequest({
      method: "GET",
      url: "http://localhost:3000/api/orderbook/trades?chainId=1&contract=0xabc",
    });

    const response = await getTrades(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(eqMock).toHaveBeenCalledWith("network_id", "1");
    expect(eqMock).toHaveBeenCalledWith("market_address", "0xabc");
  });

  it("应该在 limit 无效时使用默认值 50", async () => {
    const request = createMockNextRequest({
      method: "GET",
      url: "http://localhost:3000/api/orderbook/trades?limit=abc",
    });

    const response = await getTrades(request as any);
    await response.json();

    expect(response.status).toBe(200);
    expect(limitMock).toHaveBeenCalledWith(50);
  });

  it("应该在 limit 超出上限时截断为 200", async () => {
    const request = createMockNextRequest({
      method: "GET",
      url: "http://localhost:3000/api/orderbook/trades?limit=9999",
    });

    const response = await getTrades(request as any);
    await response.json();

    expect(response.status).toBe(200);
    expect(limitMock).toHaveBeenCalledWith(200);
  });

  it("应该在数据库错误时返回 500 错误", async () => {
    setQueryResult({
      data: null,
      error: { message: "db error" },
    });

    const request = createMockNextRequest({
      method: "GET",
      url: "http://localhost:3000/api/orderbook/trades",
    });

    const response = await getTrades(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe(ApiErrorCode.DATABASE_ERROR);
  });

  it("应该返回成功响应和成交数据", async () => {
    setQueryResult({
      data: [
        {
          id: 1,
          network_id: "1",
          market_address: "0xabc",
          block_timestamp: "2024-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const request = createMockNextRequest({
      method: "GET",
      url: "http://localhost:3000/api/orderbook/trades?chainId=1",
    });

    const response = await getTrades(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(1);
    expect(data.data[0].network_id).toBe("1");
  });
});
