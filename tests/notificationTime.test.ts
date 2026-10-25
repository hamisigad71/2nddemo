// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'assert';
import { parseNotificationDate, formatTimeAgo, formatLastSeenStatus } from '../src/lib/dateUtils';

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

  describe('User Presence and Last Seen formatting (formatLastSeenStatus)', () => {
    it('returns offline for null, undefined, or empty timestamp', () => {
      assert.deepStrictEqual(formatLastSeenStatus(null), { isOnline: false, label: 'Offline', shortLabel: 'Offline' });
      assert.deepStrictEqual(formatLastSeenStatus(''), { isOnline: false, label: 'Offline', shortLabel: 'Offline' });
    });

    it('marks users active within 5 minutes as Online now', () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const status = formatLastSeenStatus(twoMinutesAgo);
      assert.strictEqual(status.isOnline, true);
      assert.strictEqual(status.label, 'Online now');
      assert.strictEqual(status.shortLabel, 'Online');
    });

    it('formats recent minute intervals when offline', () => {
      const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const status = formatLastSeenStatus(twentyMinsAgo);
      assert.strictEqual(status.isOnline, false);
      assert.strictEqual(status.label, 'Active 20m ago');
      assert.strictEqual(status.shortLabel, '20m ago');
    });

    it('formats hour intervals', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
      const status = formatLastSeenStatus(fiveHoursAgo);
      assert.strictEqual(status.isOnline, false);
      assert.strictEqual(status.label, 'Active 5h ago');
      assert.strictEqual(status.shortLabel, '5h ago');
    });

    it('formats yesterday intervals', () => {
      const yesterday = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
      const status = formatLastSeenStatus(yesterday);
      assert.strictEqual(status.isOnline, false);
      assert.strictEqual(status.label, 'Active yesterday');
      assert.strictEqual(status.shortLabel, 'Yesterday');
    });
  });
});

