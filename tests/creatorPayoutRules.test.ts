import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  MINIMUM_CREATOR_PAYOUT_KES,
  getCreatorPayoutAmountError,
} from '../src/lib/creatorPayoutRules';

describe('creator payout minimum', () => {
  it('sets the minimum payout to KES 1,000', () => {
    assert.strictEqual(MINIMUM_CREATOR_PAYOUT_KES, 1000);
  });

  it('rejects payout requests below KES 1,000', () => {
    assert.match(getCreatorPayoutAmountError(999) || '', /KES 1,000/);
  });

  it('allows a payout request of exactly KES 1,000', () => {
    assert.strictEqual(getCreatorPayoutAmountError(1000), null);
  });

  it('rejects payout requests greater than the available balance', () => {
    assert.match(getCreatorPayoutAmountError(1500, 1200) || '', /available balance/i);
  });

  it('rejects non-finite or non-positive amounts', () => {
    assert.ok(getCreatorPayoutAmountError(Number.NaN));
    assert.ok(getCreatorPayoutAmountError(0));
    assert.ok(getCreatorPayoutAmountError(-1));
  });
});
