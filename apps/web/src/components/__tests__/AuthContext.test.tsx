import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuthOptional } from "@/contexts/AuthContext";

const signInWithOtpMock = vi.hoisted(() => vi.fn());
const verifyOtpMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());
const onAuthStateChangeMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  }))
);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOtp: signInWithOtpMock,
      verifyOtp: verifyOtpMock,
      signOut: signOutMock,
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  },
}));

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
    document.cookie = "fs_remember=1";
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it("requestEmailOtp 成功时调用 supabase 并不设置错误", async () => {
    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    signInWithOtpMock.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    await act(async () => {
      await latestAuth!.requestEmailOtp("test@example.com");
    });

    expect(signInWithOtpMock).toHaveBeenCalledTimes(1);
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "test@example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: expect.any(String),
      },
    });

    await waitFor(() => {
      expect(latestAuth!.error).toBeNull();
    });
  });

  it("requestEmailOtp 失败时会设置错误信息", async () => {
    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    const error = new Error("request failed");
    signInWithOtpMock.mockResolvedValueOnce({
      data: null,
      error,
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
    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    verifyOtpMock.mockResolvedValueOnce({
      data: {
        user: {
          id: "u1",
          email: "user@example.com",
          user_metadata: { name: "User" },
        },
      },
      error: null,
    });

    await act(async () => {
      await latestAuth!.verifyEmailOtp("user@example.com", "123456");
    });

    expect(verifyOtpMock).toHaveBeenCalledTimes(1);
    expect(verifyOtpMock).toHaveBeenCalledWith({
      type: "email",
      email: "user@example.com",
      token: "123456",
    });

    await waitFor(() => {
      expect(latestAuth!.user).toEqual({
        id: "u1",
        email: "user@example.com",
        user_metadata: { name: "User" },
      });
      expect(latestAuth!.error).toBeNull();
    });
  });

  it("sendMagicLink 成功时与 requestEmailOtp 行为一致", async () => {
    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    signInWithOtpMock.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    await act(async () => {
      await latestAuth!.sendMagicLink("magic@example.com");
    });

    expect(signInWithOtpMock).toHaveBeenCalledTimes(1);
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "magic@example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: expect.any(String),
      },
    });

    await waitFor(() => {
      expect(latestAuth!.error).toBeNull();
    });
  });

  it("signOut 会调用 supabase signOut 并清空错误", async () => {
    renderWithAuthProvider();
    await waitFor(() => {
      expect(latestAuth).toBeDefined();
    });

    signOutMock.mockResolvedValueOnce({
      error: null,
    });

    await act(async () => {
      await latestAuth!.signOut();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(latestAuth!.error).toBeNull();
    });
  });
});
