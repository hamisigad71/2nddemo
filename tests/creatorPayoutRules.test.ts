import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  MINIMUM_CREATOR_PAYOUT_KES,
  getCreatorPayoutAmountError,
  normalizeKenyanMpesaPhone,
  getCreatorPayoutPhoneError,
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

describe('creator M-Pesa phone number validation and normalization', () => {
  it('normalizes valid Kenyan 07/01/+254/254 formats to canonical +254XXXXXXXXX', () => {
    assert.strictEqual(normalizeKenyanMpesaPhone('0742351312'), '+254742351312');
    assert.strictEqual(normalizeKenyanMpesaPhone('0742 351 312'), '+254742351312');
    assert.strictEqual(normalizeKenyanMpesaPhone('0112345678'), '+254112345678');
    assert.strictEqual(normalizeKenyanMpesaPhone('742351312'), '+254742351312');
    assert.strictEqual(normalizeKenyanMpesaPhone('112345678'), '+254112345678');
    assert.strictEqual(normalizeKenyanMpesaPhone('254742351312'), '+254742351312');
    assert.strictEqual(normalizeKenyanMpesaPhone('+254742351312'), '+254742351312');
    assert.strictEqual(normalizeKenyanMpesaPhone('+254 (0742) 351-312'), '+254742351312');
  });

  it('rejects short, overly long, empty, or non-Kenyan-mobile numbers', () => {
    assert.strictEqual(normalizeKenyanMpesaPhone(''), null);
    assert.strictEqual(normalizeKenyanMpesaPhone('074235131'), null); // 9 digits with leading 0 (missing digit)
    assert.strictEqual(normalizeKenyanMpesaPhone('07423513123'), null); // 11 digits (extra digit)
    assert.strictEqual(normalizeKenyanMpesaPhone('0812345678'), null); // invalid prefix
    assert.strictEqual(normalizeKenyanMpesaPhone('0201234567'), null); // landline
    assert.strictEqual(normalizeKenyanMpesaPhone('Not specified'), null);
  });

  it('catches typos when M-Pesa confirmation number does not match', () => {
    assert.strictEqual(getCreatorPayoutPhoneError('0742351312', '+254742351312'), null);
    assert.match(
      getCreatorPayoutPhoneError('0742351312', '0742351313') || '',
      /do not match/i
    );
    assert.match(
      getCreatorPayoutPhoneError('0742351312', '') || '',
      /re-enter/i
    );
  });
});
