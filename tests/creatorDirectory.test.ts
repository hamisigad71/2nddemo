// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCreatorDisplayName } from '../src/lib/creatorDirectory';

describe('creator display name resolution', () => {
  it('uses the creator profile name when the users row contains a placeholder', () => {
    assert.equal(resolveCreatorDisplayName('VIP Creator', 'Sir Collo'), 'Sir Collo');
  });

  it('prefers a real users-row name over the creator profile name', () => {
    assert.equal(resolveCreatorDisplayName('Sir Collo', 'Sir C.'), 'Sir Collo');
  });

  it('falls back to a generic name when all names are placeholders', () => {
    assert.equal(resolveCreatorDisplayName('Creator', 'VIP Creator'), 'VIP Creator');
  });
});
