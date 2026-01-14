import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuthOptional } from "@/contexts/AuthContext";

function mockJsonResponse(args: { ok: boolean; json: unknown }) {
  return {
    ok: args.ok,
    status: args.ok ? 200 : 400,
    json: async () => args.json,
  } as any;
}

let latestAuth: ReturnType<typeof useAuthOptional> | undefined;

function TestConsumer() {
  latestAuth = useAuthOptional();
  return null;
}

function renderWithAuthProvider() {
  latestAuth = undefined;
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe("AuthContext 邮箱登录逻辑", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_EMBEDDED_AUTH_ENABLED", "true");
    document.cookie = "fs_remember=1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: any, init?: any) => {
        const url = typeof input === "string" ? input : String(input?.url || "");
        if (url === "/api/auth/me") {
          return mockJsonResponse({ ok: false, json: { authenticated: false } });
        }
        if (url === "/api/user-profiles") {
          return mockJsonResponse({ ok: true, json: { success: true, data: { profile: null } } });
        }
        if (url === "/api/email-otp/request") {
          return mockJsonResponse({
            ok: true,
            json: { success: true, data: { expiresInSec: 900 }, message: "ok" },
          });
        }
        if (url === "/api/email-otp/verify") {
          return mockJsonResponse({
            ok: true,
            json: { success: true, data: { ok: true, address: "0x" + "1".repeat(40) } },
          });
        }
        if (url === "/api/siwe/logout") {
          return mockJsonResponse({ ok: true, json: { success: true } });
        }
        return mockJsonResponse({ ok: false, json: { success: false, message: "not mocked" } });
      })
    );
  });

  it("requestEmailOtp 成功时不设置错误", async () => {
    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    await act(async () => {
      await latestAuth!.requestEmailOtp("test@example.com");
    });

    await waitFor(() => {
      expect(latestAuth!.error).toBeNull();
    });
  });

  it("requestEmailOtp 失败时会设置错误信息", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementationOnce(async (input: any) => {
      const url = typeof input === "string" ? input : String(input?.url || "");
      if (url === "/api/auth/me") {
        return mockJsonResponse({ ok: false, json: { authenticated: false } });
      }
      return mockJsonResponse({ ok: false, json: { success: false, message: "not mocked" } });
    });
    fetchMock.mockImplementationOnce(async () => {
      return mockJsonResponse({
        ok: false,
        json: { success: false, error: { message: "request failed" } },
      });
    });

    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    await act(async () => {
      await expect(latestAuth!.requestEmailOtp("test@example.com")).rejects.toThrow(
        "request failed"
      );
    });

    await waitFor(() => {
      expect(latestAuth!.error).toBe("request failed");
    });
  });

  it("verifyEmailOtp 成功时会更新用户信息", async () => {
    const address = "0x" + "2".repeat(40);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : String(input?.url || "");
      if (url === "/api/auth/me") {
        return mockJsonResponse({ ok: true, json: { authenticated: true, address } });
      }
      if (url.startsWith("/api/user-profiles?")) {
        return mockJsonResponse({
          ok: true,
          json: {
            success: true,
            data: { profile: { email: "user@example.com", username: "User" } },
          },
        });
      }
      if (url === "/api/email-otp/verify") {
        return mockJsonResponse({
          ok: true,
          json: { success: true, data: { ok: true, address } },
        });
      }
      if (url === "/api/email-otp/request") {
        return mockJsonResponse({
          ok: true,
          json: { success: true, data: { expiresInSec: 900 }, message: "ok" },
        });
      }
      if (url === "/api/siwe/logout") {
        return mockJsonResponse({ ok: true, json: { success: true } });
      }
      return mockJsonResponse({ ok: false, json: { success: false, message: "not mocked" } });
    });

    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    await act(async () => {
      await latestAuth!.verifyEmailOtp("user@example.com", "123456");
    });

    await waitFor(() => {
      expect(latestAuth!.user?.id).toBe(address);
      expect(latestAuth!.user?.email).toBe("user@example.com");
      expect(latestAuth!.user?.user_metadata).toEqual({ username: "User" });
      expect(latestAuth!.error).toBeNull();
    });
  });

  it("sendMagicLink 成功时与 requestEmailOtp 行为一致", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : String(input?.url || "");
      if (url === "/api/auth/me") {
        return mockJsonResponse({ ok: true, json: { authenticated: false } });
      }
      if (url === "/api/email-magic-link/request") {
        return mockJsonResponse({
          ok: true,
          json: { success: true, data: { expiresInSec: 600 }, message: "ok" },
        });
      }
      return mockJsonResponse({ ok: false, json: { success: false, message: "not mocked" } });
    });

    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    await act(async () => {
      await latestAuth!.sendMagicLink("magic@example.com");
    });

    await waitFor(() => {
      expect(latestAuth!.error).toBeNull();
    });
  });

  it("signOut 会调用 siwe/logout 并清空用户", async () => {
    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    await act(async () => {
      await latestAuth!.signOut();
    });

    await waitFor(() => {
      expect(latestAuth!.error).toBeNull();
      expect(latestAuth!.user).toBeNull();
    });
  });
});
