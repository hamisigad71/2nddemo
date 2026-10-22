export type CreatorDirectoryCandidate = {
  uid: string;
  name?: string | null;
  avatar?: string | null;
  role?: string;
  created_at?: string | null;
};

const GENERIC_CREATOR_NAMES = new Set(['creator', 'vip creator', 'new creator']);

export const resolveCreatorDisplayName = (
  ...names: Array<string | null | undefined>
): string => {
  const displayName = names.find((name) => {
    const normalizedName = name?.trim().toLowerCase();
    return normalizedName && !GENERIC_CREATOR_NAMES.has(normalizedName);
  });

  return displayName?.trim() || 'VIP Creator';
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
      name: profile.name || profile.display_name || 'VIP Creator',
      avatar: profile.avatar || profile.avatar_url || null,
      role: 'creator',
      ...(profile.created_at ? { created_at: profile.created_at } : {}),
    });
    creatorIds.add(uid);
  });

  return candidates;
};
