// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  hasCompleteKycSubmission, 
  isCreatorVerified, 
  isKycVerified,
  buildAdminKycSubmissionNotification,
  canApproveKyc,
  resolveKycApprovalPayload
} from '../src/lib/verification';

describe('creator verification eligibility and admin approval flow', () => {
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

  it('dispatches an admin review notification when a creator submits verification details', () => {
    const notif = buildAdminKycSubmissionNotification({
      username: 'veronicah_ke',
      nationalId: '38291044',
    });

    assert.equal(notif.title, 'New Creator KYC Verification Submitted 🛡️');
    assert.match(notif.message, /veronicah_ke/);
    assert.match(notif.message, /38291044/);
    assert.equal(notif.link, '/admin/users?view=kyc');
    assert.equal(notif.action_label, 'Review KYC');
    assert.equal(notif.action_url, '/admin/users?view=kyc');
    assert.equal(notif.badge, 'KYC Review');
  });

  it('prevents admin approval if required documents or identity details are missing', () => {
    const incompleteApplicant = {
      legal_name: 'Veronicah Njeri',
      national_id_number: '38291044',
      dob: '1998-07-21',
      kyc_id_url: 'https://cdn.example.com/id.jpg',
      kyc_selfie_url: null, // missing selfie
    };

    const check = canApproveKyc(incompleteApplicant);
    assert.equal(check.canApprove, false);
    assert.match(check.reason || '', /selfie/i);

    const completeApplicant = {
      legal_name: 'Veronicah Njeri',
      national_id_number: '38291044',
      dob: '1998-07-21',
      kyc_id_url: 'https://cdn.example.com/id.jpg',
      kyc_selfie_url: 'https://cdn.example.com/selfie.jpg',
    };

    const validCheck = canApproveKyc(completeApplicant);
    assert.equal(validCheck.canApprove, true);
  });

  it('correctly transitions state upon admin approval or rejection', () => {
    // 1. Initial submitted state
    const submittedState = {
      kyc_status: 'pending',
      is_verified: false,
    };
    assert.equal(isCreatorVerified('creator-1', submittedState.is_verified, submittedState.kyc_status), false);

    // 2. Admin approves application
    const approvedPayload = resolveKycApprovalPayload('verified');
    assert.deepEqual(approvedPayload, {
      kyc_status: 'verified',
      is_verified: true,
    });
    assert.equal(isCreatorVerified('creator-1', approvedPayload.is_verified, approvedPayload.kyc_status), true);

    // 3. Admin rejects application
    const rejectedPayload = resolveKycApprovalPayload('rejected');
    assert.deepEqual(rejectedPayload, {
      kyc_status: 'rejected',
      is_verified: false,
    });
    assert.equal(isCreatorVerified('creator-1', rejectedPayload.is_verified, rejectedPayload.kyc_status), false);
  });
});
