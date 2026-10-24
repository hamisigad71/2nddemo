export type CreatorDirectoryCandidate = {
  uid: string;
  name?: string | null;
  avatar?: string | null;
  role?: string;
  created_at?: string | null;
};

export type CreatorDirectoryFilter = 'all' | 'verified' | 'trending' | 'popular' | 'new';

type FilterableCreator = {
  isVerified?: boolean;
  hasPosts?: boolean;
  postsCount?: number;
  subs?: string | number | null;
  createdAt?: string | null;
  created_at?: string | null;
};

const getSubscriberCount = (subs: FilterableCreator['subs']): number =>
  Number.parseInt(String(subs ?? '').replace(/\D/g, ''), 10) || 0;

const getCreatedAtTime = (creator: FilterableCreator): number => {
  const date = Date.parse(creator.createdAt || creator.created_at || '');
  return Number.isNaN(date) ? 0 : date;
};

export const filterAndSortCreators = <T extends FilterableCreator>(
  creators: T[],
  filter: CreatorDirectoryFilter,
): T[] => {
  const eligibleCreators = filter === 'verified'
    ? creators.filter((creator) => creator.isVerified)
    : [...creators];

  if (filter === 'new') {
    return eligibleCreators.sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a));
  }

  if (filter === 'popular') {
    return eligibleCreators.sort((a, b) => getSubscriberCount(b.subs) - getSubscriberCount(a.subs));
  }

  if (filter === 'trending') {
    return eligibleCreators.sort((a, b) => {
      if (Boolean(a.hasPosts) !== Boolean(b.hasPosts)) {
        return a.hasPosts ? -1 : 1;
      }
      return (b.postsCount || 0) - (a.postsCount || 0);
    });
  }

  return eligibleCreators;
};

export const GENERIC_CREATOR_NAMES = new Set(['creator', 'vip creator', 'new creator']);

export const resolveCreatorDisplayName = (
  ...names: Array<string | null | undefined>
): string => {
  const displayName = names.find((name) => {
    const normalizedName = name?.trim().toLowerCase();
    return normalizedName && !GENERIC_CREATOR_NAMES.has(normalizedName);
  });

  return displayName?.trim() || 'Creator';
};

type LocalCreatorProfile = {
  uid: string;
  profile: {
    name?: string | null;
    display_name?: string | null;
    avatar?: string | null;
    avatar_url?: string | null;
    created_at?: string | null;
  } | null;
};

export const addLocalCreatorCandidates = <T extends CreatorDirectoryCandidate>(
  creatorUsers: T[],
  localProfiles: LocalCreatorProfile[],
): Array<T | CreatorDirectoryCandidate> => {
  const candidates: Array<T | CreatorDirectoryCandidate> = [...creatorUsers];
  const creatorIds = new Set(creatorUsers.map((creator) => creator.uid));

  localProfiles.forEach(({ uid, profile }) => {
    if (!uid || !profile || creatorIds.has(uid)) return;

    candidates.push({
      uid,
      name: profile.name || profile.display_name || 'Creator',
      avatar: profile.avatar || profile.avatar_url || null,
      role: 'creator',
      ...(profile.created_at ? { created_at: profile.created_at } : {}),
    });
    creatorIds.add(uid);
  });

  return candidates;
};
