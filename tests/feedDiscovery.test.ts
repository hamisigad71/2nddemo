// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllPages } from '../src/lib/pagination';
import { addLocalCreatorCandidates } from '../src/lib/creatorDirectory';

describe('feed and discovery data helpers', () => {
  it('fetches every database page instead of stopping at the first page', async () => {
    const calls: number[] = [];
    const source = [0, 1, 2, 3, 4];
    const results = await fetchAllPages(async (offset, pageSize) => {
      calls.push(offset);
      const data = source.slice(offset, offset + pageSize);
      return { data };
    }, 2);

    assert.deepEqual(calls, [0, 2, 4]);
    assert.deepEqual(results, source);
  });

  it('throws when a page query fails', async () => {
    await assert.rejects(
      fetchAllPages(async () => ({ data: null, error: new Error('database unavailable') }), 2),
      /database unavailable/,
    );
  });

  it('includes locally cached creators missing from database creator rows without duplicating entries', () => {
    const candidates = addLocalCreatorCandidates(
      [{ uid: 'existing-user', name: 'Existing Creator', role: 'creator' }],
      [
        { uid: 'existing-user', profile: { name: 'Cached Name' } },
        { uid: 'cached-user', profile: { display_name: 'New Creator', avatar_url: 'avatar.png' } },
      ],
    );

    assert.equal(candidates.length, 2);
    assert.deepEqual(candidates[1], {
      uid: 'cached-user',
      name: 'New Creator',
      avatar: 'avatar.png',
      role: 'creator',
    });
  });
});
