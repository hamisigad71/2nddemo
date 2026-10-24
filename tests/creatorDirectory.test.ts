// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAndSortCreators,
  resolveCreatorDisplayName,
  type CreatorDirectoryFilter,
} from '../src/lib/creatorDirectory';

describe('creator display name resolution', () => {
  it('uses the creator profile name when the users row contains a placeholder', () => {
    assert.equal(resolveCreatorDisplayName('VIP Creator', 'Sir Collo'), 'Sir Collo');
  });

  it('prefers a real users-row name over the creator profile name', () => {
    assert.equal(resolveCreatorDisplayName('Sir Collo', 'Sir C.'), 'Sir Collo');
  });

  it('uses Creator as the generic name when all names are placeholders', () => {
    assert.equal(resolveCreatorDisplayName('Creator', 'VIP Creator'), 'Creator');
    assert.equal(resolveCreatorDisplayName(), 'Creator');
  });
});

describe('creator directory filters', () => {
  const creators = [
    { id: 'new', name: 'New', isVerified: false, hasPosts: false, postsCount: 0, subs: '12 subscribers', createdAt: '2025-03-01' },
    { id: 'trending', name: 'Trending', isVerified: true, hasPosts: true, postsCount: 8, subs: '30 subscribers', createdAt: '2025-01-01' },
    { id: 'popular', name: 'Popular', isVerified: false, hasPosts: true, postsCount: 2, subs: '1,200 subscribers', createdAt: '2025-02-01' },
    { id: 'verified', name: 'Verified', isVerified: true, hasPosts: false, postsCount: 0, subs: '4 subscribers', createdAt: '2025-04-01' },
  ];

  const idsFor = (filter: CreatorDirectoryFilter) =>
    filterAndSortCreators(creators, filter).map((creator) => creator.id);

  it('shows every creator in the All Creators filter', () => {
    assert.deepEqual(idsFor('all'), ['new', 'trending', 'popular', 'verified']);
  });

  it('only shows verified creators in the Verified filter', () => {
    assert.deepEqual(idsFor('verified'), ['trending', 'verified']);
  });

  it('ranks active feeds and post counts in the Trending filter', () => {
    assert.deepEqual(idsFor('trending'), ['trending', 'popular', 'new', 'verified']);
  });

  it('ranks subscriber counts numerically in the Popular filter', () => {
    assert.deepEqual(idsFor('popular'), ['popular', 'trending', 'new', 'verified']);
  });

  it('sorts newest creators first in the New filter', () => {
    assert.deepEqual(idsFor('new'), ['verified', 'new', 'popular', 'trending']);
  });
});
