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

  it('determines verification badge status upon admin approval based on KYC completion', () => {
    // Helper replicating admin approval rule: creator only receives verified badge upon approval if KYC was filled
    const resolveApprovalVerification = (hasFilledKyc: boolean) => {
      return hasFilledKyc ? 'verified' : 'unverified';
    };

    assert.equal(resolveApprovalVerification(true), 'verified');
    assert.equal(isCreatorVerified('creator-approved-with-kyc', true, resolveApprovalVerification(true)), true);

    assert.equal(resolveApprovalVerification(false), 'unverified');
    assert.equal(isCreatorVerified('creator-approved-without-kyc', true, resolveApprovalVerification(false)), false);
  });
});
