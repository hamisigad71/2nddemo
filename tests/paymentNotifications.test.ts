// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminPaymentNotification,
  buildCreatorSubscriptionMessage,
  buildTransactionPaymentNotification,
  getPaymentMethodLabel,
} from '../src/lib/paymentNotifications';

describe('admin payment notifications', () => {
  it('identifies a confirmed subscription payment and links to the transaction ledger', () => {
    assert.deepEqual(
      buildAdminPaymentNotification({
        fanName: 'A subscriber',
        creatorName: 'Sir Collo',
        amount: 200,
        referenceId: 'SUB-123',
        transactionRecorded: true,
      }),
      {
        title: 'New Subscription Payment Received',
        message: 'A subscriber paid KES 200 to subscribe to Sir Collo. Reference: SUB-123.',
        type: 'subscription',
        link: '/admin/transactions',
        action_label: 'View Transactions',
        action_url: '/admin/transactions',
        badge: 'Subscription Payment',
      },
    );
  });

  it('warns admins when payment succeeded but the ledger record failed', () => {
    const notification = buildAdminPaymentNotification({
      fanName: 'A subscriber',
      creatorName: 'Sir Collo',
      amount: 200,
      referenceId: 'SUB-123',
      transactionRecorded: false,
    });

    assert.match(notification.message, /ledger record failed/i);
    assert.match(notification.message, /SUB-123/);
  });

  it('does not claim the creator wallet was credited when the transaction was not recorded', () => {
    const message = buildCreatorSubscriptionMessage(
      'A subscriber',
      'VIP Tier',
      30,
      200,
      140,
      false,
    );

    assert.match(message, /wallet entry needs reconciliation/i);
    assert.doesNotMatch(message, /has been credited to your wallet/i);
  });

  it('labels subscription transactions using their payment reference', () => {
    assert.equal(getPaymentMethodLabel('subscription', 'SUB-123'), 'M-Pesa');
    assert.equal(getPaymentMethodLabel('subscription', 'TGD-CARD-123'), 'Card');
  });

  it('builds a rich payment notification with 30% platform fee and 70% creator split from a transaction record', () => {
    const notif = buildTransactionPaymentNotification(
      {
        id: 'SUB-100',
        type: 'subscription',
        gross_amount: 1000,
        platform_fee: 300,
        net_amount: 700,
        status: 'completed',
        created_at: '2026-10-24T12:00:00Z',
      },
      {
        payerName: 'John Doe',
        creatorName: 'Sarah Jenkins',
        payerAvatar: 'https://cdn.example.com/john.jpg',
        creatorAvatar: 'https://cdn.example.com/sarah.jpg',
        isRead: false,
      }
    );

    assert.equal(notif.id, 'tx-SUB-100');
    assert.equal(notif.type, 'subscription');
    assert.equal(notif.badge, 'Subscription Payment');
    assert.equal(notif.is_read, false);
    assert.equal(notif.action_url, '/admin/transactions');
    assert.ok(notif.payment_details);
    assert.equal(notif.payment_details.gross_amount, 1000);
    assert.equal(notif.payment_details.platform_fee, 300);
    assert.equal(notif.payment_details.net_amount, 700);
    assert.equal(notif.payment_details.payer_name, 'John Doe');
    assert.equal(notif.payment_details.creator_name, 'Sarah Jenkins');
    assert.equal(notif.payment_details.payment_method, 'M-Pesa');
    assert.match(notif.message, /John Doe/);
    assert.match(notif.message, /Sarah Jenkins/);
    assert.match(notif.message, /KES 1,000/);
    assert.match(notif.message, /Platform fee \(30%\): KES 300/);
    assert.match(notif.message, /Creator net \(70%\): KES 700/);
  });

  it('handles tip and PPV unlock transactions with correct defaults when payer/creator missing', () => {
    const tipNotif = buildTransactionPaymentNotification({
      id: 'tx-200',
      type: 'tip',
      amount: 500,
      created_at: '2026-10-24T12:00:00Z',
    });

    assert.equal(tipNotif.badge, 'Tip Payment');
    assert.ok(tipNotif.payment_details);
    assert.equal(tipNotif.payment_details.gross_amount, 500);
    assert.equal(tipNotif.payment_details.platform_fee, 150); // 30% of 500
    assert.equal(tipNotif.payment_details.net_amount, 350); // 70% of 500
    assert.equal(tipNotif.payment_details.payer_name, 'Fan Member');
    assert.equal(tipNotif.payment_details.creator_name, 'Creator');
  });
});
