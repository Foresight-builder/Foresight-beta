import { describe, it, expect } from "vitest";
import zhCN from "../../../messages/zh-CN.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";

type JsonObject = Record<string, any>;

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
    expectSupersetKeys(zhCN as JsonObject, es as JsonObject);
  });
});
