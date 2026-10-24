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

export interface TransactionPaymentNotificationInput {
  id: string;
  type?: string;
  grossAmount?: number;
  gross_amount?: number;
  amount?: number;
  platformFee?: number;
  platform_fee?: number;
  netAmount?: number;
  net_amount?: number;
  payerName?: string;
  payerAvatar?: string;
  recipientName?: string;
  creatorName?: string;
  recipientAvatar?: string;
  creatorAvatar?: string;
  paymentMethod?: string;
  payment_method?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  isRead?: boolean;
}

export const buildTransactionPaymentNotification = (
  input: TransactionPaymentNotificationInput,
  overrides?: Partial<TransactionPaymentNotificationInput>
) => {
  const merged = { ...input, ...(overrides || {}) };
  const id = String(merged.id || '');
  const type = merged.type || 'payment';
  const gross = Number(merged.grossAmount ?? merged.gross_amount ?? merged.amount ?? 0);
  const fee = Number(merged.platformFee ?? merged.platform_fee ?? Math.round(gross * 0.3));
  const net = Number(merged.netAmount ?? merged.net_amount ?? Math.max(0, gross - fee));
  const payer = merged.payerName || 'Fan Member';
  const recipient = merged.recipientName || merged.creatorName || 'Creator';
  const payerAvatar = merged.payerAvatar;
  const recipientAvatar = merged.recipientAvatar || merged.creatorAvatar;
  const status = merged.status || 'completed';
  const createdAt = merged.createdAt || merged.created_at || new Date().toISOString();
  const paymentMethod = merged.paymentMethod || merged.payment_method || getPaymentMethodLabel(type, id);

  const typeLabel = type === 'subscription' 
    ? 'Subscription' 
    : type === 'tip' 
    ? 'Tip' 
    : type === 'ppv' 
    ? 'PPV Unlock' 
    : 'Payment';

  return {
    id: id.startsWith('tx-') ? id : `tx-${id}`,
    user_id: 'admin',
    title: `+KES ${gross.toLocaleString()} ${typeLabel} Received`,
    message: `${payer} paid KES ${gross.toLocaleString()} to ${recipient}. Platform fee (30%): KES ${fee.toLocaleString()} · Creator net (70%): KES ${net.toLocaleString()}.`,
    type: 'subscription' as const,
    link: '/admin/transactions',
    avatar: payerAvatar || recipientAvatar || '',
    badge: `${typeLabel} Payment`,
    action_label: 'View in Ledger',
    action_url: '/admin/transactions',
    is_read: Boolean(merged.isRead),
    created_at: createdAt,
    payment_details: {
      gross_amount: gross,
      platform_fee: fee,
      net_amount: net,
      currency: 'KES',
      payer_name: payer,
      payer_avatar: payerAvatar,
      creator_name: recipient,
      recipient_name: recipient,
      recipient_avatar: recipientAvatar,
      status: status,
      payment_method: paymentMethod,
      reference: id.replace(/^tx-/, ''),
      transaction_id: id.replace(/^tx-/, ''),
      type: typeLabel.toLowerCase(),
    }
  };
};
