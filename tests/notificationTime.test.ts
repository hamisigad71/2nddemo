import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseNotificationDate, formatTimeAgo } from '../src/lib/dateUtils';

describe('Notification Time & Date Utilities (dateUtils)', () => {
  it('parses timestamps without timezone offset as UTC', () => {
    const raw = '2026-10-22 12:00:00';
    const parsed = parseNotificationDate(raw);
    assert.strictEqual(parsed.toISOString(), '2026-10-22T12:00:00.000Z');
  });

  it('preserves timestamps that already have ISO Z suffix', () => {
    const iso = '2026-10-22T14:30:00.000Z';
    const parsed = parseNotificationDate(iso);
    assert.strictEqual(parsed.toISOString(), iso);
  });

  it('handles null, undefined, and empty string without throwing', () => {
    assert.doesNotThrow(() => parseNotificationDate(''));
    assert.doesNotThrow(() => parseNotificationDate(null as any));
    assert.doesNotThrow(() => parseNotificationDate(undefined as any));
  });

  it('formats recent timestamps (< 60 seconds) as "Just now"', () => {
    const nowIso = new Date(Date.now() - 15 * 1000).toISOString();
    assert.strictEqual(formatTimeAgo(nowIso), 'Just now');
  });

  it('formats minute intervals correctly (e.g. "12m ago")', () => {
    const twelveMinsAgo = new Date(Date.now() - 12 * 60 * 1000).toISOString();
    assert.strictEqual(formatTimeAgo(twelveMinsAgo), '12m ago');
  });

  it('formats hour intervals correctly (e.g. "3h ago")', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    assert.strictEqual(formatTimeAgo(threeHoursAgo), '3h ago');
  });

  it('formats 24 to 48 hour intervals as "Yesterday"', () => {
    const yesterday = new Date(Date.now() - 28 * 3600 * 1000).toISOString();
    assert.strictEqual(formatTimeAgo(yesterday), 'Yesterday');
  });

  it('formats multi-day intervals within a week (e.g. "4d ago")', () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();
    assert.strictEqual(formatTimeAgo(fourDaysAgo), '4d ago');
  });
});

