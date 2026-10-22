export interface AdminPaymentNotificationInput {
  fanName: string;
  creatorName: string;
  amount: number;
  referenceId?: string;
  transactionRecorded: boolean;
}

export const buildAdminPaymentNotification = ({
  fanName,
  creatorName,
  amount,
  referenceId,
  transactionRecorded,
}: AdminPaymentNotificationInput) => {
  const reference = referenceId ? ` Reference: ${referenceId}.` : '';
  const message = transactionRecorded
    ? `${fanName} paid KES ${amount.toLocaleString()} to subscribe to ${creatorName}.${reference}`
    : `Payment from ${fanName} for ${creatorName} was confirmed, but its ledger record failed. Please reconcile this payment.${reference}`;

  return {
    title: 'New Subscription Payment Received',
    message,
    type: 'subscription' as const,
    link: '/admin/transactions',
    action_label: 'View Transactions',
    action_url: '/admin/transactions',
    badge: transactionRecorded ? 'Subscription Payment' : 'Reconciliation Required',
  };
};

export const buildCreatorSubscriptionMessage = (
  fanName: string,
  tierName: string,
  durationDays: number,
  amount: number,
  netAmount: number,
  transactionRecorded: boolean,
) => {
  if (!transactionRecorded) {
    return `${fanName} subscribed to your ${tierName} (${durationDays} days) for KES ${amount.toLocaleString()}. The payment was confirmed, but its wallet entry needs reconciliation; the admin has been alerted.`;
  }

  return `${fanName} subscribed to your ${tierName} (${durationDays} days) for KES ${amount.toLocaleString()}! KES ${netAmount.toLocaleString()} (after 30% platform fee) has been credited to your wallet.`;
};

export const getPaymentMethodLabel = (type: string, referenceId?: string | null) => {
  if (referenceId?.startsWith('pstk_') || referenceId?.startsWith('TGD-CARD-')) {
    return 'Card';
  }
  if (referenceId?.startsWith('SUB-') || referenceId?.startsWith('TIP-') || referenceId?.startsWith('PPV-')) {
    return 'M-Pesa';
  }
  return type === 'subscription' ? 'Card' : 'M-Pesa';
};
