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

