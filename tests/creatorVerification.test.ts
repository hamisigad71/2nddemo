// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasCompleteKycSubmission, isCreatorVerified, isKycVerified } from '../src/lib/verification';

describe('creator verification eligibility', () => {
  it('grants the verified badge only after KYC approval', () => {
    assert.equal(isKycVerified('verified'), true);
    assert.equal(isKycVerified('pending'), false);
    assert.equal(isKycVerified('unverified'), false);
    assert.equal(isKycVerified(undefined), false);
    assert.equal(isCreatorVerified('creator-1', true, 'pending'), false);
    assert.equal(isCreatorVerified('creator-1', true), false);
    assert.equal(isCreatorVerified('creator-1', false, 'verified'), true);
  });

  it('requires identity details and both proof files before KYC submission', () => {
    const complete = {
      legalName: 'Amina Example',
      nationalId: '12345678',
      dob: '1995-04-12',
      idDocument: {} as File,
      selfie: {} as File,
    };
    assert.equal(hasCompleteKycSubmission(complete), true);
    assert.equal(hasCompleteKycSubmission({ ...complete, idDocument: null }), false);
    assert.equal(hasCompleteKycSubmission({ ...complete, legalName: ' ' }), false);
  });
});
