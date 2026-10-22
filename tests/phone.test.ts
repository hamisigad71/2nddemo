// @ts-ignore Node.js provides this built-in module at runtime.
import { describe, it } from "node:test";
// @ts-ignore Node.
// his built-in module at runtime.
import assert from "node:assert";
import { formatPhone } from "../src/lib/daraja";

describe("M-Pesa Phone Number Formatter (formatPhone)", () => {
  it("formats standard 10-digit Kenyan number (07XXXXXXXX)", () => {
    assert.strictEqual(formatPhone("0712345678"), "254712345678");
  });

  it("formats Safaricom 01XXXXXXXX series", () => {
    assert.strictEqual(formatPhone("0112345678"), "254112345678");
  });

  it("formats numbers without leading zero (7XXXXXXXX)", () => {
    assert.strictEqual(formatPhone("712345678"), "254712345678");
  });

  it("formats numbers starting with 1 without leading zero (1XXXXXXXX)", () => {
    assert.strictEqual(formatPhone("112345678"), "254112345678");
  });

  it("preserves numbers already in international format (254XXXXXXXXX)", () => {
    assert.strictEqual(formatPhone("254712345678"), "254712345678");
  });

  it("handles numbers with leading plus (+254XXXXXXXXX)", () => {
    assert.strictEqual(formatPhone("+254712345678"), "254712345678");
  });

  it("strips user formatting spaces, hyphens, and brackets", () => {
    assert.strictEqual(formatPhone(" +254 (0712) 345-678 "), "254712345678");
    assert.strictEqual(formatPhone("0712 345 678"), "254712345678");
  });
});
