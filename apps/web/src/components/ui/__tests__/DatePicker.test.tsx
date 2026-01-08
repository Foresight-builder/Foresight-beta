/**
 * DatePicker 组件单元测试
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const fixedNow = new Date("2025-01-15T10:30:00");
let DatePicker: typeof import("../DatePicker").default;

describe("DatePicker Component", () => {
  beforeAll(async () => {
    vi.doMock("lucide-react", () => ({
      Calendar: (props: any) => <svg data-testid="calendar-icon" {...props} />,
      ChevronLeft: (props: any) => <svg data-testid="chevron-left-icon" {...props} />,
      ChevronRight: (props: any) => <svg data-testid="chevron-right-icon" {...props} />,
      Clock: (props: any) => <svg data-testid="clock-icon" {...props} />,
      X: (props: any) => <svg data-testid="x-icon" {...props} />,
    }));

    vi.doMock("framer-motion", () => {
      const motionHandler: ProxyHandler<Record<string, any>> = {
        get() {
          return ({ children, ...rest }: any) => <div {...rest}>{children}</div>;
        },
      };

      return {
        motion: new Proxy({}, motionHandler),
        AnimatePresence: ({ children }: any) => <>{children}</>,
      };
    });

    vi.doMock("@/lib/i18n", () => ({
      useTranslations: vi.fn((namespace?: string) => {
        return (key: string) => {
          const fullKey = namespace ? `${namespace}.${key}` : key;
          if (fullKey === "common.datePicker.placeholder") return "选择日期";
          if (fullKey === "common.datePicker.confirm") return "确定";
          if (fullKey === "common.datePicker.timeLabel") return "时间";
          if (fullKey === "common.datePicker.header") return "{year}年 {month}";
          if (fullKey === "common.datePicker.displayDate") return "{year}年{month}月{day}日";
          if (fullKey === "common.datePicker.displayWithTime")
            return "{year}年{month}月{day}日 {hour}:{minute}";
          if (fullKey.startsWith("common.datePicker.monthNames.")) {
            const idx = Number(fullKey.split(".").at(-1));
            const monthNames = [
              "一月",
              "二月",
              "三月",
              "四月",
              "五月",
              "六月",
              "七月",
              "八月",
              "九月",
              "十月",
              "十一月",
              "十二月",
            ];
            return monthNames[idx] ?? "";
          }
          if (fullKey.startsWith("common.datePicker.weekdayNames.")) {
            const idx = Number(fullKey.split(".").at(-1));
            const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];
            return weekdayNames[idx] ?? "";
          }
          return fullKey;
        };
      }),
      formatTranslation: (
        template: string,
        params?: Record<string, string | number | undefined>
      ) => {
        if (!params) return template;
        return template.replace(/\{(\w+)\}/g, (_, rawKey: string) => {
          const v = params[rawKey];
          return v === undefined ? `{${rawKey}}` : String(v);
        });
      },
    }));

    vi.resetModules();
    DatePicker = (await import("../DatePicker")).default;
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    document.body.innerHTML = "";
  });

  describe("基本功能", () => {
    it("初始应该显示占位文案", () => {
      render(<DatePicker value="" onChange={() => {}} placeholder="请选择日期" />);

      expect(screen.getByText("请选择日期")).toBeInTheDocument();
      expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
    });
  });

  describe("日期选择", () => {
    it("点击后应该展开日期面板并选择某天", () => {
      const handleChange = vi.fn();

      render(<DatePicker value="" onChange={handleChange} placeholder="选择日期" />);

      // 打开面板
      const trigger = screen.getByText("选择日期");
      fireEvent.click(trigger);

      // 选择 20 号
      const dayButton = screen.getAllByRole("button").find((btn) => btn.textContent === "20");
      expect(dayButton).toBeDefined();
      fireEvent.click(dayButton as HTMLButtonElement);

      expect(handleChange).toHaveBeenCalledTimes(1);
      const arg = handleChange.mock.calls[0][0] as string;
      expect(arg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("在 includeTime=true 时，改变时间应更新值", () => {
      const handleChange = vi.fn();

      render(<DatePicker value="2025-01-15T10:30" onChange={handleChange} includeTime />);

      fireEvent.click(screen.getByText(/2025年1月15日/));

      const timeInput = screen.getByDisplayValue("10:30") as HTMLInputElement;
      fireEvent.change(timeInput, { target: { value: "12:00" } });

      expect(handleChange).toHaveBeenCalled();
      const lastArg = handleChange.mock.calls.at(-1)?.[0] as string;
      expect(lastArg).toBe("2025-01-15T12:00");
    });
  });

  describe("日期验证", () => {
    it("默认不允许选择今天之前的日期", () => {
      const handleChange = vi.fn();

      render(<DatePicker value="" onChange={handleChange} />);

      fireEvent.click(screen.getByText("选择日期"));

      const allButtons = screen.getAllByRole("button");
      const pastDayButton = allButtons.find((btn) => btn.textContent === "10") as HTMLButtonElement;
      const todayButton = allButtons.find((btn) => btn.textContent === "15") as HTMLButtonElement;

      expect(pastDayButton).toBeDisabled();
      expect(todayButton).not.toBeDisabled();
    });

    it("设置 minDate 时，早于 minDate 的日期应该被禁止选择", () => {
      const handleChange = vi.fn();

      render(<DatePicker value="" onChange={handleChange} minDate="2025-01-20" />);

      fireEvent.click(screen.getByText("选择日期"));

      const allButtons = screen.getAllByRole("button");
      const beforeMin = allButtons.find((btn) => btn.textContent === "15") as HTMLButtonElement;
      const atMin = allButtons.find((btn) => btn.textContent === "20") as HTMLButtonElement;

      expect(beforeMin).toBeDisabled();
      expect(atMin).not.toBeDisabled();
    });
  });

  describe("格式化", () => {
    it("不含时间时，应该展示 yyyy年M月d日", () => {
      render(<DatePicker value="2025-01-15" onChange={() => {}} />);

      expect(screen.getByText("2025年1月15日")).toBeInTheDocument();
    });

    it("含时间时，应该展示 yyyy年M月d日 HH:mm", () => {
      render(<DatePicker value="2025-01-15T09:05" onChange={() => {}} includeTime />);

      expect(screen.getByText("2025年1月15日 09:05")).toBeInTheDocument();
    });
  });

  describe("可访问性", () => {
    it("外层应该可通过 role / 交互访问", () => {
      render(<DatePicker value="" onChange={() => {}} placeholder="选择日期" />);

      const trigger = screen.getByText("选择日期");
      expect(trigger).toBeInTheDocument();
      fireEvent.click(trigger);

      const monthTitle = screen.getByText(/2025年/);
      expect(monthTitle).toBeInTheDocument();
    });
  });
});
