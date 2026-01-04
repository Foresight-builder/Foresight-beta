import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatNumber,
  formatInteger,
  formatPercent,
  formatCompactNumber,
  formatCurrency,
  formatRelativeTime,
} from "../format";

describe("format helpers", () => {
  it("formatDate handles null and invalid values", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("not-a-date")).toBe("");
  });

  it("formatDate returns non-empty for valid date", () => {
    const result = formatDate("2024-01-02T03:04:05Z", "en");
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formatDateTime returns non-empty for valid date", () => {
    const result = formatDateTime("2024-01-02T03:04:05Z", "en");
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formatTime returns non-empty for valid date", () => {
    const result = formatTime("2024-01-02T03:04:05Z", "en");
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formatNumber handles null and invalid values", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber("not-a-number")).toBe("0");
  });

  it("formatNumber formats numeric values", () => {
    const result = formatNumber(1234.56, "en");
    expect(result).toBeTypeOf("string");
    expect(result).not.toBe("0");
  });

  it("formatInteger produces integer-like output", () => {
    const result = formatInteger(1234.56, "en");
    const numeric = Number(result.replace(/[^\d-]/g, ""));
    expect(Number.isNaN(numeric)).toBe(false);
    expect(numeric).toBeGreaterThan(0);
  });

  it("formatPercent handles null and invalid values as zero percent", () => {
    const nullResult = formatPercent(null, "en");
    const invalidResult = formatPercent("not-a-number", "en");
    expect(nullResult).toBeTypeOf("string");
    expect(invalidResult).toBeTypeOf("string");
    expect(nullResult.length).toBeGreaterThan(0);
    expect(invalidResult.length).toBeGreaterThan(0);
  });

  it("formatPercent formats values as percentages of 100", () => {
    const result = formatPercent(50, "en");
    expect(result).toContain("50");
  });

  it("formatCompactNumber handles null and invalid values", () => {
    expect(formatCompactNumber(null)).toBe("0");
    expect(formatCompactNumber("not-a-number")).toBe("0");
  });

  it("formatCompactNumber formats numeric values", () => {
    const result = formatCompactNumber(1234, "en");
    expect(result).toBeTypeOf("string");
    expect(result).not.toBe("0");
  });

  it("formatCurrency handles null and invalid values", () => {
    expect(formatCurrency(null, "en", "USD")).toBe("");
    expect(formatCurrency("not-a-number", "en", "USD")).toBe("");
  });

  it("formatCurrency formats numeric values with currency", () => {
    const result = formatCurrency(12.34, "en", "USD");
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formatRelativeTime handles invalid dates", () => {
    expect(formatRelativeTime("not-a-date", "also-bad")).toBe("");
  });

  it("formatRelativeTime returns non-empty for valid dates", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 60 * 1000);
    const result = formatRelativeTime(past, now, "en");
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
