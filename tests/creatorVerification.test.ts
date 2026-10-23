// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  hasCompleteKycSubmission, 
  isCreatorVerified, 
  isKycVerified,
  buildAdminKycSubmissionNotification,
  canApproveKyc,
  resolveKycApprovalPayload,
  isCreatorProfileComplete
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

  it('enforces mandatory creator cards on login when profile photos or KYC are missing', () => {
    // 1. Creator who previously had an account but missing avatar
    const missingAvatar = isCreatorProfileComplete(
      { avatar: null, legal_name: 'Jane Doe', national_id_number: '12345678', dob: '1998-01-01', kyc_id_url: 'https://cdn/id.jpg', kyc_selfie_url: 'https://cdn/selfie.jpg' },
      { cover_image: 'https://cdn/cover.jpg' }
    );
    assert.equal(missingAvatar, false, 'Should flag creator missing avatar so update cards are shown on login');

    // 2. Creator missing cover image
    const missingCover = isCreatorProfileComplete(
      { avatar: 'https://cdn/avatar.jpg', legal_name: 'Jane Doe', national_id_number: '12345678', dob: '1998-01-01', kyc_id_url: 'https://cdn/id.jpg', kyc_selfie_url: 'https://cdn/selfie.jpg' },
      { cover_image: null }
    );
    assert.equal(missingCover, false, 'Should flag creator missing cover image so update cards are shown on login');

    // 3. Creator missing National ID document
    const missingIdDoc = isCreatorProfileComplete(
      { avatar: 'https://cdn/avatar.jpg', legal_name: 'Jane Doe', national_id_number: '12345678', dob: '1998-01-01', kyc_id_url: null, kyc_selfie_url: 'https://cdn/selfie.jpg' },
      { cover_image: 'https://cdn/cover.jpg' }
    );
    assert.equal(missingIdDoc, false, 'Should flag creator missing ID document so update cards are shown on login');

    // 4. Creator missing Selfie
    const missingSelfie = isCreatorProfileComplete(
      { avatar: 'https://cdn/avatar.jpg', legal_name: 'Jane Doe', national_id_number: '12345678', dob: '1998-01-01', kyc_id_url: 'https://cdn/id.jpg', kyc_selfie_url: null },
      { cover_image: 'https://cdn/cover.jpg' }
    );
    assert.equal(missingSelfie, false, 'Should flag creator missing selfie so update cards are shown on login');

    // 5. Creator who provided all photos and KYC documents
    const fullyComplete = isCreatorProfileComplete(
      { avatar: 'https://cdn/avatar.jpg', legal_name: 'Jane Doe', national_id_number: '12345678', dob: '1998-01-01', kyc_id_url: 'https://cdn/id.jpg', kyc_selfie_url: 'https://cdn/selfie.jpg' },
      { cover_image: 'https://cdn/cover.jpg' }
    );
    assert.equal(fullyComplete, true, 'Should pass creator who provided all 7 required verification details');

    // 6. Creator who logged back in with an auto-generated initials avatar (must be prompted to upload real photo)
    const initialsAvatar = isCreatorProfileComplete(
      { avatar: 'https://ui-avatars.com/api/?name=Jane+Doe', legal_name: 'Jane Doe', national_id_number: '12345678', dob: '1998-01-01', kyc_id_url: 'https://cdn/id.jpg', kyc_selfie_url: 'https://cdn/selfie.jpg' },
      { cover_image: 'https://cdn/cover.jpg' }
    );
    assert.equal(initialsAvatar, false, 'Should flag creator with initials avatar to upload a real custom photo');

    // 7. Creator who logged back in with fallback wave placeholder cover (must be prompted to upload real cover)
    const fallbackWaveCover = isCreatorProfileComplete(
      { avatar: 'https://cdn/avatar.jpg', legal_name: 'Jane Doe', national_id_number: '12345678', dob: '1998-01-01', kyc_id_url: 'https://cdn/id.jpg', kyc_selfie_url: 'https://cdn/selfie.jpg' },
      { cover_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80' }
    );
    assert.equal(fallbackWaveCover, false, 'Should flag creator with fallback wave cover to upload real cover photo');
  });

  it('notifies admin with creator identity, avatar and document verification link when KYC is submitted', () => {
    const notif = buildAdminKycSubmissionNotification({
      name: 'Kennedy Ngugi',
      nationalId: '39482011',
      avatar: 'https://cdn/kennedy-avatar.jpg'
    });

    assert.equal(notif.title, 'New Creator KYC Verification Submitted 🛡️');
    assert.match(notif.message, /Kennedy Ngugi/);
    assert.match(notif.message, /39482011/);
    assert.equal(notif.avatar, 'https://cdn/kennedy-avatar.jpg');
    assert.equal(notif.link, '/admin/users?view=kyc');
    assert.equal(notif.action_url, '/admin/users?view=kyc');
  });
});
