export const formatNumber = (value: number, maximumFractionDigits = 0): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(value);

export const formatCompact = (value: number, maximumFractionDigits = 1): string =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits,
  }).format(value);

export const formatPercent = (value: number, maximumFractionDigits = 2): string =>
  `${formatNumber(value, maximumFractionDigits)}%`;

export const formatReward = (value: number): string => {
  if (value === 0) return '0';
  if (value < 0.01) return '<0.01';
  return formatNumber(value, value < 10 ? 2 : 1);
};

export const formatUpdatedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Update time unavailable';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
};
