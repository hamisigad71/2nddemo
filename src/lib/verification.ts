export interface KycSubmission {
  legalName: string;
  nationalId: string;
  dob: string;
  idDocument: File | null;
  selfie: File | null;
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
