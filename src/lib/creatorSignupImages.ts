export const validateSignupImages = (
  accountType: string,
  avatarFile: File | null,
  coverFile: File | null
): string | null => {
  if (!avatarFile) {
    return 'Please upload your profile photo to complete registration.';
  }

  if (accountType === 'creator' && !coverFile) {
    return 'Please upload a cover photo to complete creator registration.';
  }

  return null;
};
