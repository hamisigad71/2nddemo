import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAge,
  getMinimumBirthDateForAge,
  validateProfileDemographics,
} from '../src/lib/profileDemographics';

test('calculateAge uses whether the birthday has passed this year', () => {
  assert.equal(calculateAge('2000-10-24', new Date('2026-10-23T12:00:00Z')), 25);
  assert.equal(calculateAge('2000-10-24', new Date('2026-10-24T12:00:00Z')), 26);
});

test('calculateAge rejects invalid and future dates', () => {
  assert.equal(calculateAge('not-a-date', new Date('2026-10-24T12:00:00Z')), null);
  assert.equal(calculateAge('2027-01-01', new Date('2026-10-24T12:00:00Z')), null);
});

test('creator age boundary uses the exact eighteenth birthday', () => {
  assert.equal(getMinimumBirthDateForAge(18, new Date('2026-10-24T12:00:00Z')), '2008-10-24');
  assert.equal(
    validateProfileDemographics({
      dob: '2008-10-24',
      gender: 'woman',
      accountType: 'creator',
    }, new Date('2026-10-24T12:00:00Z')),
    null,
  );
  assert.equal(
    validateProfileDemographics({
      dob: '2008-10-25',
      gender: 'woman',
      accountType: 'creator',
    }, new Date('2026-10-24T12:00:00Z')),
    'Creators must be at least 18 years old.',
  );
});

test('subscriber age is collected but has no minimum-age restriction', () => {
  assert.equal(
    validateProfileDemographics({
      dob: '2010-10-24',
      gender: 'man',
      accountType: 'subscriber',
    }, new Date('2026-10-24T12:00:00Z')),
    null,
  );
});

test('demographic validation requires a valid date and gender', () => {
  assert.equal(validateProfileDemographics({ dob: '', gender: 'woman', accountType: 'subscriber' }), 'Enter your date of birth.');
  assert.equal(validateProfileDemographics({ dob: '2026-02-30', gender: 'woman', accountType: 'subscriber' }), 'Enter a valid date of birth.');
  assert.equal(validateProfileDemographics({ dob: '2027-01-01', gender: 'woman', accountType: 'subscriber' }, new Date('2026-10-24T12:00:00Z')), 'Date of birth cannot be in the future.');
  assert.equal(validateProfileDemographics({ dob: '2000-01-01', gender: '', accountType: 'subscriber' }), 'Choose your gender.');
});

test('self-described gender requires a non-empty description', () => {
  assert.equal(
    validateProfileDemographics({
      dob: '2000-01-01',
      gender: 'self_describe',
      genderDescription: '  ',
      accountType: 'subscriber',
    }),
    'Describe your gender.',
  );
  assert.equal(
    validateProfileDemographics({
      dob: '2000-01-01',
      gender: 'self_describe',
      genderDescription: 'Agender',
      accountType: 'subscriber',
    }),
    null,
  );
});
