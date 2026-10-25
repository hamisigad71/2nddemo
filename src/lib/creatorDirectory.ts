export type CreatorDirectoryCandidate = {
  uid: string;
  name?: string | null;
  avatar?: string | null;
  role?: string;
  created_at?: string | null;
};

export type CreatorDirectoryFilter = 'all' | 'verified' | 'trending' | 'popular' | 'new';
export type CreatorGenderFilter = 'all' | 'male' | 'female';

export const SELECTED_VERIFIED_CREATOR_NAMES = new Set([
  'natalia ngina',
  'ella rains',
]);

export const SELECTED_VERIFIED_CREATOR_EMAILS = new Set([
  'nataliangina62@gmail.com',
  'ellarains00@gmail.com',
]);

export const SELECTED_VERIFIED_CREATOR_UIDS = new Set([
  '135c3008-8a65-4474-86fc-6782228e54f9', // Natalia Ngina
  'cb31eb35-25ca-4dc7-983d-f9de8065001f', // Ella Rains
]);

export const UNVERIFIED_DISCOVER_EMAILS = new Set([
  'hadq@gmail.com',
  'sircollo51@gmail.com',
  'executivehideawaybarberandspa@gmail.com',
  'acholawanjiru@gmail.com',
]);

export const UNVERIFIED_DISCOVER_NAMES = new Set([
  'fatma loki',
  'sir collo',
  'david kimani',
  'unfiltered_culture',
  'unfiltered_culture💦😍👑',
]);

export const UNVERIFIED_DISCOVER_UIDS = new Set([
  '347f9665-49b7-4458-9ef2-457e19d60a80', // fatma loki
]);

export const isUnverifiedDiscoverUser = (
  name?: string | null,
  email?: string | null,
  uid?: string | null,
): boolean => {
  if (email && UNVERIFIED_DISCOVER_EMAILS.has(email.trim().toLowerCase())) return true;
  if (name && UNVERIFIED_DISCOVER_NAMES.has(name.trim().toLowerCase())) return true;
  if (uid && UNVERIFIED_DISCOVER_UIDS.has(uid)) return true;
  return false;
};

export const isSelectedVerifiedCreator = (
  name?: string | null,
  email?: string | null,
  uid?: string | null,
): boolean => {
  if (isUnverifiedDiscoverUser(name, email, uid)) return false;
  if (name && SELECTED_VERIFIED_CREATOR_NAMES.has(name.trim().toLowerCase())) return true;
  if (email && SELECTED_VERIFIED_CREATOR_EMAILS.has(email.trim().toLowerCase())) return true;
  if (uid && SELECTED_VERIFIED_CREATOR_UIDS.has(uid)) return true;
  return false;
};

export const shouldIncludeCreatorInDiscover = (
  isExplicitlyFeatured: boolean,
  hasUploadedAvatar: boolean,
  hasUploadedCover: boolean,
  isVerified?: boolean,
): boolean => isExplicitlyFeatured || Boolean(isVerified) || (hasUploadedAvatar && hasUploadedCover);

type FilterableCreator = {
  gender?: string | null;
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
  genderFilter: CreatorGenderFilter = 'all',
): T[] => {
  const eligibleCreators = filter === 'verified'
    ? creators.filter((creator) => creator.isVerified)
    : [...creators];

  let sortedCreators = eligibleCreators;

  if (filter === 'new') {
    sortedCreators = [...eligibleCreators].sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a));
  } else if (filter === 'popular') {
    sortedCreators = [...eligibleCreators].sort((a, b) => getSubscriberCount(b.subs) - getSubscriberCount(a.subs));
  } else if (filter === 'trending') {
    sortedCreators = [...eligibleCreators].sort((a, b) => {
      if (Boolean(a.hasPosts) !== Boolean(b.hasPosts)) {
        return a.hasPosts ? -1 : 1;
      }
      return (b.postsCount || 0) - (a.postsCount || 0);
    });
  }

  if (genderFilter === 'all') return sortedCreators;

  const acceptedGenders = genderFilter === 'male' ? ['man', 'male'] : ['woman', 'female'];
  return sortedCreators.filter((creator) =>
    acceptedGenders.includes(creator.gender?.trim().toLowerCase() || ''),
  );
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
