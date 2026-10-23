import { hasUploadedProfilePhoto, hasUploadedCoverPhoto } from './avatar';

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

export const isKycVerified = (status: unknown): boolean => status === 'verified';

export const isCreatorVerified = (
  _creatorId: string,
  _dbVerified?: boolean | null,
  kycStatus?: unknown
): boolean => isKycVerified(kycStatus);

export const hasCompleteKycSubmission = (submission: KycSubmission): boolean =>
  Boolean(
    submission.legalName.trim() &&
    submission.nationalId.trim() &&
    submission.dob &&
    submission.idDocument &&
    submission.selfie
  );

export const buildAdminKycSubmissionNotification = (creator: {
  username?: string | null;
  name?: string | null;
  nationalId?: string | null;
  avatar?: string | null;
}): AdminKycNotification => {
  const displayName = creator.name || creator.username || 'A creator';
  const idSnippet = creator.nationalId?.trim() ? ` (National ID: ${creator.nationalId.trim()})` : '';
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

export const canApproveKyc = (details: StoredKycDetails): { canApprove: boolean; reason?: string } => {
  if (!details.legal_name?.trim()) {
    return { canApprove: false, reason: 'Legal name is missing.' };
  }
  if (!details.national_id_number?.trim()) {
    return { canApprove: false, reason: 'National ID number is missing.' };
  }
  if (!details.dob) {
    return { canApprove: false, reason: 'Date of birth is missing.' };
  }
  if (!details.kyc_id_url?.trim()) {
    return { canApprove: false, reason: 'National ID document file is missing.' };
  }
  if (!details.kyc_selfie_url?.trim()) {
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
  const avatar = userRow?.avatar || creatorProfileRow?.avatar || creatorProfileRow?.avatar_url || localCache?.avatar || localCache?.avatar_url;
  const cover = creatorProfileRow?.cover_image || userRow?.cover_image || localCache?.cover_image;
  const legalName = userRow?.legal_name || creatorProfileRow?.legal_name || localCache?.legalName;
  const nationalId = userRow?.national_id_number || creatorProfileRow?.national_id_number || localCache?.nationalId;
  const dob = userRow?.dob || creatorProfileRow?.dob || localCache?.dob;
  const idDoc = userRow?.kyc_id_url || creatorProfileRow?.kyc_id_url || localCache?.kyc_id_url || localCache?.idDocument;
  const selfie = userRow?.kyc_selfie_url || creatorProfileRow?.kyc_selfie_url || localCache?.kyc_selfie_url || localCache?.selfie;

  const hasValidAvatar = hasUploadedProfilePhoto(avatar);
  const hasValidCover = hasUploadedCoverPhoto(cover);

  const hasValidKyc = Boolean(
    legalName && String(legalName).trim().length > 0 &&
    nationalId && String(nationalId).trim().length > 0 &&
    dob &&
    idDoc &&
    selfie
  );

  return Boolean(hasValidAvatar && hasValidCover && hasValidKyc);
};

