/**
 * FlagCard 组件单元测试
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import type { FlagItem } from "../FlagCard";

let FlagCard: typeof import("../FlagCard").FlagCard;

vi.mock("lucide-react", () => ({
  Clock: (props: any) => <svg data-testid="clock-icon" {...props} />,
  CheckCircle2: (props: any) => <svg data-testid="check-circle2-icon" {...props} />,
  Target: (props: any) => <svg data-testid="target-icon" {...props} />,
  Users: (props: any) => <svg data-testid="users-icon" {...props} />,
  Sparkles: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
  ArrowUpRight: (props: any) => <svg data-testid="arrow-up-right-icon" {...props} />,
  Flame: (props: any) => <svg data-testid="flame-icon" {...props} />,
  Camera: (props: any) => <svg data-testid="camera-icon" {...props} />,
}));

vi.mock("framer-motion", () => {
  const motionHandler: ProxyHandler<Record<string, any>> = {
    get(_target, prop: string) {
      const tag = prop === "button" ? "button" : "div";
      return ({ children, ...rest }: any) => {
        const { layout, initial, animate, exit, whileHover, whileTap, transition, ...safeRest } =
          rest;
        return React.createElement(tag, safeRest, children);
      };
    },
  };

  return {
    motion: new Proxy({}, motionHandler),
  };
});

vi.mock("@/components/ui/LazyImage", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@/lib/i18n", () => ({
  useTranslations: vi.fn((namespace?: string) => {
    return (key: string) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const map: Record<string, string> = {
        "flags.card.status.active": "进行中",
        "flags.card.status.pending_review": "待审核",
        "flags.card.status.success": "已完成",
        "flags.card.status.failed": "失败",
        "flags.card.verification.self": "自我验证",
        "flags.card.verification.friend": "见证验证",
        "flags.card.actions.checkin": "打卡",
        "flags.card.actions.history": "历史",
        "flags.card.actions.settle": "结算",
        "flags.card.time.daysLabel": "天",
        "flags.card.time.finished": "已结束",
        "flags.card.time.daysLeftSuffix": "天后结束",
        "flags.card.time.hoursLeftSuffix": "小时后结束",
        "flags.card.proofImageAlt": "证明图片",
        "flags.history.labels.currentWitnessTask": "当前见证任务",
      };
      return map[fullKey] ?? fullKey;
    };
  }),
}));

describe("FlagCard Component", () => {
  beforeAll(async () => {
    FlagCard = (await import("../FlagCard")).FlagCard;
  }, 20000);

  beforeEach(() => {
    vi.useRealTimers();
  });

  const mockActiveFlag: FlagItem = {
    id: 1,
    title: "每日运动打卡",
    description: "坚持每天运动30分钟",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    verification_type: "self",
    created_at: new Date().toISOString(),
    user_id: "user-1",
  };

  const mockPendingFlag: FlagItem = {
    ...mockActiveFlag,
    id: 2,
    status: "pending_review",
    proof_image_url: "/proof.jpg",
    proof_comment: "今天跑步了5公里",
  };

  const mockSuccessFlag: FlagItem = {
    ...mockActiveFlag,
    id: 3,
    status: "success",
  };

  const mockFailedFlag: FlagItem = {
    ...mockActiveFlag,
    id: 4,
    status: "failed",
  };

  describe("基本渲染", () => {
    it("应该渲染 Flag 标题", () => {
      render(<FlagCard flag={mockActiveFlag} />);
      expect(screen.getByText("每日运动打卡")).toBeInTheDocument();
    });

    it("应该渲染 Flag 描述", () => {
      render(<FlagCard flag={mockActiveFlag} />);
      expect(screen.getByText("坚持每天运动30分钟")).toBeInTheDocument();
    });

    it("应该显示状态图标", () => {
      render(<FlagCard flag={mockActiveFlag} />);
      expect(screen.getAllByTestId("target-icon").length).toBeGreaterThan(0);
    });
  });

  describe("状态显示", () => {
    it("active 状态应该显示进行中", () => {
      render(<FlagCard flag={mockActiveFlag} />);
      expect(screen.getByText("进行中")).toBeInTheDocument();
      expect(screen.getAllByTestId("target-icon").length).toBeGreaterThan(0);
    });

    it("pending_review 状态应该显示待审核", () => {
      render(<FlagCard flag={mockPendingFlag} />);
      expect(screen.getByText("待审核")).toBeInTheDocument();
    });

    it("success 状态应该显示已完成", () => {
      render(<FlagCard flag={mockSuccessFlag} />);
      expect(screen.getByText("已完成")).toBeInTheDocument();
      expect(screen.getAllByTestId("check-circle2-icon").length).toBeGreaterThan(0);
    });

    it("failed 状态应该显示失败", () => {
      render(<FlagCard flag={mockFailedFlag} />);
      expect(screen.getByText("失败")).toBeInTheDocument();
    });
  });

  describe("验证类型", () => {
    it("自我验证应该显示正确标签", () => {
      render(<FlagCard flag={mockActiveFlag} />);
      expect(screen.getByText("自我验证")).toBeInTheDocument();
    });

    it("见证验证应该显示正确标签", () => {
      const witnessFlag: FlagItem = {
        ...mockActiveFlag,
        verification_type: "witness",
        witness_id: "witness-1",
      };

      render(<FlagCard flag={witnessFlag} />);
      expect(screen.getByText("见证验证")).toBeInTheDocument();
      expect(screen.getByTestId("users-icon")).toBeInTheDocument();
    });
  });

  describe("用户交互", () => {
    it("点击打卡按钮应该触发回调", () => {
      const onCheckin = vi.fn();
      render(<FlagCard flag={mockActiveFlag} isMine={true} onCheckin={onCheckin} />);

      const checkinButton = screen.getByRole("button", { name: "打卡" });
      fireEvent.click(checkinButton);

      expect(onCheckin).toHaveBeenCalled();
    });

    it("点击查看历史应该触发回调", () => {
      const onViewHistory = vi.fn();
      render(<FlagCard flag={mockActiveFlag} onViewHistory={onViewHistory} />);

      const historyButton = screen.getByRole("button", { name: "历史" });
      fireEvent.click(historyButton);

      expect(onViewHistory).toHaveBeenCalled();
    });

    it("点击结算应该触发回调", () => {
      const onSettle = vi.fn();
      const settleableFlag = {
        ...mockActiveFlag,
        deadline: new Date(Date.now() - 1000).toISOString(), // 已过期
      };

      render(<FlagCard flag={settleableFlag} isMine={true} onSettle={onSettle} />);

      const settleButton = screen.getByRole("button", { name: "结算" });
      fireEvent.click(settleButton);

      expect(onSettle).toHaveBeenCalled();
    });
  });

  describe("证明信息", () => {
    it("有证明图片时应该渲染图片", () => {
      render(<FlagCard flag={mockPendingFlag} />);

      expect(screen.getByRole("img", { name: "每日运动打卡" })).toBeInTheDocument();
    });
  });

  describe("条件渲染", () => {
    it("不是我的 Flag 不应该显示打卡按钮", () => {
      render(<FlagCard flag={mockActiveFlag} isMine={false} />);

      expect(screen.queryByRole("button", { name: "打卡" })).not.toBeInTheDocument();
    });

    it("已完成的 Flag 不应该显示打卡按钮", () => {
      render(<FlagCard flag={mockSuccessFlag} isMine={true} />);

      expect(screen.queryByRole("button", { name: "打卡" })).not.toBeInTheDocument();
    });

    it("未过期的 Flag 不应该显示结算按钮", () => {
      render(<FlagCard flag={mockActiveFlag} isMine={true} />);

      expect(screen.queryByRole("button", { name: "结算" })).not.toBeInTheDocument();
    });
  });

  describe("样式和视觉效果", () => {
    it("应该有正确的卡片样式类", () => {
      const { container } = render(<FlagCard flag={mockActiveFlag} />);

      expect(container.innerHTML).toContain("rounded-[2rem]");
    });

    it("不同状态应该有不同的颜色主题", () => {
      const { container: activeContainer } = render(<FlagCard flag={mockActiveFlag} />);
      const { container: successContainer } = render(<FlagCard flag={mockSuccessFlag} />);

      expect(activeContainer.innerHTML).toContain("emerald");
      expect(successContainer.innerHTML).toContain("blue");
    });
  });
});
