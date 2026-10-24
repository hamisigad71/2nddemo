export const MINIMUM_CREATOR_PAYOUT_KES = 1000;

export const getCreatorPayoutAmountError = (
  amount: number,
  availableBalance?: number
): string | null => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Please enter a valid withdrawal amount.';
  }

  if (amount < MINIMUM_CREATOR_PAYOUT_KES) {
    return 'The minimum withdrawal amount is KES 1,000.';
  }

  if (availableBalance !== undefined && amount > availableBalance) {
    return `Amount cannot exceed your available balance of KES ${availableBalance.toLocaleString()}.`;
  }

  return null;
};
