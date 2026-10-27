import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  filterAndSortCreators,
  shouldIncludeCreatorInDiscover,
  isUnverifiedDiscoverUser,
  isSelectedVerifiedCreator,
} from '../src/lib/creatorDirectory';
import { validateChatMessage, stripDigits } from '../src/lib/chatFilter';
import {
  sendChatMessage,
  unlockChatMessagePPV,
  calculateFeeSplit,
  sendMassPPVMessage,
  getCreatorBroadcastAudience,
} from '../src/lib/db';
import {
  hasCompleteKycSubmission,
  canApproveKyc,
  resolveKycApprovalPayload,
  isCreatorVerified,
  hasPrivateKycEvidence,
  buildAdminKycSubmissionNotification,
} from '../src/lib/verification';
import { getCreatorPayoutAmountError } from '../src/lib/creatorPayoutRules';
import { buildTransactionPaymentNotification } from '../src/lib/paymentNotifications';

describe('Comprehensive End-to-End Simulation: Subscriber, Creator & Admin Journeys', () => {

  // ==========================================
  // JOURNEY 1: SUBSCRIBER (FAN) SIMULATION
  // ==========================================
  describe('Journey 1: Subscriber (Fan) Lifecycle', () => {
    const mockDirectory = [
      {
        id: 'creator-natalia',
        name: 'Natalia Ngina',
        gender: 'Woman',
        isVerified: true,
        subs: '150 subscribers',
        hasPosts: true,
        postsCount: 12,
        createdAt: '2026-01-15T00:00:00Z',
      },
      {
        id: 'creator-sir-collo',
        name: 'Sir Collo',
        gender: 'Man',
        isVerified: false,
        subs: '80 subscribers',
        hasPosts: true,
        postsCount: 5,
        createdAt: '2026-03-10T00:00:00Z',
      },
      {
        id: 'creator-fatma',
        name: 'fatma loki',
        gender: 'Woman',
        isVerified: false,
        subs: '45 subscribers',
        hasPosts: false,
        postsCount: 0,
        createdAt: '2026-02-01T00:00:00Z',
      },
      {
        id: 'creator-david',
        name: 'David Kimani',
        gender: 'Man',
        isVerified: false,
        subs: '10 subscribers',
        hasPosts: true,
        postsCount: 2,
        createdAt: '2026-04-01T00:00:00Z',
      },
    ];

    it('Step 1.1: Subscriber browses Discover catalog with gender and verification filters', () => {
      // All creators
      const all = filterAndSortCreators(mockDirectory, 'all', 'all');
      assert.equal(all.length, 4);

      // Gender filtering: Male creators
      const men = filterAndSortCreators(mockDirectory, 'all', 'male');
      assert.equal(men.length, 2);
      assert.ok(men.every((c) => c.gender === 'Man'));

      // Gender filtering: Female creators
      const women = filterAndSortCreators(mockDirectory, 'all', 'female');
      assert.equal(women.length, 2);
      assert.ok(women.every((c) => c.gender === 'Woman'));

      // Verified filter: Strictly verified accounts only
      const verifiedOnly = filterAndSortCreators(mockDirectory, 'verified', 'all');
      assert.equal(verifiedOnly.length, 1);
      assert.equal(verifiedOnly[0].name, 'Natalia Ngina');

      // Unverified discover creators (Fatma Loki, David Kimani) are accessible in 'all' but NOT 'verified'
      assert.equal(isUnverifiedDiscoverUser('fatma loki'), true);
      assert.equal(isSelectedVerifiedCreator('fatma loki'), false);
      assert.equal(isUnverifiedDiscoverUser('david kimani'), true);
      assert.equal(isSelectedVerifiedCreator('david kimani'), false);
    });

    it('Step 1.2: Paywall gatekeeping correctly evaluates profile access criteria', () => {
      // Explicitly featured or verified creators are discoverable
      assert.equal(shouldIncludeCreatorInDiscover(true, false, false, false), true);
      assert.equal(shouldIncludeCreatorInDiscover(false, false, false, true), true);

      // Creators without photos and not explicitly featured are locked from discovery
      assert.equal(shouldIncludeCreatorInDiscover(false, false, false, false), false);
    });

    it('Step 1.3: Subscriber chat interactions enforce phone number anti-circumvention', () => {
      // Legitimate messages pass
      const cleanCheck = validateChatMessage('Hey, loved your latest dance reel!');
      assert.equal(cleanCheck.isValid, true);
      assert.equal(cleanCheck.hadDigits, false);

      // Attempted M-Pesa phone number sharing is blocked and digits are stripped
      const phoneCheck = validateChatMessage('Send me your till on 0722123456');
      assert.equal(phoneCheck.isValid, false);
      assert.equal(phoneCheck.hadDigits, true);
      assert.equal(stripDigits('0722123456'), '');
    });

    it('Step 1.4: PPV media lock and unlock workflow with 70/30 fee accounting', async () => {
      const creatorId = 'creator-sim-1';
      const fanId = 'fan-sim-1';

      // 1. Creator drops a locked PPV message
      const lockedMsg = await sendChatMessage({
        sender_id: creatorId,
        receiver_id: fanId,
        creator_id: creatorId,
        sender_role: 'creator',
        content: 'Exclusive 4K Poolside Video',
        media_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        is_ppv: true,
        ppv_price: 500,
        ppv_unlocked: false,
      });

      assert.equal(lockedMsg.is_ppv, true);
      assert.equal(lockedMsg.ppv_price, 500);
      assert.equal(lockedMsg.ppv_unlocked, false);

      // 2. Fan pays and unlocks the message
      await unlockChatMessagePPV(lockedMsg.id, creatorId, fanId);

      // 3. Financial split: KES 500 payment
      const split = calculateFeeSplit(500);
      assert.equal(split.platformFee, 150); // 30% platform commission
      assert.equal(split.creatorNet, 350);   // 70% creator wallet credit
      assert.equal(split.platformFee + split.creatorNet, 500);
    });
  });

  // ==========================================
  // JOURNEY 2: CREATOR SIMULATION
  // ==========================================
  describe('Journey 2: Creator Onboarding, Content & Monetization Lifecycle', () => {
    it('Step 2.1: Creator KYC verification document submission requirements', () => {
      // Incomplete applicant missing ID
      const missingId = {
        legalName: 'Jane Doe',
        nationalId: '',
        dob: '1998-05-12',
        idDocument: {} as File,
        selfie: {} as File,
      };
      assert.equal(hasCompleteKycSubmission(missingId), false);

      // Complete applicant with valid details
      const completeApplicant = {
        legalName: 'Jane Wairimu',
        nationalId: '32489012',
        dob: '1996-08-20',
        idDocument: {} as File,
        selfie: {} as File,
      };
      assert.equal(hasCompleteKycSubmission(completeApplicant), true);

      // Private storage verification path enforcement
      assert.equal(
        hasPrivateKycEvidence('creator-99', 'creator-99/id.jpg', 'creator-99/selfie.jpg'),
        true
      );
      assert.equal(
        hasPrivateKycEvidence('creator-99', 'other-user/id.jpg', 'creator-99/selfie.jpg'),
        false
      );
    });

    it('Step 2.2: Creator dispatches OnlyFans-style Mass PPV Blast to segmented subscribers', async () => {
      const creatorId = 'creator-mass-sim';

      // Retrieve audience segments
      const audience = await getCreatorBroadcastAudience(creatorId);
      assert.ok(Array.isArray(audience.all));
      assert.ok(Array.isArray(audience.activeSubscribers));

      // Dispatch Mass PPV Blast
      const blastResult = await sendMassPPVMessage({
        creator_id: creatorId,
        content: 'Exclusive Friday Night Video Drop 💋',
        media_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9',
        media_type: 'video',
        ppv_price: 750,
        custom_recipient_ids: ['sub-fan-1', 'sub-fan-2', 'sub-fan-3'],
      });

      assert.equal(blastResult.success, true);
      assert.ok(blastResult.campaign_id.startsWith('camp-'));
      assert.equal(blastResult.totalRecipients, 3);
      assert.equal(blastResult.potentialRevenue, 3 * 750); // 2,250 KES
    });

    it('Step 2.3: Creator payout withdrawal adheres to KES 1,000 threshold and balance limits', () => {
      const availableBalance = 2500;

      // Below minimum threshold of KES 1,000
      const belowMinError = getCreatorPayoutAmountError(500, availableBalance);
      assert.match(belowMinError || '', /The minimum withdrawal amount is KES 1,000/);

      // Exceeds available wallet balance
      const exceedsBalanceError = getCreatorPayoutAmountError(3000, availableBalance);
      assert.match(exceedsBalanceError || '', /cannot exceed your available balance/);

      // Valid payout amount
      const validPayout = getCreatorPayoutAmountError(1500, availableBalance);
      assert.equal(validPayout, null);
    });
  });

  // ==========================================
  // JOURNEY 3: ADMIN SIMULATION
  // ==========================================
  describe('Journey 3: Platform Admin Management, KYC & Financial Auditing', () => {
    it('Step 3.1: Admin KYC review blocks incomplete applicants and approves verified creators', () => {
      // Incomplete applicant cannot be approved
      const incomplete = {
        legal_name: 'Incomplete Creator',
        national_id_number: '39482710',
        dob: '1998-05-12',
        kyc_id_url: 'https://cdn.example.com/id.jpg',
        kyc_selfie_url: null, // missing selfie
      };
      assert.equal(canApproveKyc(incomplete).canApprove, false);

      // Complete applicant ready for review
      const readyApplicant = {
        id: 'creator-ready',
        legal_name: 'Approved Creator',
        national_id_number: '39482710',
        dob: '1998-05-12',
        kyc_id_url: 'https://cdn.example.com/id.jpg',
        kyc_selfie_url: 'https://cdn.example.com/selfie.jpg',
      };
      assert.equal(canApproveKyc(readyApplicant).canApprove, true);

      // Admin approval payload sets status to verified
      const approval = resolveKycApprovalPayload('verified');
      assert.equal(approval.kyc_status, 'verified');
      assert.equal(approval.is_verified, true);
      assert.equal(isCreatorVerified(readyApplicant.id, true, 'verified'), true);
    });

    it('Step 3.2: Admin KYC submission notification formatting', () => {
      const notif = buildAdminKycSubmissionNotification({
        username: 'mina_doll',
        nationalId: '34120984',
      });

      assert.equal(notif.title, 'New Creator KYC Verification Submitted 🛡️');
      assert.match(notif.message, /mina_doll/);
      assert.match(notif.message, /34120984/);
      assert.equal(notif.action_url, '/admin/users?view=kyc');
    });

    it('Step 3.3: Financial ledger audit: M-Pesa subscription transaction split validation', () => {
      const transaction = {
        id: 'tx-sim-789',
        type: 'subscription',
        gross_amount: 1000,
        platform_fee: 300,
        net_amount: 700,
        reference: 'MPESA-NL8472910',
      };

      const notif = buildTransactionPaymentNotification(transaction, {
        payerName: 'Wairimu K.',
        creatorName: 'Sarah Jenkins',
      });
      assert.equal(notif.title, '+KES 1,000 Subscription Received');
      assert.match(notif.message, /Platform fee \(30%\): KES 300/);
      assert.match(notif.message, /Creator net \(70%\): KES 700/);
      assert.equal(notif.action_url, '/admin/transactions');
    });
  });

});
