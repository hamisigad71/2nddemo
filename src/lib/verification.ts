import { hasUploadedProfilePhoto, hasUploadedCoverPhoto } from './avatar';

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export interface KycSubmission {
  legalName: string;
  nationalId: string;
  dob: string;
  idDocument: File | null;
  selfie: File | null;
}

export interface StoredKycDetails {
  legal_name?: string | null;
  national_id_number?: string | null;
  dob?: string | null;
  kyc_id_url?: string | null;
  kyc_selfie_url?: string | null;
}

export interface AdminKycNotification {
  title: string;
  message: string;
  type: 'system';
  badge: string;
  link: string;
  action_label: string;
  action_url: string;
  avatar?: string;
}

export const isKycVerified = (status: unknown): boolean =>
  normalizeText(status).toLowerCase() === 'verified';

export const isCreatorVerified = (
  _creatorId: string,
  _dbVerified?: boolean | null,
  kycStatus?: unknown
): boolean => isKycVerified(kycStatus);

export const hasPrivateKycEvidence = (
  userId: string,
  idDocumentPath?: string | null,
  selfiePath?: string | null,
): boolean => {
  if (!userId || typeof userId !== 'string') return false;
  const requiredPrefix = `${userId.trim()}/`;
  return [idDocumentPath, selfiePath].every((path) => {
    if (typeof path !== 'string') return false;
    const cleanPath = path.trim();
    return cleanPath.startsWith(requiredPrefix) &&
      cleanPath.length > requiredPrefix.length &&
      !/^(blob:|data:|https?:\/\/)/i.test(cleanPath);
  });
};

export const hasCompleteKycSubmission = (
  submission: Partial<KycSubmission> | null | undefined,
): boolean => {
  if (!submission || typeof submission !== 'object') return false;

  return Boolean(
    normalizeText(submission.legalName) &&
    normalizeText(submission.nationalId) &&
    normalizeText(submission.dob) &&
    submission.idDocument &&
    submission.selfie
  );
};

export const buildAdminKycSubmissionNotification = (creator: {
  username?: string | null;
  name?: string | null;
  nationalId?: string | null;
  avatar?: string | null;
} = {}): AdminKycNotification => {
  const displayName = normalizeText(creator.name) || normalizeText(creator.username) || 'A creator';
  const idSnippet = normalizeText(creator.nationalId)
    ? ` (National ID: ${normalizeText(creator.nationalId)})`
    : '';
  return {
    title: 'New Creator KYC Verification Submitted 🛡️',
    message: `${displayName} has submitted identity details${idSnippet} and verification photos for admin approval.`,
    type: 'system',
    badge: 'KYC Review',
    link: '/admin/users?view=kyc',
    action_label: 'Review KYC',
    action_url: '/admin/users?view=kyc',
    avatar: creator.avatar || undefined,
  };
};

export const canApproveKyc = (
  details: Partial<StoredKycDetails> | null | undefined,
): { canApprove: boolean; reason?: string } => {
  if (!details || typeof details !== 'object') {
    return { canApprove: false, reason: 'KYC details are missing.' };
  }

  if (!normalizeText(details.legal_name)) {
    return { canApprove: false, reason: 'Legal name is missing.' };
  }
  if (!normalizeText(details.national_id_number)) {
    return { canApprove: false, reason: 'National ID number is missing.' };
  }
  if (!normalizeText(details.dob)) {
    return { canApprove: false, reason: 'Date of birth is missing.' };
  }
  if (!normalizeText(details.kyc_id_url)) {
    return { canApprove: false, reason: 'National ID document file is missing.' };
  }
  if (!normalizeText(details.kyc_selfie_url)) {
    return { canApprove: false, reason: 'Verification selfie file is missing.' };
  }
  return { canApprove: true };
};

export const resolveKycApprovalPayload = (action: 'verified' | 'rejected') => {
  return {
    kyc_status: action,
    is_verified: action === 'verified',
  };
};

export const isCreatorProfileComplete = (
  userRow: any,
  creatorProfileRow?: any,
  localCache?: any
): boolean => {
  const avatar = userRow?.avatar || userRow?.avatar_url || creatorProfileRow?.avatar || creatorProfileRow?.avatar_url || localCache?.avatar || localCache?.avatar_url;
  const cover = creatorProfileRow?.cover_image || creatorProfileRow?.cover || userRow?.cover_image || userRow?.cover || localCache?.cover_image || localCache?.cover;
  const legalName = userRow?.legal_name || creatorProfileRow?.legal_name || localCache?.legalName || localCache?.legal_name;
  const nationalId = userRow?.national_id_number || creatorProfileRow?.national_id_number || localCache?.nationalId || localCache?.national_id_number;
  const dob = userRow?.dob || creatorProfileRow?.dob || localCache?.dob;
  const idDoc = userRow?.kyc_id_url || creatorProfileRow?.kyc_id_url || localCache?.kyc_id_url || localCache?.idDocument || localCache?.id_document;
  const selfie = userRow?.kyc_selfie_url || creatorProfileRow?.kyc_selfie_url || localCache?.kyc_selfie_url || localCache?.selfie || localCache?.selfie_url;

  const hasValidAvatar = hasUploadedProfilePhoto(avatar);
  const hasValidCover = hasUploadedCoverPhoto(cover);

  const hasValidKyc = Boolean(
    legalName && String(legalName).trim().length > 0 &&
    nationalId && String(nationalId).trim().length > 0 &&
    dob && String(dob).trim().length > 0 &&
    idDoc && String(idDoc).trim().length > 0 &&
    selfie && String(selfie).trim().length > 0
  );

  return Boolean(hasValidAvatar && hasValidCover && hasValidKyc);
};
