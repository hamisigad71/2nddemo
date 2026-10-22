import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PLATFORM_FEE, calculateFeeSplit } from '../src/lib/db';

describe('Platform Fee & Split Calculation (calculateFeeSplit)', () => {
  it('has platform fee set to 30% (0.30)', () => {
    assert.strictEqual(PLATFORM_FEE, 0.30);
  });

  it('correctly calculates 70/30 split on standard KES 1,000 subscription', () => {
    const split = calculateFeeSplit(1000);
    assert.strictEqual(split.platformFee, 300);
    assert.strictEqual(split.creatorNet, 700);
    assert.strictEqual(split.platformFee + split.creatorNet, 1000);
  });

  it('handles rounding on odd amounts without losing shillings', () => {
    // 555 * 0.30 = 166.5 -> rounded to 167. Net = 555 - 167 = 388.
    const split = calculateFeeSplit(555);
    assert.strictEqual(split.platformFee, 167);
    assert.strictEqual(split.creatorNet, 388);
    assert.strictEqual(split.platformFee + split.creatorNet, 555);
  });

  it('handles zero or negative amounts gracefully', () => {
    const splitZero = calculateFeeSplit(0);
    assert.strictEqual(splitZero.platformFee, 0);
    assert.strictEqual(splitZero.creatorNet, 0);

    const splitNegative = calculateFeeSplit(-100);
    assert.strictEqual(splitNegative.platformFee, 0);
    assert.strictEqual(splitNegative.creatorNet, 0);
  });
});

