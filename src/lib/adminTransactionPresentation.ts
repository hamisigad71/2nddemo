const transactionStatusStyles: Record<string, string> = {
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20',
  failed: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/20',
  pending: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20',
};

const fallbackStatusStyles =
  'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-500/10 dark:border-slate-500/20';

export const getTransactionStatusStyles = (status?: string | null): string =>
  transactionStatusStyles[status?.toLowerCase() || ''] || fallbackStatusStyles;
