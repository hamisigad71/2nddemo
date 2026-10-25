// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAndSortCreators,
  hasCreatorDirectoryCandidate,
  resolveCreatorDisplayName,
  type CreatorDirectoryFilter,
} from '../src/lib/creatorDirectory';

describe('creator directory candidate matching', () => {
  const fatma = {
    uid: '347f9665-49b7-4458-9ef2-457e19d60a80',
    name: 'Fatma Loki',
    email: 'hadq@gmail.com',
  };

  it('recognizes the creator by id, name, or email to avoid duplicate cards', () => {
    assert.equal(
      hasCreatorDirectoryCandidate([fatma], 'Fatma Loki', 'hadq@gmail.com', fatma.uid),
      true,
    );
    assert.equal(
      hasCreatorDirectoryCandidate(
        [{ ...fatma, uid: 'other-id' }],
        'Fatma Loki',
        'hadq@gmail.com',
        fatma.uid,
      ),
      true,
    );
    assert.equal(
      hasCreatorDirectoryCandidate(
        [{ ...fatma, uid: 'other-id', name: 'Other' }],
        'Fatma Loki',
        'hadq@gmail.com',
        fatma.uid,
      ),
      true,
    );
    assert.equal(
      hasCreatorDirectoryCandidate([], 'Fatma Loki', 'hadq@gmail.com', fatma.uid),
      false,
    );
  });
});

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
  const creatorsWithDemoAccount = [
    ...creators,
    { id: 'demo-verified', name: 'Demo Verified', isVerified: true, isDemo: true, hasPosts: false, postsCount: 0, subs: '0 subscribers', createdAt: '2025-05-01' },
  ];

  it('shows every creator in the All Creators filter', () => {
    assert.deepEqual(idsFor('all'), ['new', 'trending', 'popular', 'verified']);
  });

  it('only shows verified creators in the Verified filter', () => {
    assert.deepEqual(idsFor('verified'), ['trending', 'verified']);
  });

  it('keeps unverified creators in the other filters and excludes demo accounts from Verified', () => {
    assert.deepEqual(
      filterAndSortCreators(creatorsWithDemoAccount, 'all').map((creator) => creator.id),
      ['new', 'trending', 'popular', 'verified', 'demo-verified'],
    );
    assert.deepEqual(
      filterAndSortCreators(creatorsWithDemoAccount, 'verified').map((creator) => creator.id),
      ['trending', 'verified'],
    );
  });

  it('prioritizes discover-featured creators without treating them as verified', () => {
    const featuredUnverified = {
      id: 'featured-unverified',
      isVerified: false,
      isDiscoverFeatured: true,
      hasPosts: false,
      postsCount: 0,
      subs: '0 subscribers',
      createdAt: '2024-01-01',
    };
    const creatorsWithFeatured = [...creators, featuredUnverified];

    for (const filter of ['all', 'trending', 'popular', 'new'] as const) {
      assert.equal(
        filterAndSortCreators(creatorsWithFeatured, filter)[0].id,
        'featured-unverified',
      );
    }
    assert.equal(
      filterAndSortCreators(creatorsWithFeatured, 'verified').some(
        (creator) => creator.id === 'featured-unverified',
      ),
      false,
    );
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

  it('filters the selected creator gender without changing the selected sort', () => {
    const genderedCreators = [
      { id: 'woman-profile', gender: 'Woman', hasPosts: true, postsCount: 4 },
      { id: 'man-profile', gender: 'Man', hasPosts: true, postsCount: 8 },
      { id: 'woman-value', gender: 'woman', hasPosts: true, postsCount: 2 },
      { id: 'man-value', gender: 'man', hasPosts: false, postsCount: 0 },
      { id: 'unspecified', gender: null, hasPosts: true, postsCount: 1 },
    ];

    assert.deepEqual(
      filterAndSortCreators(genderedCreators, 'trending', 'male').map((creator) => creator.id),
      ['man-profile', 'man-value'],
    );
    assert.deepEqual(
      filterAndSortCreators(genderedCreators, 'trending', 'female').map((creator) => creator.id),
      ['woman-profile', 'woman-value'],
    );
    assert.deepEqual(
      filterAndSortCreators(genderedCreators, 'trending').map((creator) => creator.id),
      ['man-profile', 'woman-profile', 'woman-value', 'unspecified', 'man-value'],
    );
  });
});
