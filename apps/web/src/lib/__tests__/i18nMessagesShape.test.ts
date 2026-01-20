import { describe, it, expect } from "vitest";
import zhCN from "../../../messages/zh-CN.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import fr from "../../../messages/fr.json";
import ko from "../../../messages/ko.json";

type JsonObject = Record<string, any>;

function mergeDeep(base: unknown, overrides: unknown): unknown {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return base;
  if (!base || typeof base !== "object" || Array.isArray(base)) return overrides;

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    const baseValue = (base as Record<string, unknown>)[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      result[key] = mergeDeep(baseValue, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function collectKeys(obj: JsonObject, prefix = ""): Set<string> {
  const result = new Set<string>();

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      collectKeys(value, fullKey).forEach((nested) => result.add(nested));
    } else {
      result.add(fullKey);
    }
  });

  return result;
}

function expectSupersetKeys(base: JsonObject, other: JsonObject) {
  const baseKeys = collectKeys(base);
  const otherKeys = collectKeys(other);

  const missingInOther = [...baseKeys].filter((key) => !otherKeys.has(key));

  expect(missingInOther).toEqual([]);
}

describe("i18n message files shape", () => {
  it("en.json should contain all keys from zh-CN.json", () => {
    expectSupersetKeys(zhCN as JsonObject, en as JsonObject);
  });

  it("es.json should contain all keys from zh-CN.json", () => {
    expectSupersetKeys(zhCN as JsonObject, mergeDeep(en, es) as JsonObject);
  });

  it("ko.json should contain all keys from zh-CN.json", () => {
    expectSupersetKeys(zhCN as JsonObject, mergeDeep(en, ko) as JsonObject);
  });

  it("fr.json should contain all keys from zh-CN.json (with en fallback)", () => {
    expectSupersetKeys(zhCN as JsonObject, mergeDeep(en, fr) as JsonObject);
  });
});
