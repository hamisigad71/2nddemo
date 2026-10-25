import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adminNotificationPopoverClassName } from '../src/lib/adminNotificationLayout';

describe('admin notification popover layout', () => {
  it('anchors the popover to the mobile viewport and preserves desktop bell alignment', () => {
    assert.match(adminNotificationPopoverClassName, /\bfixed\b/);
    assert.match(adminNotificationPopoverClassName, /\binset-x-3\b/);
    assert.match(adminNotificationPopoverClassName, /\bbottom-3\b/);
    assert.match(adminNotificationPopoverClassName, /\bsm:absolute\b/);
    assert.match(adminNotificationPopoverClassName, /\bsm:right-0\b/);
  });
});
