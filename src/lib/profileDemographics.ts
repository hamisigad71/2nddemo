export const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'self_describe', label: 'Self-describe' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export type GenderValue = typeof GENDER_OPTIONS[number]['value'];

export interface ProfileDemographics {
  dob: string;
  gender: string;
  genderDescription?: string;
  accountType: string;
}

const parseDateOnly = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return date;
};

const toDateInputValue = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

export const calculateAge = (dob: string, today = new Date()): number | null => {
  const birthDate = parseDateOnly(dob);
  if (!birthDate) return null;

  const currentDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  if (birthDate > currentDate) return null;

  let age = currentDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayHasPassed =
    currentDate.getUTCMonth() > birthDate.getUTCMonth() ||
    (currentDate.getUTCMonth() === birthDate.getUTCMonth() &&
      currentDate.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayHasPassed) age -= 1;
  return age;
};

export const getMinimumBirthDateForAge = (age: number, today = new Date()): string => {
  const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  date.setUTCFullYear(date.getUTCFullYear() - age);
  return toDateInputValue(date);
};

export const getPublicGenderLabel = (
  gender?: string | null,
  genderDescription?: string | null,
): string | null => {
  if (gender === 'self_describe') return genderDescription?.trim() || null;
  return GENDER_OPTIONS.find((option) => option.value === gender)?.label || null;
};

export const validateProfileDemographics = (
  demographics: ProfileDemographics,
  today = new Date(),
): string | null => {
  if (!demographics.dob) return 'Enter your date of birth.';

  const birthDate = parseDateOnly(demographics.dob);
  if (!birthDate) return 'Enter a valid date of birth.';
  if (birthDate > new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))) {
    return 'Date of birth cannot be in the future.';
  }
  if (demographics.accountType === 'creator' && calculateAge(demographics.dob, today)! < 18) {
    return 'Creators must be at least 18 years old.';
  }

  if (!GENDER_OPTIONS.some((option) => option.value === demographics.gender)) {
    return 'Choose your gender.';
  }
  if (demographics.gender === 'self_describe' && !demographics.genderDescription?.trim()) {
    return 'Describe your gender.';
  }
  if (demographics.genderDescription && demographics.genderDescription.trim().length > 80) {
    return 'Gender description must be 80 characters or fewer.';
  }

  return null;
};
