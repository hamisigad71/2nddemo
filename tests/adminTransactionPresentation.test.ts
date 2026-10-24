// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getTransactionStatusStyles } from '../src/lib/adminTransactionPresentation';

describe('admin transaction status presentation', () => {
  it('uses readable semantic status colors in both themes', () => {
    assert.match(getTransactionStatusStyles('success'), /text-emerald-700/);
    assert.match(getTransactionStatusStyles('success'), /dark:text-emerald-300/);
    assert.match(getTransactionStatusStyles('failed'), /text-rose-700/);
    assert.match(getTransactionStatusStyles('failed'), /dark:text-rose-300/);
    assert.match(getTransactionStatusStyles('pending'), /text-amber-700/);
    assert.match(getTransactionStatusStyles('pending'), /dark:text-amber-300/);
  });

  it('uses a neutral style for unknown statuses', () => {
    assert.match(getTransactionStatusStyles('refunded'), /text-slate-700/);
    assert.match(getTransactionStatusStyles(undefined), /dark:text-slate-300/);
  });
});
