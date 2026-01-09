import { describe, it, expect } from "vitest";
import { normalizeAddress, formatAddress } from "../address";

describe("address", () => {
  it("normalizeAddress lowercases 0x addresses", () => {
    expect(normalizeAddress("0xABC0000000000000000000000000000000000000")).toBe(
      "0xabc0000000000000000000000000000000000000"
    );
  });

  it("normalizeAddress keeps non-0x strings unchanged except String()", () => {
    expect(normalizeAddress("abc")).toBe("abc");
  });

  it("formatAddress shortens long addresses", () => {
    expect(formatAddress("0xabc0000000000000000000000000000000000000")).toBe("0xabc0...0000");
  });
});
