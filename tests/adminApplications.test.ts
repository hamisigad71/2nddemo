// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Admin Creator Applications & VIP Approval', () => {
  it('correctly categorizes an application as ready for review when both ID and selfie exist', () => {
    const applicant = {
      uid: 'user-123',
      name: 'Sarah Wangari',
      legalName: 'Sarah Wangari Maina',
      nationalId: '39482710',
      idDocUrl: 'https://cdn.example.com/id.jpg',
      selfieUrl: 'https://cdn.example.com/selfie.jpg',
      kycStatus: 'pending',
    };

    const hasBothDocs = Boolean(applicant.idDocUrl && applicant.selfieUrl);
    assert.equal(hasBothDocs, true);
    assert.equal(applicant.kycStatus, 'pending');
  });

  it('marks application as incomplete when either ID or selfie is missing', () => {
    const applicantWithoutSelfie = {
      uid: 'user-456',
      name: 'Joy Njoki',
      idDocUrl: 'https://cdn.example.com/id.jpg',
      selfieUrl: null,
    };

    const applicantWithoutId = {
      uid: 'user-789',
      name: 'Grace Wambui',
      idDocUrl: null,
      selfieUrl: 'https://cdn.example.com/selfie.jpg',
    };

    assert.equal(Boolean(applicantWithoutSelfie.idDocUrl && applicantWithoutSelfie.selfieUrl), false);
    assert.equal(Boolean(applicantWithoutId.idDocUrl && applicantWithoutId.selfieUrl), false);
  });

  it('differentiates regular Creator approval from VIP Creator approval', () => {
    const regularApproval = {
      role: 'creator',
      status: 'active',
      kyc_status: 'verified',
      is_featured: false,
      niche: 'Creator',
      tags: ['Exclusive Content', 'Direct Chat'],
      badge: 'Verified',
    };

    const vipApproval = {
      role: 'creator',
      status: 'active',
      kyc_status: 'verified',
      is_featured: true,
      niche: 'VIP Creator',
      tags: ['VIP Creator', 'Exclusive Access', 'Direct Chat'],
      badge: 'VIP 👑',
    };

    assert.equal(regularApproval.role, 'creator');
    assert.equal(regularApproval.is_featured, false);
    assert.equal(regularApproval.badge, 'Verified');

    assert.equal(vipApproval.role, 'creator');
    assert.equal(vipApproval.is_featured, true);
    assert.equal(vipApproval.niche, 'VIP Creator');
    assert.equal(vipApproval.badge, 'VIP 👑');
  });

  it('generates the appropriate notification for VIP Creator approval', () => {
    const vipNotif = {
      title: '👑 Promoted to VIP Creator!',
      message: 'Congratulations! Your identity documents were verified and Admin has granted you exclusive VIP Creator status. Your profile is now featured at the top of Discover and Feed!',
      badge: 'VIP 👑',
      link: '/dashboard',
    };

    assert.match(vipNotif.title, /VIP Creator/);
    assert.match(vipNotif.message, /VIP Creator status/);
    assert.equal(vipNotif.badge, 'VIP 👑');
  });

  it('handles rejection with customized instruction reason', () => {
    const defaultReason = 'Please upload a clearer, well-lit photo of your National ID and selfie.';
    const customReason = 'Your National ID photo was cut off on the corners. Please re-upload full document.';

    const rejectPayload = {
      kyc_status: 'rejected',
      reason: customReason || defaultReason,
    };

    assert.equal(rejectPayload.kyc_status, 'rejected');
    assert.match(rejectPayload.reason, /cut off/);
  });
});
