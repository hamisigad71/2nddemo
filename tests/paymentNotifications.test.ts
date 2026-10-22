// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminPaymentNotification,
  buildCreatorSubscriptionMessage,
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
});
